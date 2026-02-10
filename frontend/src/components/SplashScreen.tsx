"use client";

import { useEffect, useState } from 'react';
import { Skull } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => {
        sessionStorage.setItem('splashSeen', 'true');
        onComplete();
      }, 800);
    }, 2500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden transition-all duration-700 bg-[#050505] ${
        isExiting ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
      }`}
    >
      {/* Animated grid background matching theme */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: 'linear-gradient(#ff0000 1px, transparent 1px), linear-gradient(90deg, #ff0000 1px, transparent 1px)',
            backgroundSize: '50px 50px',
            animation: 'scanLines 8s linear infinite',
          }}
        />
      </div>

      {/* Red glow effect matching main theme */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-red-600/10 blur-[100px] rounded-full animate-pulse-slow"></div>

      {/* Glitch text container */}
      <div className="relative z-10 text-center">
        {/* Main text with glitch effect */}
        <div className="relative inline-block mb-8">
          <h1
            className="text-7xl md:text-9xl font-black italic tracking-tighter uppercase text-white"
            style={{
              textShadow: '-2px 0 #ff0000, 2px 0 #00ffff',
              animation: 'glitch 0.3s infinite',
              letterSpacing: '0.05em',
            }}
          >
            BANDIT
          </h1>

          {/* Glitch layers */}
          <h1
            className="absolute inset-0 text-7xl md:text-9xl font-black italic tracking-tighter uppercase text-transparent"
            style={{
              color: '#ff0000',
              animation: 'glitch-1 0.3s infinite',
              clipPath: 'polygon(0 0, 100% 0, 100% 35%, 0 100%)',
              textShadow: '-2px 0 #ff0000',
              letterSpacing: '0.05em',
            }}
          >
            BANDIT
          </h1>

          <h1
            className="absolute inset-0 text-7xl md:text-9xl font-black italic tracking-tighter uppercase text-transparent"
            style={{
              color: '#ffffff',
              animation: 'glitch-2 0.3s infinite',
              clipPath: 'polygon(0 65%, 100% 0, 100% 100%, 0 100%)',
              textShadow: '2px 0 #ffffff',
              letterSpacing: '0.05em',
            }}
          >
            BANDIT
          </h1>
        </div>

        {/* Skull icon with animation */}
        <div className="flex justify-center mb-8">
          <Skull
            size={60}
            className="text-red-600"
            style={{
              animation: 'pulse-skull 1.5s ease-in-out infinite',
              filter: 'drop-shadow(0 0 20px rgba(220, 38, 38, 0.6))',
            }}
          />
        </div>

        {/* Status text */}
        <div className="space-y-2">
          <p
            className="text-sm font-mono tracking-widest text-red-600 uppercase"
            style={{
              animation: 'blink 1.5s infinite',
            }}
          >
            ● INITIALIZING SYSTEM
          </p>
          <p className="text-xs font-mono tracking-widest text-zinc-600 uppercase">
            LOADING ELITE OPERATIVES
          </p>
        </div>

        {/* Progress bar matching theme */}
        <div className="mt-6 w-64 h-1 bg-zinc-900 rounded-full overflow-hidden border border-red-600/30 mx-auto">
          <div
            className="h-full bg-gradient-to-r from-red-600 to-red-500 rounded-full"
            style={{
              animation: 'progress 2.5s ease-in-out forwards',
            }}
          />
        </div>
      </div>

      {/* Bottom text */}
      <div className="absolute bottom-8 text-center">
        <p className="text-[10px] font-mono text-zinc-700 tracking-[0.3em]">
          v1.0.0 | CLASSIFIED OPERATIONS
        </p>
      </div>

      <style jsx>{`
        @keyframes glitch {
          0%, 100% {
            text-shadow: -2px 0 #ff0000, 2px 0 #00ffff;
            transform: translate(0);
          }
          20% {
            text-shadow: -2px 0 #ff0000, 2px 0 #00ffff;
            transform: translate(-2px, 2px);
          }
          40% {
            text-shadow: -2px 0 #ff0000, 2px 0 #00ffff;
            transform: translate(-2px, -2px);
          }
          60% {
            text-shadow: -2px 0 #ff0000, 2px 0 #00ffff;
            transform: translate(2px, 2px);
          }
          80% {
            text-shadow: -2px 0 #ff0000, 2px 0 #00ffff;
            transform: translate(2px, -2px);
          }
        }

        @keyframes glitch-1 {
          0% {
            clip-path: polygon(0 0, 100% 0, 100% 35%, 0 100%);
            transform: translate(-2px, -2px);
          }
          50% {
            clip-path: polygon(0 0, 100% 0, 100% 65%, 0 100%);
            transform: translate(2px, 2px);
          }
          100% {
            clip-path: polygon(0 0, 100% 0, 100% 35%, 0 100%);
            transform: translate(-2px, -2px);
          }
        }

        @keyframes glitch-2 {
          0% {
            clip-path: polygon(0 65%, 100% 0, 100% 100%, 0 100%);
            transform: translate(2px, 2px);
          }
          50% {
            clip-path: polygon(0 35%, 100% 0, 100% 100%, 0 100%);
            transform: translate(-2px, -2px);
          }
          100% {
            clip-path: polygon(0 65%, 100% 0, 100% 100%, 0 100%);
            transform: translate(2px, 2px);
          }
        }

        @keyframes pulse-skull {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.8;
          }
        }

        @keyframes blink {
          0%, 49%, 100% {
            opacity: 1;
          }
          50%, 99% {
            opacity: 0.3;
          }
        }

        @keyframes progress {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }

        @keyframes scanLines {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(10px);
          }
        }
        
        @keyframes pulse-slow {
          0%, 100% {
            opacity: 0.1;
            transform: scale(1);
          }
          50% {
            opacity: 0.15;
            transform: scale(1.1);
          }
        }
        
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}