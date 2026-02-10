"use client";
import { useState, useEffect, useRef } from "react"; // Tambahkan useRef
import { Menu, X, ArrowRight, Skull, Github, Instagram, Twitter, LogIn, User } from "lucide-react";
import { authHelpers } from "@/lib/supabase";
import { useRouter, usePathname } from "next/navigation";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const menuRef = useRef<HTMLDivElement>(null); // Ref untuk menu container

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);

    checkUser();

    // Hapus overflow control dari sini, kita akan handle dengan CSS
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isOpen]);

  // Handle click outside untuk close menu di mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        closeMenu();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const checkUser = async () => {
    try {
      const currentUser = await authHelpers.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        const userProfile = await authHelpers.getUserProfile(currentUser.id);
        setProfile(userProfile);
      }
    } catch (error) {
      console.error("Error checking user:", error);
    }
  };

  const handleLogout = async () => {
    await authHelpers.signOut();
    setUser(null);
    setProfile(null);
    closeMenu();
    router.push("/");
  };

  const handleAnchorClick = (href: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
    }

    closeMenu();

    if (pathname === "/") {
      const id = href.replace("#", "");
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
      return;
    }

    router.push(`/${href}`);
  };

  const navLinks = [
    { name: "Home", href: "#home", desc: "Kembali ke Markas" },
    { name: "Doctrine", href: "#about", desc: "Misi & Visi Kami" },
    { name: "Plans", href: "#paket", desc: "Pilihan Taktik" },
    { name: "Order", href: "#order", desc: "Luncurkan Misi" },
  ];

  const closeMenu = () => setIsOpen(false);

  return (
    <>
      {/* NAVBAR - Z-INDEX PALING TINGGI */}
      <nav className={`fixed top-0 w-full z-[200] transition-all duration-500 ${isScrolled && !isOpen ? "py-4 bg-[#050505]/90 backdrop-blur-xl border-b border-red-900/20" : "py-8 bg-transparent"}`}>
        <div className="container mx-auto px-6 flex justify-between items-center">
          {/* LOGO TEAM BANDIT */}
          <button onClick={() => handleAnchorClick("#home")} className="flex items-center gap-2 relative z-[210]">
            <Skull className={`${isOpen || isScrolled ? "text-red-600" : "text-white"} transition-colors`} size={28} />
            <div className="text-2xl font-black tracking-tighter text-white uppercase italic">
              TEAM<span className="text-red-600">BANDIT</span>
            </div>
          </button>

          {/* RIGHT SECTION */}
          <div className="flex items-center gap-4 relative z-[210]">
            {user ? (
              <div
                className="hidden md:flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/10 rounded-xl hover:border-red-600/50 transition-all cursor-pointer group"
                onClick={() => {
                  if (profile?.role === "admin") {
                    router.push("/admin");
                  } else {
                    router.push("/dashboard");
                  }
                  closeMenu();
                }}
              >
                <div className="w-8 h-8 bg-gradient-to-br from-red-600 to-red-700 rounded-full flex items-center justify-center">
                  <span className="text-xs font-black">{profile?.full_name?.charAt(0) || "A"}</span>
                </div>
                <div className="text-left">
                  <p className="text-white text-sm font-black leading-none group-hover:text-red-600 transition-colors">{profile?.full_name || "Agent"}</p>
                  <p className="text-zinc-600 text-[8px] font-mono tracking-widest uppercase">{profile?.role || "CLIENT"}</p>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  router.push("/auth/login");
                  closeMenu();
                }}
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl hover:border-red-600/50 hover:bg-red-600/10 transition-all text-white group"
              >
                <LogIn size={18} className="group-hover:text-red-600 transition-colors" />
                <span className="text-sm font-black uppercase tracking-tighter group-hover:text-red-600 transition-colors">Login</span>
              </button>
            )}

            {/* MENU BUTTON */}
            <button className="flex items-center gap-4 text-white group" onClick={() => setIsOpen(!isOpen)} aria-label={isOpen ? "Tutup menu" : "Buka menu"}>
              <span className="text-[10px] font-mono font-bold tracking-[0.5em] uppercase hidden lg:block group-hover:text-red-600 transition">{isOpen ? "DISCONNECT" : "OPERATIONAL MENU"}</span>
              <div className={`p-4 rounded-2xl transition-all duration-500 ${isOpen ? "bg-red-600 rotate-180" : "bg-white/5 border border-white/10 hover:border-red-600/50"}`}>
                {isOpen ? <X size={24} strokeWidth={3} /> : <Menu size={24} strokeWidth={3} />}
              </div>
            </button>
          </div>
        </div>
      </nav>

      {/* FULL SCREEN OVERLAY MENU - PERBAIKI DI SINI */}
      <div ref={menuRef} className={`fixed inset-0 z-[100] transition-all duration-700 ease-[cubic-bezier(0.85,0,0.15,1)] ${isOpen ? "clip-path-open visible" : "clip-path-closed invisible"}`}>
        {/* Background dengan opacity lebih tinggi agar kontras */}
        <div className="absolute inset-0 bg-[#050505]"></div>

        {/* Background Grid Pattern */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{ backgroundImage: "linear-gradient(#ff0000 1px, transparent 1px), linear-gradient(90deg, #ff0000 1px, transparent 1px)", backgroundSize: "50px 50px" }}
        ></div>

        {/* Decorative Background Text */}
        <div className="absolute bottom-0 left-0 text-[20vw] font-black text-white/[0.02] leading-none pointer-events-none select-none italic -mb-10 -ml-10 uppercase">Bandit</div>

        {/* Scrollable Container - PERBAIKAN UTAMA */}
        <div className="container mx-auto px-6 h-full overflow-y-auto py-32 relative z-10" onClick={(e) => e.stopPropagation()}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start min-h-full">
            {/* Links Section */}
            <div className="flex flex-col gap-6 md:gap-4">
              {navLinks.map((link, index) => (
                <button key={link.name} onClick={() => handleAnchorClick(link.href)} className="group flex items-center gap-6 overflow-hidden w-fit relative text-left" style={{ transitionDelay: `${index * 100}ms` }}>
                  <div className="absolute -left-10 top-1/2 w-40 h-[1px] bg-gradient-to-r from-transparent to-red-600 opacity-0 group-hover:opacity-100 transition-all duration-500" />

                  <span className="text-red-600/30 text-xl font-mono group-hover:text-red-600 transition-colors italic font-bold tracking-tighter">/0{index + 1}</span>
                  <div className="flex flex-col">
                    <span className="text-4xl md:text-8xl font-black uppercase tracking-tighter text-white group-hover:text-red-600 group-hover:translate-x-6 transition-all duration-500 italic leading-none">{link.name}</span>
                    <span className="text-zinc-600 text-[10px] font-mono tracking-[0.4em] uppercase mt-2 group-hover:text-white transition-colors">{link.desc}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* CTA & Social Section - Desktop */}
            <div className="hidden lg:flex flex-col justify-end items-end text-right border-l border-zinc-900 pb-10 pr-10">
              <div className="p-10 bg-zinc-950 border border-zinc-900 rounded-[3rem] relative overflow-hidden group/box w-full">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover/box:rotate-12 transition-transform">
                  <Skull size={80} />
                </div>

                {user ? (
                  <div className="mb-8 relative z-10">
                    <div className="flex items-center gap-4 justify-end mb-4">
                      <div>
                        <p className="text-white text-2xl font-black italic">{profile?.full_name}</p>
                        <p className="text-zinc-600 text-[10px] font-mono tracking-widest uppercase">{profile?.role}</p>
                      </div>
                      <div className="w-16 h-16 bg-gradient-to-br from-red-600 to-red-700 rounded-full flex items-center justify-center">
                        <span className="text-2xl font-black">{profile?.full_name?.charAt(0) || "A"}</span>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          if (profile?.role === "admin") {
                            router.push("/admin");
                          } else {
                            router.push("/dashboard");
                          }
                          closeMenu();
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white font-black rounded-xl hover:bg-red-700 transition-all uppercase text-sm"
                      >
                        <User size={18} />
                        {profile?.role === "admin" ? "Admin Panel" : "Dashboard"}
                      </button>
                      <button onClick={handleLogout} className="px-6 py-3 bg-zinc-900 border border-zinc-800 text-zinc-400 font-black rounded-xl hover:border-red-600 hover:text-red-600 transition-all uppercase text-sm">
                        Logout
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-zinc-500 max-w-xs mb-8 relative z-10 italic text-right">Siap untuk eksekusi? Bergabunglah dengan barisan Agent yang telah merasakan presisi Bandit.</p>
                    <button
                      onClick={() => {
                        router.push("/auth/login");
                        closeMenu();
                      }}
                      className="flex items-center gap-4 text-3xl font-black text-white hover:text-red-600 transition group/btn relative z-10 italic uppercase mb-6 ml-auto"
                    >
                      START MISSION <ArrowRight size={32} className="group-hover/btn:translate-x-2 transition-transform" />
                    </button>

                    <button
                      onClick={() => {
                        router.push("/auth/login");
                        closeMenu();
                      }}
                      className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-white/5 border border-white/10 text-white font-black rounded-xl hover:bg-red-600 hover:border-red-600 transition-all uppercase text-sm w-full relative z-10"
                    >
                      <LogIn size={20} />
                      Agent Login
                    </button>
                  </>
                )}

                <div className="mt-16 space-y-4 relative z-10">
                  <p className="text-zinc-700 font-mono text-[10px] uppercase tracking-[0.5em] font-bold">Encrypted Socials</p>
                  <div className="flex gap-4 justify-end">
                    {[Instagram, Twitter, Github].map((Icon, i) => (
                      <button
                        key={i}
                        onClick={() => window.open("#", "_blank")}
                        className="p-3 bg-black border border-zinc-900 rounded-xl hover:text-red-600 hover:border-red-600/50 transition-all cursor-pointer"
                        aria-label={`Social media ${i + 1}`}
                      >
                        <Icon size={20} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* MOBILE: User Info or CTA Button */}
          <div className="lg:hidden mt-12 space-y-4 pb-20">
            {user ? (
              <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6">
                <div className="flex items-center justify-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-red-600 to-red-700 rounded-full flex items-center justify-center">
                    <span className="text-2xl font-black">{profile?.full_name?.charAt(0) || "A"}</span>
                  </div>
                  <div className="text-left">
                    <p className="text-white text-xl font-black italic">{profile?.full_name}</p>
                    <p className="text-zinc-600 text-[10px] font-mono tracking-widest uppercase">{profile?.role}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => {
                      if (profile?.role === "admin") {
                        router.push("/admin");
                      } else {
                        router.push("/dashboard");
                      }
                      closeMenu();
                    }}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-red-600 text-white font-black rounded-xl hover:bg-red-700 transition-all uppercase"
                  >
                    <User size={20} />
                    {profile?.role === "admin" ? "Admin Panel" : "Dashboard"}
                  </button>
                  <button onClick={handleLogout} className="w-full px-6 py-4 bg-zinc-900 border border-zinc-800 text-zinc-400 font-black rounded-xl hover:border-red-600 hover:text-red-600 transition-all uppercase">
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  onClick={() => {
                    router.push("/auth/login");
                    closeMenu();
                  }}
                  className="w-full flex items-center gap-3 px-8 py-4 bg-red-600 text-white font-black rounded-2xl hover:bg-red-700 transition-all uppercase tracking-tighter text-lg justify-center"
                >
                  <ArrowRight size={24} />
                  START MISSION
                </button>
                <button
                  onClick={() => {
                    router.push("/auth/login");
                    closeMenu();
                  }}
                  className="w-full flex items-center gap-3 px-8 py-4 bg-white/5 border border-white/10 text-white font-black rounded-2xl hover:bg-red-600 hover:border-red-600 transition-all uppercase tracking-tighter text-lg justify-center"
                >
                  <LogIn size={24} />
                  Agent Login
                </button>
              </>
            )}

            {/* Social Media untuk Mobile */}
            <div className="mt-8 space-y-4">
              <p className="text-zinc-700 font-mono text-[10px] uppercase tracking-[0.5em] font-bold text-center">Encrypted Socials</p>
              <div className="flex gap-4 justify-center">
                {[Instagram, Twitter, Github].map((Icon, i) => (
                  <button
                    key={i}
                    onClick={() => window.open("#", "_blank")}
                    className="p-3 bg-black border border-zinc-900 rounded-xl hover:text-red-600 hover:border-red-600/50 transition-all cursor-pointer"
                    aria-label={`Social media ${i + 1}`}
                  >
                    <Icon size={20} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        /* PERBAIKAN CSS UNTUK SCROLLABLE MENU */
        .clip-path-closed {
          clip-path: circle(0% at 95% 5%);
          visibility: hidden;
          opacity: 0;
          pointer-events: none;
        }
        .clip-path-open {
          clip-path: circle(150% at 95% 5%);
          visibility: visible;
          opacity: 1;
          pointer-events: all;
        }

        /* Container scrollable */
        .container.mx-auto.px-6.h-full {
          overflow-y: auto !important;
          -webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
        }

        /* Pastikan konten cukup tinggi untuk scrolling */
        .grid.grid-cols-1.lg\\:grid-cols-2.gap-12.items-start {
          min-height: calc(100vh - 8rem);
        }

        /* Custom scrollbar untuk menu */
        .container.mx-auto.px-6.h-full::-webkit-scrollbar {
          width: 6px;
        }
        .container.mx-auto.px-6.h-full::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .container.mx-auto.px-6.h-full::-webkit-scrollbar-thumb {
          background: rgba(220, 38, 38, 0.5);
          border-radius: 10px;
        }
        .container.mx-auto.px-6.h-full::-webkit-scrollbar-thumb:hover {
          background: rgba(220, 38, 38, 0.8);
        }

        /* Animasi untuk menu items */
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-50px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes slideRight {
          from {
            transform: translateX(-40px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        /* Disable body scroll when menu is open - PERBAIKI */
        body.menu-open {
          overflow: hidden;
        }
      `}</style>
    </>
  );
}
