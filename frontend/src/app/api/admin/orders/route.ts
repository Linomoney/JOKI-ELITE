// C:\Users\tengk\OneDrive\Dokumen\GitHub\JOKI-ELITE\frontend\src\app\api\admin\orders\route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { rateLimit } from '@/lib/rate-limit';

// Check if user is admin
async function isAdmin(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return false;
    }

    const token = authHeader.split(' ')[1];
    
    // Verify the token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return false;
    }

    // Check user role
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    return profile?.role === "admin";
  } catch (error) {
    console.error("Admin check error:", error);
    return false;
  }
}

export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimitResult = rateLimit(request, 'get-orders');
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: rateLimitResult.message },
      { status: 429 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    let query = supabase
      .from('orders')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// POST: Create/Update order (admin only)
export async function POST(request: Request) {
  try {
    if (!await isAdmin(request)) {
      return NextResponse.json({ 
        error: "Unauthorized: Admin access required" 
      }, { status: 401 });
    }

    const body = await request.json();

    if (!body.order_id || !body.project_name || !body.user_id) {
      return NextResponse.json({ 
        error: "Missing required fields: order_id, project_name, user_id" 
      }, { status: 400 });
    }

    // Get user info for client details
    const { data: userData } = await supabase
      .from('user_profiles')
      .select('full_name, email, phone')
      .eq('id', body.user_id)
      .single();

    const orderData = {
      order_id: body.order_id,
      project_name: body.project_name,
      progress: body.progress ?? 0,
      status: body.status ?? "Active",
      user_id: body.user_id,
      client_name: userData?.full_name || '',
      client_contact: userData?.email || userData?.phone || '',
      created_at: body.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from("orders")
      .upsert(orderData, { onConflict: "order_id" });

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      message: "Order saved successfully" 
    });
  } catch (error: any) {
    console.error("POST orders error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || "Failed to save order" 
    }, { status: 500 });
  }
}