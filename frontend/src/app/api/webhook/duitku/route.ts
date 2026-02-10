import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { dbHelpers, supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-duitku-signature');
    
    // Verifikasi signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.DUITKU_API_KEY!)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.error('❌ Invalid DuitKu signature');
      return NextResponse.json({ status: 'error' }, { status: 401 });
    }

    const data = JSON.parse(body);
    const { merchantOrderId, resultCode, amount, reference } = data;

    console.log('🎯 DuitKu Webhook Received:', {
      orderId: merchantOrderId,
      resultCode,
      amount,
      reference,
      timestamp: new Date().toISOString(),
    });

    // Cari topup berdasarkan order code
    const { data: topup, error: topupError } = await supabase
      .from('topups')
      .select('*')
      .eq('topup_code', merchantOrderId)
      .single();

    if (topupError) {
      console.error('❌ Topup not found:', merchantOrderId);
      return NextResponse.json({ status: 'error' }, { status: 404 });
    }

    // Handle berdasarkan status pembayaran
    if (resultCode === '00') {
      // PAYMENT SUCCESS - Auto approve
      console.log('✅ Payment successful, auto-approving topup...');
      
      try {
        // 1. Update topup status menjadi approved
        await dbHelpers.updateTopupStatus(merchantOrderId, 'approved', amount);
        
        // 2. Update user balance
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('balance')
          .eq('id', topup.user_id)
          .single();

        const newBalance = (profile?.balance || 0) + amount;
        
        await supabase
          .from('user_profiles')
          .update({ 
            balance: newBalance,
            updated_at: new Date().toISOString()
          })
          .eq('id', topup.user_id);

        console.log('✅ Topup approved and balance updated:', {
          userId: topup.user_id,
          amount: amount,
          newBalance: newBalance,
        });

        // 3. Notify user (optional)
        // Anda bisa tambahkan notifikasi email atau push notification di sini

      } catch (approveError: any) {
        console.error('❌ Auto-approve failed:', approveError);
        return NextResponse.json(
          { status: 'error', message: 'Approval failed' },
          { status: 500 }
        );
      }

    } else if (resultCode === '01') {
      // PAYMENT PENDING
      console.log('⏳ Payment pending:', merchantOrderId);
      await dbHelpers.updateTopupStatus(merchantOrderId, 'pending');
      
    } else {
      // PAYMENT FAILED
      console.log('❌ Payment failed:', merchantOrderId);
      await dbHelpers.updateTopupStatus(merchantOrderId, 'failed');
    }

    return NextResponse.json({ status: 'received' });
    
  } catch (error: any) {
    console.error('🔥 Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}