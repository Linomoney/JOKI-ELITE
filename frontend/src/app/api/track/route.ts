import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase'; // Pastikan path ke file supabase.ts bener

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Kirim data ke Supabase
    const { error } = await supabase
      .from('orders')
      .upsert({
        order_id: body.order_id,
        project_name: body.project_name,
        progress: body.progress,
        status: body.status,
        // Tambahkan kolom lain jika perlu
      }, { onConflict: 'order_id' });

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}