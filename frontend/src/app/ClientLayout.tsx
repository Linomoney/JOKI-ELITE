"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import dynamic from 'next/dynamic';
import Navbar from "@/components/Navbar";
import SplashScreen from "@/components/SplashScreen";
import { supabase } from "@/lib/supabase";

// Lazy load chat widgets
const LazyChatWidget = dynamic(() => import('@/components/ChatWidget'), { 
  ssr: false,
  loading: () => null 
});

const LazyAdminChatWidget = dynamic(() => import('@/components/AdminChatWidget'), { 
  ssr: false,
  loading: () => null 
});

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [showSplash, setShowSplash] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    const hasSeenSplash = sessionStorage.getItem("splashSeen");
    if (hasSeenSplash) setShowSplash(false);
    
    document.documentElement.style.scrollBehavior = 'auto';
  }, []);

  useEffect(() => {
    checkUser();
    
    // Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: any, session: any) => {
      setUser(session?.user || null);
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setUserProfile(null);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        loadUserProfile(user.id);
      }
    } catch (error) {
      console.error("Error checking user:", error);
    }
  };

  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (data) {
        setUserProfile(data);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  };

  // List of paths where navbar should NOT appear
  const hideNavbarPaths = ["/admin", "/dashboard"];
  const showNavbar = !hideNavbarPaths.some((path) =>
    pathname.startsWith(path)
  );

  // Tentukan apakah perlu menampilkan ChatWidget
  const shouldShowChatWidget = () => {
    if (!user || showSplash) return false;
    
    // If on admin page, don't show regular chat widget
    if (pathname.startsWith("/admin")) return false;

    if (pathname.startsWith("/dashboard")) return false;
    
    return true;
  };

  // Tentukan apakah user adalah admin
  const isAdmin = userProfile?.role === "admin" || userProfile?.role === "super_admin";

  return (
    <>
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      {showNavbar && !showSplash && <Navbar />}
      <main>{children}</main>
      
      {/* Show appropriate chat widget based on role */}
      {shouldShowChatWidget() && (
        <>
          {/* Regular user chat widget */}
          {!isAdmin && <LazyChatWidget user={user} />}
          
          {/* Admin chat panel (always shown for admins) */}
          {isAdmin && <LazyAdminChatWidget />}
        </>
      )}
    </>
  );
}