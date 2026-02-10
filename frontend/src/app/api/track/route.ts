import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orderCode = searchParams.get('code');
  
  try {
    if (orderCode) {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('order_code', orderCode)
        .single();
      
      if (error) throw error;
      return NextResponse.json(data || { error: 'Order not found' });
    } else {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return NextResponse.json(data || []);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    if (!body.order_id || !body.project_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const { error } = await supabase
      .from('orders')
      .upsert({
        id: body.id,
        project_name: body.project_name,
        progress: body.progress || 0,
        status: body.status || 'Active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    
    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}