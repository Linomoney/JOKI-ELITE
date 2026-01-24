"use client";
import { useEffect, useState } from 'react';
import HeroSequence from '@/components/HeroSequence';
import Lenis from '@studio-freight/lenis';
import { Search, Loader2, Rocket, ShieldCheck, Zap, ArrowRight, Instagram, Twitter, Github, Mail, Skull, Target, Terminal, Activity } from 'lucide-react';

export default function Home() {
  const [articles, setArticles] = useState([]);
  const [orderId, setOrderId] = useState('');
  const [trackData, setTrackData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const lenis = new Lenis();
    function raf(time: number) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

    fetch(`${API_URL}/api/admin/orders`)
      .then(res => res.json())
      .then(setArticles)
      .catch(() => console.log("Backend offline atau data belum ada"));
  }, []);

  const handleTrack = async () => {
    if(!orderId) return;
    setLoading(true);
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    try {
      const res = await fetch(`${API_URL}/api/track/${orderId}`);
      if (res.ok) setTrackData(await res.json());
      else alert("ID MISSION TIDAK DITEMUKAN");
    } finally { setLoading(false); }
  };

  return (
    <main className="bg-[#050505] text-white font-sans selection:bg-red-600 selection:text-white overflow-x-hidden">
      
      {/* 1. HERO SECTION */}
      <section id="home" className="relative min-h-screen">
        <HeroSequence />
      </section>

      {/* 2. LIVE STATS */}
      <section className="relative z-20 -mt-24 px-6">
        <div className="container mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: "MISSIONS COMPLETED", val: "1.2K+", color: "text-red-600" },
            { label: "EXTRACTION RATE", val: "100%", color: "text-white" },
            { label: "OPERATIONAL", val: "24/7", color: "text-red-600" }
          ].map((s, i) => (
            <div key={i} className="bg-zinc-900/80 border border-zinc-800/50 p-10 rounded-[2rem] backdrop-blur-2xl hover:border-red-600/30 transition-all group overflow-hidden relative shadow-2xl">
              <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Activity size={100} />
              </div>
              <h4 className="text-zinc-600 text-[10px] uppercase tracking-[0.4em] mb-4 font-mono font-bold">{s.label}</h4>
              <p className={`text-6xl font-black italic tracking-tighter ${s.color}`}>{s.val}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. ABOUT */}
      <section id="about" className="py-40 px-6">
        <div className="container mx-auto">
          <div className="max-w-4xl mb-24">
            <h2 className="text-red-600 font-mono text-[10px] tracking-[0.8em] uppercase mb-6 flex items-center gap-4 text-balance">
              <span className="w-12 h-[1px] bg-red-600"></span> // THE BANDIT DOCTRINE
            </h2>
            <h3 className="text-6xl md:text-8xl font-black uppercase tracking-tighter leading-[0.85] italic">
              WE DON'T <span className="text-zinc-800">PLAY.</span> <br/>
              WE <span className="text-red-600">EXECUTE.</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-7 bg-zinc-900/30 border border-zinc-800 p-16 rounded-[3rem] group hover:bg-zinc-900/50 transition-all">
              <ShieldCheck size={50} className="text-red-600 mb-10" />
              <h4 className="text-4xl font-black uppercase italic mb-6">GHOST PROTOCOL</h4>
              <p className="text-zinc-500 text-xl leading-relaxed font-medium">Data lu adalah aset rahasia. Begitu misi selesai, semua jejak digital dihapus total. Tanpa sisa, tanpa risiko.</p>
            </div>
            <div className="md:col-span-5 bg-red-600 p-16 rounded-[3rem] text-white flex flex-col justify-between group hover:shadow-[0_0_50px_rgba(220,38,38,0.2)] transition-all">
              <Zap size={60} fill="white" className="animate-bounce" />
              <h4 className="text-5xl font-black uppercase italic leading-none mt-20">BLITZ <br/>KRIEG</h4>
            </div>
          </div>
        </div>
      </section>

      {/* 4. TRACKING SYSTEM */}
      <section className="py-24 px-6 relative">
        <div className="container mx-auto max-w-5xl">
          <div className="bg-[#0a0a0a] border border-zinc-800 p-8 md:p-20 rounded-[4rem] shadow-3xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none">
              <Terminal size={150} />
            </div>
            <div className="text-center mb-16 relative z-10">
               <h2 className="text-5xl font-black mb-4 tracking-tighter uppercase italic">MISSION <span className="text-red-600">RADAR</span></h2>
               <p className="text-zinc-600 font-mono text-[10px] tracking-widest uppercase">Input tactical ID to scan progress</p>
            </div>
            <div className="flex flex-col md:flex-row gap-3 max-w-3xl mx-auto relative z-10">
              <input 
                type="text" 
                placeholder="COMMAND ID (BND-XXXX)" 
                className="flex-1 bg-black border border-zinc-800 p-6 rounded-3xl outline-none focus:border-red-600 transition-all text-2xl font-mono text-red-600 placeholder:text-zinc-800 shadow-inner"
                value={orderId} 
                onChange={(e)=>setOrderId(e.target.value.toUpperCase())} 
              />
              <button onClick={handleTrack} className="bg-red-600 hover:bg-white hover:text-black text-white font-black px-12 py-6 rounded-3xl transition-all flex items-center justify-center gap-3 shadow-lg">
                {loading ? <Loader2 className="animate-spin" /> : <Target size={28} />}
                <span className="text-xl italic uppercase">SCAN</span>
              </button>
            </div>

            {trackData && (
              <div className="mt-16 p-10 bg-zinc-900/50 border border-red-600/20 rounded-[2.5rem] animate-in fade-in zoom-in duration-500">
                <div className="flex flex-col md:flex-row justify-between items-center md:items-end mb-10 gap-6">
                   <div className="text-center md:text-left">
                      <p className="text-red-600 font-mono text-[10px] tracking-[0.5em] uppercase mb-3">Target Confirmed</p>
                      <h3 className="text-4xl font-black uppercase italic tracking-tighter">{trackData.project_name}</h3>
                   </div>
                   <p className="text-8xl font-black text-red-600 italic drop-shadow-[0_0_30px_rgba(220,38,38,0.4)]">{trackData.progress}%</p>
                </div>
                <div className="w-full bg-black h-4 rounded-full overflow-hidden border border-zinc-800 p-1">
                  <div className="bg-red-600 h-full rounded-full transition-all duration-1000" style={{width: `${trackData.progress}%`}}></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 5. PORTFOLIO - HEIST ARCHIVES (IMAGE-FREE VERSION) */}
      <section id="portfolio" className="py-40 px-6 bg-[#030303]">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-24 gap-8 border-b border-zinc-900 pb-12">
            <h2 className="text-7xl font-black uppercase tracking-tighter italic leading-none">HEIST <br/><span className="text-red-600 text-6xl md:text-7xl">ARCHIVES</span></h2>
            <p className="text-zinc-700 max-w-[250px] text-right font-mono text-[9px] tracking-[0.3em] uppercase leading-relaxed italic">Synchronized with Mainframe DB.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {articles.length > 0 ? articles.map((art: any, index: number) => (
              <div key={art.id || index} className="group relative p-12 bg-zinc-950 border border-zinc-900 rounded-[3rem] hover:border-red-600 transition-all duration-500 overflow-hidden min-h-[350px] flex flex-col justify-between">
                {/* Decorative ID background */}
                <div className="absolute -right-6 -top-10 text-[12rem] font-black text-white/[0.02] italic pointer-events-none group-hover:text-red-600/[0.05] transition-colors">
                  {index + 1}
                </div>
                
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse shadow-[0_0_10px_#dc2626]"></div>
                    <p className="text-red-600 font-mono text-sm uppercase tracking-[0.6em] font-bold">
                      // {art.order_id || "BND-UNKNWN"}
                    </p>
                  </div>
                  <h3 className="text-5xl md:text-6xl font-black uppercase italic tracking-tighter leading-none group-hover:text-red-600 transition-colors">
                    {art.project_name}
                  </h3>
                </div>

                <div className="relative z-10 mt-12">
                   <div className="flex justify-between items-center mb-4">
                      <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Operation Progress</span>
                      <span className="text-xl font-black italic">{art.progress}%</span>
                   </div>
                   <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden">
                      <div className="h-full bg-red-600 transition-all duration-1000 group-hover:shadow-[0_0_15px_#dc2626]" style={{width: `${art.progress}%`}}></div>
                   </div>
                </div>
              </div>
            )) : (
              [1, 2].map((i) => (
                <div key={i} className="min-h-[350px] bg-zinc-950 border border-zinc-900 rounded-[3rem] flex items-center justify-center italic text-zinc-800 font-black">
                  WAITING FOR UPLINK...
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* 6. CONTACT */}
      <section id="contact" className="py-40 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-24">
            <div>
              <h2 className="text-8xl font-black uppercase tracking-tighter mb-12 leading-none italic">NEED A <br/> <span className="text-red-600 text-7xl">HIRE?</span></h2>
              <p className="text-zinc-500 text-2xl mb-16 leading-relaxed font-medium">Bicarakan misi lu. Team Bandit siap melakukan infiltrasi dan memberikan hasil terbaik secara instan.</p>
              <div className="space-y-8">
                <div className="flex items-center gap-6 text-zinc-400 hover:text-red-600 transition cursor-pointer group">
                  <div className="bg-zinc-900 p-5 rounded-[1.5rem] group-hover:bg-red-600 group-hover:text-white transition-all border border-zinc-800"><Mail /></div>
                  <span className="text-xl font-black italic uppercase tracking-tighter">ops@teambandit.io</span>
                </div>
              </div>
            </div>
            
            <div className="bg-red-600 p-16 rounded-[4rem] flex flex-col justify-center text-center relative overflow-hidden group">
              <Rocket size={100} className="mx-auto text-white mb-10 group-hover:-translate-y-4 transition-transform duration-700" />
              <h3 className="text-5xl font-black mb-6 uppercase italic tracking-tighter leading-none">JOIN THE <br/> HEIST.</h3>
              <a href="https://wa.me/6281234567890" target="_blank" className="bg-black text-white py-8 rounded-[2.5rem] font-black text-3xl hover:bg-white hover:text-black transition-all flex items-center justify-center gap-4 uppercase italic">
                CONTACT WHATSAPP <ArrowRight />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-24 px-6 border-t border-zinc-900 text-center bg-black">
          <p className="text-zinc-800 text-[10px] tracking-[2em] uppercase font-mono font-bold">© 2026 TEAM BANDIT // NO LIMITS NO RULES</p>
      </footer>

    </main>
  );
}