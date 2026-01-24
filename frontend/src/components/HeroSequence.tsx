"use client";
import { useEffect, useRef } from 'react';
import gsap from 'gsap';

export default function HeroSequence() {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLHeadingElement>(null);
  const subTextRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline();

      tl.fromTo(textRef.current, 
        { y: 100, opacity: 0, skewY: 7 }, 
        { y: 0, opacity: 1, skewY: 0, duration: 1.5, ease: "power4.out" }
      )
      .fromTo(subTextRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 1 },
        "-=0.8"
      );

      // Floating dioptimasi dengan force3D
      gsap.to(containerRef.current, {
        y: -15, // dikurangi sedikit agar tidak terlalu jauh
        duration: 3,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        force3D: true 
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <div className="relative h-screen w-full flex items-center justify-center bg-[#050505] overflow-hidden">
      {/* Background dioptimasi agar tidak di-repaint terus */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] [backface-visibility:hidden]"></div>
      
      {/* Red Glow dengan will-change */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-600/10 blur-[100px] rounded-full pointer-events-none will-change-[filter]"></div>

      <div ref={containerRef} className="relative z-10 flex flex-col items-center will-change-transform">
        <div className="overflow-hidden py-2">
          <h1 
            ref={textRef}
            className="text-[18vw] md:text-[15vw] font-[1000] text-white leading-none tracking-tighter italic uppercase select-none will-change-transform"
            style={{ fontFamily: 'var(--font-sans)' }}
          >
            BANDIT JOKI<span className="text-red-600">.</span>
          </h1>
        </div>

        {/* ... sisa konten sama ... */}
      </div>
    </div>
  );
}