"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

type Particle = {
  left: string;
  top: string;
  duration: string;
  delay: string;
};

export default function HeroSequence() {
  const containerRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const [particles, setParticles] = useState<Particle[]>([]);

  // GSAP animations
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.to(containerRef.current, {
        y: -20,
        duration: 5,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        force3D: true,
      });

      gsap.to(glowRef.current, {
        scale: 1.2,
        opacity: 0.15,
        duration: 4,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    });

    return () => ctx.revert();
  }, []);

  // Generate particles AFTER mount (anti hydration error)
  useEffect(() => {
    const generated: Particle[] = [...Array(6)].map((_, i) => ({
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      duration: `${3 + Math.random() * 4}s`,
      delay: `${i * 0.3}s`,
    }));

    setParticles(generated);
  }, []);

  return (
    <div className="relative h-full w-full flex items-center justify-center bg-[#050505] overflow-hidden">
      {/* Grain / Noise */}
      <div className="absolute inset-0 z-0 opacity-[0.15] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat"></div>

      {/* Red Glow */}
      <div
        ref={glowRef}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
        w-[300px] md:w-[600px] h-[300px] md:h-[600px]
        bg-red-600/10 blur-[80px] md:blur-[120px]
        rounded-full pointer-events-none will-change-transform"
      />

      {/* Background Text */}
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

      {/* Scanner Line */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-red-600/[0.03] to-transparent h-20 w-full top-[-10%] animate-scan pointer-events-none"></div>

      {/* Glitch Overlay */}
      <div
        className="absolute inset-0 opacity-[0.08] pointer-events-none mix-blend-screen animate-pulse"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 50%, rgba(255,0,0,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(0,255,255,0.1) 0%, transparent 50%)",
        }}
      />

      {/* Floating Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {particles.map((p, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-red-600 rounded-full opacity-60"
            style={{
              left: p.left,
              top: p.top,
              animation: `float ${p.duration} ease-in-out infinite`,
              animationDelay: p.delay,
            }}
          />
        ))}
      </div>
    </div>
  );
}
