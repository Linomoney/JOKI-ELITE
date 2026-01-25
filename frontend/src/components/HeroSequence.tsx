"use client";
import { useEffect, useRef } from 'react';
import gsap from 'gsap';

export default function HeroSequence() {
  const containerRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Animasi Floating yang sangat santai (Slow Motion)
      gsap.to(containerRef.current, {
        y: -20,
        duration: 5, // Diperlama biar chill
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        force3D: true 
      });

      // Animasi Pulse pada Glow merah agar terasa "hidup" tapi halus
      gsap.to(glowRef.current, {
        scale: 1.2,
        opacity: 0.15,
        duration: 4,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut"
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <div className="relative h-full w-full flex items-center justify-center bg-[#050505] overflow-hidden">
      {/* 1. Grain/Noise Overlay - Ringan & Statis */}
      <div className="absolute inset-0 z-0 opacity-[0.15] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat"></div>
      
      {/* 2. Red Glow - Sekarang dipisah biar bisa dipulse */}
      <div 
        ref={glowRef}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-red-600/10 blur-[80px] md:blur-[120px] rounded-full pointer-events-none will-change-transform"
      ></div>

      {/* 3. Decorative Background Text (Watermark Look) */}
      <div 
        ref={containerRef} 
        className="relative z-0 flex flex-col items-center select-none will-change-transform"
      >
        <h2 className="text-[25vw] font-[1000] text-white/[0.02] leading-none tracking-tighter italic uppercase whitespace-nowrap">
          BANDIT BANDIT BANDIT
        </h2>
        <h2 className="text-[25vw] font-[1000] text-red-600/[0.02] leading-none tracking-tighter italic uppercase whitespace-nowrap -mt-10 md:-mt-20">
          ELITE ELITE ELITE
        </h2>
      </div>

      {/* 4. Scanner Line Effect (Animasi santai tambahan) */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-red-600/[0.03] to-transparent h-20 w-full top-[-10%] animate-scan pointer-events-none"></div>

      <style jsx>{`
        @keyframes scan {
          0% { top: -10%; }
          100% { top: 110%; }
        }
        .animate-scan {
          animation: scan 8s linear infinite;
        }
      `}</style>
    </div>
  );
}