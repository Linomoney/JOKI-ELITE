import { NextRequest, NextResponse } from 'next/server';
import DuitkuClient from 'duitku';
import { dbHelpers } from '@/lib/supabase';

const duitku = new DuitkuClient({
  merchantCode: process.env.DUITKU_MERCHANT_CODE!,
  apiKey: process.env.DUITKU_API_KEY!,
  sandbox: process.env.DUITKU_MODE === 'sandbox',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, amount, email, phone, method } = body;

    // Validasi minimal topup
    if (amount < 10000) {
      return NextResponse.json(
        { error: 'Minimum topup Rp 10.000' },
        { status: 400 }
      );
    }

    // Generate unique order ID
    const orderId = `BNDT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Payment parameters
    const paymentData = {
      paymentAmount: amount,
      merchantOrderId: orderId,
      productDetails: `Topup Balance - Rp ${amount.toLocaleString()}`,
      email: email,
      phoneNumber: phone || '081234567890',
      customerVaName: 'Bandit Joki Elite',
      callbackUrl: process.env.DUITKU_CALLBACK_URL!,
      returnUrl: process.env.DUITKU_RETURN_URL!,
      expiryPeriod: 60, // 60 menit
    };

    // Get payment methods
    const paymentMethods = await duitku.getPaymentMethods(paymentData);

    // Simpan transaksi pending ke database
    await dbHelpers.createTopup({
      user_id: userId,
      amount: amount,
      topup_code: orderId,
      payment_method: method || 'duitku',
      status: 'pending',
      notes: `DuitKu Payment - ${method || 'Unknown Method'}`,
    });

    // Create payment
    const redirectUrl = await duitku.createTransaction({
      ...paymentData,
      paymentMethod: method,
    });

    return NextResponse.json({
      success: true,
      orderId,
      redirectUrl,
      paymentMethods: paymentMethods,
    });

  } catch (error: any) {
    console.error('Payment error:', error);
    return NextResponse.json(
      { error: error.message || 'Payment failed' },
      { status: 500 }
    );
  }
}