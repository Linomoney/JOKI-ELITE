"use client";
import { useState, useEffect } from "react";
import { Menu, X, ArrowRight, Skull, Github, Instagram, Twitter } from "lucide-react";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    
    // Mencegah scroll saat menu full screen terbuka
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isOpen]);

  const navLinks = [
    { name: "Home", href: "#", desc: "Back to base" },
    { name: "About", href: "#about", desc: "The Doctrine" },
    { name: "Archive", href: "#portfolio", desc: "Heist records" },
    { name: "Contact", href: "#contact", desc: "Hire the team" },
  ];

  return (
    <>
      <nav className={`fixed top-0 w-full z-[100] transition-all duration-500 ${isScrolled && !isOpen ? "py-4 bg-[#050505]/90 backdrop-blur-xl border-b border-red-900/20" : "py-8 bg-transparent"}`}>
        <div className="container mx-auto px-6 flex justify-between items-center">
          {/* LOGO TEAM BANDIT */}
          <div className="flex items-center gap-2 z-[110]">
            <Skull className={`${isOpen || isScrolled ? "text-red-600" : "text-white"} transition-colors`} size={28} />
            <div className="text-2xl font-black tracking-tighter text-white uppercase italic">
              TEAM<span className="text-red-600">BANDIT</span>
            </div>
          </div>

          {/* TRIGGER BUTTON (GARIS 3) */}
          <button 
            className="z-[110] flex items-center gap-4 text-white group"
            onClick={() => setIsOpen(!isOpen)}
          >
            <span className="text-[10px] font-mono font-bold tracking-[0.5em] uppercase hidden md:block group-hover:text-red-600 transition">
              {isOpen ? "DISCONNECT" : "SYSTEM MENU"}
            </span>
            <div className={`p-4 rounded-2xl transition-all duration-500 ${isOpen ? "bg-red-600 rotate-180" : "bg-white/5 border border-white/10 hover:border-red-600/50"}`}>
              {isOpen ? <X size={24} strokeWidth={3} /> : <Menu size={24} strokeWidth={3} />}
            </div>
          </button>
        </div>
      </nav>

      {/* FULL SCREEN OVERLAY MENU */}
      <div className={`fixed inset-0 z-[105] bg-[#050505] transition-all duration-700 ease-[cubic-bezier(0.85,0,0.15,1)] ${isOpen ? "clip-path-open" : "clip-path-closed"}`}>
        {/* Background Grid Pattern (Bandit Style) */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#ff0000 1px, transparent 1px), linear-gradient(90deg, #ff0000 1px, transparent 1px)', backgroundSize: '50px 50px' }}></div>
        
        {/* Large Decorative Text Backround */}
        <div className="absolute bottom-0 left-0 text-[20vw] font-black text-white/[0.02] leading-none pointer-events-none select-none italic -mb-10 -ml-10">
          HEIST
        </div>

        <div className="container mx-auto px-6 h-full flex flex-col justify-center relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="flex flex-col gap-6 md:gap-4">
              {navLinks.map((link, index) => (
                <a 
                  key={link.name} 
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="group flex items-center gap-6 overflow-hidden w-fit"
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  <span className="text-red-600/30 text-xl font-mono group-hover:text-red-600 transition-colors italic font-bold tracking-tighter">/0{index + 1}</span>
                  <div className="flex flex-col">
                    <span className="text-5xl md:text-8xl font-black uppercase tracking-tighter text-white group-hover:text-red-600 group-hover:translate-x-6 transition-all duration-500 italic leading-none">
                      {link.name}
                    </span>
                    <span className="text-zinc-600 text-[10px] font-mono tracking-[0.4em] uppercase mt-2 group-hover:text-white transition-colors">
                      {link.desc}
                    </span>
                  </div>
                </a>
              ))}
            </div>

            <div className="hidden md:flex flex-col justify-end items-end text-right border-l border-zinc-900 pb-10 pr-10">
              <div className="p-10 bg-zinc-950 border border-zinc-900 rounded-[3rem] relative overflow-hidden group/box">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover/box:rotate-12 transition-transform">
                  <Skull size={80} />
                </div>
                <p className="text-zinc-500 max-w-xs mb-8 relative z-10 italic">Ready to execute? Join the ranks of satisfied clients who have witnessed the Bandit precision.</p>
                <a href="https://wa.me/6281234567890" className="flex items-center gap-4 text-3xl font-black text-white hover:text-red-600 transition group/btn relative z-10 italic uppercase">
                  START HEIST <ArrowRight size={32} className="group-hover/btn:translate-x-2 transition-transform" />
                </a>
                
                <div className="mt-16 space-y-4 relative z-10">
                    <p className="text-zinc-700 font-mono text-[10px] uppercase tracking-[0.5em] font-bold">Encrypted Socials</p>
                    <div className="flex gap-4 justify-end">
                        {[Instagram, Twitter, Github].map((Icon, i) => (
                          <div key={i} className="p-3 bg-black border border-zinc-900 rounded-xl hover:text-red-600 hover:border-red-600/50 transition-all cursor-pointer">
                            <Icon size={20} />
                          </div>
                        ))}
                    </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .clip-path-closed {
          clip-path: circle(0% at 95% 5%);
          pointer-events: none;
        }
        .clip-path-open {
          clip-path: circle(150% at 95% 5%);
          pointer-events: all;
        }
      `}</style>
    </>
  );
}