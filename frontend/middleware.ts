// C:\Users\tengk\OneDrive\Dokumen\GitHub\JOKI-ELITE\frontend\middleware.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  console.log("🔐 Middleware triggered for:", req.nextUrl.pathname);

  let res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          res.cookies.set(name, value, options);
        });
      },
    },
  });

  try {
    // Get session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("Middleware session error:", sessionError);
    }

    console.log("👤 Session exists:", !!session);

    // ========== ADMIN ROUTES PROTECTION ==========
    if (req.nextUrl.pathname.startsWith("/admin")) {
      console.log("🛡️ Admin route detected");

      if (!session) {
        console.log("❌ No session, redirecting to login");
        const redirectUrl = new URL("/auth/login", req.url);
        redirectUrl.searchParams.set("redirect", "admin");
        return NextResponse.redirect(redirectUrl);
      }

      // Check user profile and role
      console.log("🔍 Checking admin role for user:", session.user.id);

      const { data: profile, error: profileError } = await supabase.from("user_profiles").select("role").eq("id", session.user.id).single();

      if (profileError) {
        console.error("❌ Profile query error:", profileError);

        // If profile not found, user should go to dashboard
        if (profileError.code === "PGRST116") {
          console.log("⚠️ Profile not found, redirecting to dashboard");
          return NextResponse.redirect(new URL("/dashboard", req.url));
        }
      }

      console.log("📋 Profile found, role:", profile?.role);

      // Strict check: ONLY 'admin' role can access
      if (profile?.role !== "admin") {
        console.log("🚫 User is NOT admin, redirecting to dashboard");
        console.log("   Current role:", profile?.role);
        console.log("   Required role: admin");
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }

      console.log("✅ User is admin, allowing access");
    }

    // ========== CLIENT DASHBOARD PROTECTION ==========
    if (req.nextUrl.pathname.startsWith("/dashboard") && !req.nextUrl.pathname.startsWith("/dashboard/admin")) {
      console.log("🏠 Client dashboard route detected");

      if (!session) {
        console.log("❌ No session, redirecting to login");
        const redirectUrl = new URL("/auth/login", req.url);
        redirectUrl.searchParams.set("redirect", "dashboard");
        return NextResponse.redirect(redirectUrl);
      }

      // Cek role: jika admin, redirect ke /admin SEKARANG (bukan di client side)
      const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", session.user.id).single();

      // Jika admin, redirect langsung ke admin dashboard
      if (profile?.role === "admin") {
        console.log("👑 Admin trying to access client dashboard, redirecting to admin");
        return NextResponse.redirect(new URL("/admin", req.url));
      }

      // Jika bukan admin tapi mencoba akses admin routes
      if (profile?.role !== "admin" && req.nextUrl.pathname.startsWith("/admin")) {
        console.log("🚫 Non-admin trying to access admin, redirecting to dashboard");
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }
  } catch (error) {
    console.error("🔥 Middleware error:", error);
  }

  return res;
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/api/admin/:path*"],
};
