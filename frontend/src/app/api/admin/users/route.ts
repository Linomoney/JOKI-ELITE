// C:\Users\tengk\OneDrive\Dokumen\GitHub\JOKI-ELITE\frontend\src\app\api\admin\users\route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Check if user is admin (reuse same function as orders)
async function isAdmin(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return false;
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return false;
    }

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

// PUT: Update user role
export async function PUT(request: Request) {
  try {
    if (!await isAdmin(request)) {
      return NextResponse.json({ 
        error: "Unauthorized: Admin access required" 
      }, { status: 401 });
    }

    const body = await request.json();

    if (!body.userId || !body.role) {
      return NextResponse.json({ 
        error: "Missing required fields: userId, role" 
      }, { status: 400 });
    }

    const { error } = await supabase
      .from('user_profiles')
      .update({ 
        role: body.role,
        updated_at: new Date().toISOString()
      })
      .eq('id', body.userId);

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      message: "User role updated successfully" 
    });
  } catch (error: any) {
    console.error("PUT users error:", error);
    return NextResponse.json({ 
      error: error.message || "Failed to update user role" 
    }, { status: 500 });
  }
}

// DELETE: Delete user
export async function DELETE(request: Request) {
  try {
    if (!await isAdmin(request)) {
      return NextResponse.json({ 
        error: "Unauthorized: Admin access required" 
      }, { status: 401 });
    }

    const body = await request.json();

    if (!body.userId) {
      return NextResponse.json({ 
        error: "User ID is required" 
      }, { status: 400 });
    }

    // Check if trying to delete self
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    const { data: { user } } = await supabase.auth.getUser(token || '');
    
    if (user?.id === body.userId) {
      return NextResponse.json({ 
        error: "Cannot delete your own account" 
      }, { status: 400 });
    }

    // Delete user's orders first
    await supabase.from('orders').delete().eq('user_id', body.userId);

    // Delete user profile
    const { error } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', body.userId);

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      message: "User deleted successfully" 
    });
  } catch (error: any) {
    console.error("DELETE users error:", error);
    return NextResponse.json({ 
      error: error.message || "Failed to delete user" 
    }, { status: 500 });
  }
}