import { NextRequest, NextResponse } from 'next/server';
import { dbHelpers, supabaseAdmin } from '@/lib/supabase';
import crypto from 'crypto';

// Rate limiting simple
const rateLimiter = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = 10; // 10 requests
  const windowMs = 60000; // 1 minute

  const record = rateLimiter.get(ip);
  
  if (!record) {
    rateLimiter.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + windowMs;
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
}

export async function POST(request: NextRequest) {
  // Rate limiting
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Terlalu banyak permintaan. Silakan coba lagi nanti.' },
      { status: 429 }
    );
  }

  console.log('🟢 DuitKu API Called - IP:', ip);
  
  try {
    const body = await request.json();

    const { 
      userId, 
      amount, 
      email, 
      phone, 
      paymentMethod = "SP",
      paymentMethodName = "QRIS"
    } = body;

    console.log('📦 Request body:', body);

    // Validasi input
    if (!userId || !amount || !email) {
      console.error('❌ Missing required fields');
      return NextResponse.json(
        { 
          error: 'Data tidak lengkap',
          required: ['userId', 'amount', 'email']
        },
        { status: 400 }
      );
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < 10000) {
      console.error('❌ Invalid amount:', amount);
      return NextResponse.json(
        { error: 'Minimum topup Rp 10.000' },
        { status: 400 }
      );
    }

    if (amountNum > 10000000) {
      console.error('❌ Amount too high:', amountNum);
      return NextResponse.json(
        { error: 'Maximum topup Rp 10.000.000' },
        { status: 400 }
      );
    }

    // Validasi environment variables
    const merchantCode = process.env.DUITKU_MERCHANT_CODE;
    const apiKey = process.env.DUITKU_API_KEY;
    
    if (!merchantCode || !apiKey) {
      console.error('❌ Missing DuitKu credentials');
      return NextResponse.json(
        { 
          error: 'Konfigurasi payment gateway belum lengkap',
          required: ['DUITKU_MERCHANT_CODE', 'DUITKU_API_KEY']
        },
        { status: 500 }
      );
    }

    console.log('🔑 DuitKu Config:', {
      hasMerchantCode: !!merchantCode,
      hasApiKey: !!apiKey,
      mode: process.env.DUITKU_MODE || 'sandbox'
    });

    // Cek apakah user ada
    const { data: user, error: userError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email, full_name, phone')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      console.error('❌ User not found:', userId);
      return NextResponse.json(
        { error: 'User tidak ditemukan' },
        { status: 404 }
      );
    }

    // Generate unique order ID
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 10).toUpperCase();
    const orderId = `BNDT-${timestamp}-${randomStr}`;
    
    // Calculate expiry time (1 hour from now)
    const expiresAt = new Date(timestamp + 3600000).toISOString();

    console.log('🆔 Generated Order ID:', orderId);

    // Buat topup record di database
    try {
      const topupData = {
        user_id: userId,
        amount: amountNum,
        topup_code: orderId,
        payment_method: `duitku_${paymentMethodName.toLowerCase().replace(/\s+/g, '_')}`,
        status: 'pending',
        expires_at: expiresAt,
        notes: `DuitKu Payment - ${paymentMethodName} (${paymentMethod})`,
      };

      console.log('💾 Creating topup record:', topupData);
      
      const topup = await dbHelpers.createTopup(topupData);
      console.log('✅ Topup created:', topup);

    } catch (dbError: any) {
      console.error('❌ Database error:', dbError);
      return NextResponse.json(
        { error: 'Gagal menyimpan transaksi: ' + dbError.message },
        { status: 500 }
      );
    }

    // Generate signature untuk DuitKu
    const signature = crypto
      .createHash('md5')
      .update(`${merchantCode}${orderId}${amountNum}${apiKey}`)
      .digest('hex');

    console.log('🔐 Generated Signature:', signature.substring(0, 8) + '...');

    // DuitKu API endpoint
    const isSandbox = process.env.DUITKU_MODE === 'sandbox';
    const apiUrl = isSandbox 
      ? 'https://sandbox.duitku.com/webapi/api/merchant/v2/inquiry' 
      : 'https://passport.duitku.com/webapi/api/merchant/v2/inquiry';

    // Prepare callback and return URLs
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const callbackUrl = `${baseUrl}/api/webhook/duitku`;
    const returnUrl = `${baseUrl}/dashboard/topup/success?orderId=${orderId}`;

    console.log('🌐 URLs:', {
      apiUrl,
      baseUrl,
      callbackUrl,
      returnUrl
    });

    // Request payload untuk DuitKu
    const duitkuPayload = {
      merchantCode,
      paymentAmount: amountNum,
      merchantOrderId: orderId,
      productDetails: `Topup Balance Bandit Joki Elite - Rp ${amountNum.toLocaleString('id-ID')}`,
      email: email,
      phoneNumber: phone || user.phone || '081234567890',
      customerVaName: user.full_name || 'Customer',
      paymentMethod: paymentMethod,
      signature: signature,
      callbackUrl: callbackUrl,
      returnUrl: returnUrl,
      expiryPeriod: 60, // 60 menit
    };

    console.log('📤 Sending to DuitKu:', {
      url: apiUrl,
      payload: { ...duitkuPayload, signature: '***' },
    });

    // Kirim request ke DuitKu dengan timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30 seconds timeout

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(duitkuPayload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ HTTP Error:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const duitkuResponse = await response.json();
      console.log('📥 DuitKu Response:', duitkuResponse);

      if (duitkuResponse.statusCode !== '00') {
        console.error('❌ DuitKu API error:', duitkuResponse);
        
        // Update status topup menjadi failed
        await dbHelpers.updateTopupStatus(orderId, 'failed');
        
        return NextResponse.json(
          { 
            error: duitkuResponse.statusMessage || 'Payment inquiry failed',
            code: duitkuResponse.statusCode,
            details: duitkuResponse
          },
          { status: 400 }
        );
      }

      // Return payment URL ke frontend
      const responseData = {
        success: true,
        orderId: orderId,
        redirectUrl: duitkuResponse.paymentUrl,
        vaNumber: duitkuResponse.vaNumber,
        qrString: duitkuResponse.qrString,
        expiryPeriod: duitkuResponse.expiryPeriod,
        amount: amountNum,
        method: paymentMethodName,
        paymentMethod: paymentMethod,
        reference: duitkuResponse.reference,
        expiresAt: expiresAt,
        timestamp: new Date().toISOString(),
        message: 'Payment initiated successfully'
      };

      console.log('✅ Returning success:', responseData);
      return NextResponse.json(responseData);

    } catch (fetchError: any) {
      clearTimeout(timeout);
      console.error('❌ Fetch error:', fetchError);
      
      // Update status topup menjadi failed
      await dbHelpers.updateTopupStatus(orderId, 'failed');
      
      throw fetchError;
    }

  } catch (error: any) {
    console.error('🔥 DuitKu API processing error:', error);
    
    return NextResponse.json(
      { 
        error: 'Gagal memproses pembayaran',
        message: error.message || 'Internal server error',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  console.log('🔧 GET /api/payment/duitku - Testing endpoint');
  
  return NextResponse.json({
    status: 'ok',
    message: 'DuitKu payment API is running',
    timestamp: new Date().toISOString(),
    environment: {
      mode: process.env.DUITKU_MODE || 'sandbox',
      hasMerchantCode: !!process.env.DUITKU_MERCHANT_CODE,
      hasApiKey: !!process.env.DUITKU_API_KEY,
      appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      nodeEnv: process.env.NODE_ENV,
    },
    note: 'POST endpoint ready for payment processing'
  });
}