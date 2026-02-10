import { NextRequest, NextResponse } from 'next/server';
import { dbHelpers } from '@/lib/supabase';

// Protect with secret key
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Cleanup expired topups
    await dbHelpers.cleanupExpiredTopups();
    
    // Log performance metrics
    console.log('🔄 Cron job executed at:', new Date().toISOString());
    
    return NextResponse.json({ 
      success: true, 
      message: 'Cleanup completed',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Cron job error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}