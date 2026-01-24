"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, ArrowRight, Mail, Lock, Terminal } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isError, setIsError] = useState(false);
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // GANTI SESUAI KEINGINAN LU
    const ADMIN_EMAIL = "admin@senoelite.com";
    const ADMIN_PASS = "seno123";

    if (email === ADMIN_EMAIL && password === ADMIN_PASS) {
      localStorage.setItem('admin_auth', 'true');
      router.push('/admin');
    } else {
      setIsError(true);
      setTimeout(() => setIsError(false), 500);
      setPassword(''); // Reset password aja kalau salah
    }
  };

  return (
    <div className="min-h-screen bg-[#020408] flex items-center justify-center p-6 relative overflow-hidden font-sans">
      
      {/* GRID BACKGROUND & GLOW */}
      <div className="absolute inset-0 z-0 opacity-10" 
           style={{ backgroundImage: `linear-gradient(#1e293b 1px, transparent 1px), linear-gradient(90deg, #1e293b 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className={`w-full max-w-[420px] z-10 transition-all duration-300 ${isError ? 'animate-shake' : ''}`}>
        
        {/* ICON CENTER */}
        <div className="flex justify-center mb-6">
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl shadow-2xl relative">
                <div className="absolute inset-0 bg-cyan-500/20 blur-xl animate-pulse rounded-2xl" />
                <ShieldCheck className="text-cyan-500 relative z-10" size={32} />
            </div>
        </div>

        {/* LOGIN CARD */}
        <div className="bg-zinc-900/40 backdrop-blur-3xl p-8 rounded-[32px] border border-white/5 shadow-2xl relative overflow-hidden">
          
          <div className="text-center mb-8">
            <h1 className="text-xl font-black tracking-widest text-white uppercase italic">Terminal Access</h1>
            <div className="flex items-center justify-center gap-2 mt-2 opacity-40">
                <Terminal size={10} className="text-cyan-500" />
                <p className="text-[8px] font-mono tracking-[0.3em] text-zinc-400 uppercase">Secure Protocol v4.0</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* EMAIL INPUT */}
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-cyan-500 transition-colors" size={18} />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Admin Email"
                className="w-full bg-black/40 border border-zinc-800 p-4 pl-12 rounded-xl outline-none focus:border-cyan-500/50 text-white font-medium transition-all placeholder:text-zinc-700"
                required
              />
            </div>

            {/* PASSWORD INPUT */}
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-cyan-500 transition-colors" size={18} />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full bg-black/40 border border-zinc-800 p-4 pl-12 rounded-xl outline-none focus:border-cyan-500/50 text-cyan-400 font-mono transition-all placeholder:text-zinc-700"
                required
              />
            </div>

            <button type="submit" className="w-full bg-cyan-500 text-black font-black py-4 rounded-xl flex items-center justify-center gap-3 hover:bg-white transition-all active:scale-95 shadow-lg shadow-cyan-500/10 mt-6">
              <span className="text-xs tracking-widest uppercase">Authenticate</span>
              <ArrowRight size={16} />
            </button>
          </form>

          {/* ERROR MESSAGE */}
          {isError && (
            <p className="text-center text-red-500 font-mono text-[9px] mt-4 uppercase tracking-tighter animate-pulse">
              Invalid Credentials. Access Denied.
            </p>
          )}
        </div>

        <p className="text-center mt-8 text-zinc-800 font-mono text-[8px] uppercase tracking-[0.5em]">
          System Monitoring Active // Seno Elite Core
        </p>
      </div>

      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
      `}</style>
    </div>
  );
}