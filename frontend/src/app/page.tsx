"use client";
import { useEffect, useState } from 'react';
import HeroSequence from '@/components/HeroSequence';
import Lenis from '@studio-freight/lenis';
import { 
  Loader2, Rocket, ShieldCheck, Zap, 
  Skull, Target, User, 
  CheckCircle2, Instagram, Twitter, Github 
} from 'lucide-react';

const PriceCard = ({ title, price, features }: any) => (
  <div className="group relative p-8 bg-zinc-900/50 border border-zinc-800 rounded-[2.5rem] hover:border-red-600 transition-all duration-500 overflow-hidden">
    <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-20 transition-opacity">
      <Skull size={100} />
    </div>
    <h3 className="text-red-600 font-mono text-[10px] tracking-widest uppercase mb-4 font-bold">{title}</h3>
    <p className="text-4xl font-black italic mb-6 tracking-tighter">{price}</p>
    <ul className="space-y-3 mb-8">
      {features.map((f: string, i: number) => (
        <li key={i} className="flex items-center gap-3 text-zinc-400 text-sm">
          <CheckCircle2 size={16} className="text-red-600" /> {f}
        </li>
      ))}
    </ul>
    <a href="#order" className="block text-center py-4 bg-zinc-800 group-hover:bg-red-600 text-white font-black rounded-2xl transition-all uppercase italic text-sm">Pilih Misi</a>
  </div>
);

export default function Home() {
  const [orderId, setOrderId] = useState('');
  const [trackData, setTrackData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    package: 'PILIH PAKET MISI',
    details: ''
  });

  useEffect(() => {
    const lenis = new Lenis();
    function raf(time: number) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
  }, []);

  // --- 1. RADAR MISI (FIXED) ---
  const handleTrack = async () => {
    if(!orderId) return;
    setLoading(true);
    try {
      const res = await fetch('/api/track', { cache: 'no-store' });
      const allData = await res.json();
      const match = allData.find((item: any) => item.order_id === orderId);
      
      if (match) {
        setTrackData(match);
      } else {
        alert("ID TIDAK DITEMUKAN!");
        setTrackData(null);
      }
    } catch {
      alert("RADAR OFFLINE!");
    } finally { setLoading(false); }
  };

  // --- 2. DEPLOY MISI (FIXED UPLINK) ---
  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.package === 'PILIH PAKET MISI') return alert('Pilih Paket Misi!');
    
    setLoading(true);
    const generatedId = `BND-${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      const res = await fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: generatedId,
          project_name: `${formData.name.toUpperCase()} - ${formData.package}`,
          progress: 15,
          status: 'Active'
        })
      });

      if (res.ok) {
        alert(`AGENT TERDEPLOY! ID: ${generatedId}`);
      }
    } catch (err) {
      console.error("Dashboard link failed.");
    }

    const whatsappMessage = `*MISI DIKIRIM!*%0A%0A*ID:* ${generatedId}%0A*Nama:* ${formData.name}%0A*Paket:* ${formData.package}%0A*Detail:* ${formData.details}`;
    window.open(`https://wa.me/6285710821547?text=${whatsappMessage}`, '_blank');
    setLoading(false);
  };

  return (
    <main className="bg-[#050505] text-white font-sans selection:bg-red-600 selection:text-white overflow-x-hidden">
      <section id="home" className="relative min-h-[100vh] flex items-center justify-center pt-20">
        <div className="absolute inset-0 z-0 opacity-40"><HeroSequence /></div>
        <div className="relative z-10 text-center px-4 w-full">
          <h1 className="text-6xl md:text-[9rem] font-black italic tracking-tighter leading-[0.85] uppercase mb-8">
            BANDIT <br className="md:hidden" /> <span className="text-red-600">JOKI.</span>
          </h1>
          <p className="max-w-2xl mx-auto text-zinc-400 text-base md:text-xl font-medium mb-12 px-6">
            Hancurkan batas akademik lu. Kami melakukan eksekusi strategis dengan presisi tinggi.
          </p>
          <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
            <a href="#order" className="w-[80%] md:w-auto bg-red-600 text-white px-10 py-5 rounded-2xl font-black italic uppercase tracking-tighter text-lg shadow-[0_0_30px_rgba(220,38,38,0.3)]">Mulai Misi</a>
            <a href="#paket" className="w-[80%] md:w-auto bg-zinc-900/50 border border-zinc-800 px-10 py-5 rounded-2xl font-black italic uppercase tracking-tighter text-lg">Lihat Taktik</a>
          </div>
        </div>
      </section>

      <section className="relative z-20 -mt-10 px-6">
        <div className="container mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {[{ label: "MISI SELESAI", val: "1.2K+", color: "text-red-600" }, { label: "EXTRACTION RATE", val: "100%", color: "text-white" }, { label: "OPERASIONAL", val: "24/7", color: "text-red-600" }].map((s, i) => (
            <div key={i} className="bg-zinc-900/90 border border-zinc-800/50 p-10 rounded-[3rem] backdrop-blur-3xl hover:border-red-600/30 transition-all">
              <h4 className="text-zinc-600 text-[10px] uppercase tracking-[0.4em] mb-4 font-mono font-bold">{s.label}</h4>
              <p className={`text-5xl md:text-6xl font-black italic tracking-tighter ${s.color}`}>{s.val}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="about" className="py-24 px-6">
        <div className="container mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div>
              <h2 className="text-red-600 font-mono text-[10px] tracking-[0.8em] uppercase mb-8"> // DOKTRIN KAMI</h2>
              <h3 className="text-5xl md:text-8xl font-black uppercase tracking-tighter italic leading-[0.9] mb-10">BANDIT <span className="text-red-600 text-outline">TEAM</span></h3>
              <p className="text-zinc-400 text-lg leading-relaxed mb-12">Kami adalah kolektif spesialis akademik. Kami memahami bahwa waktu adalah aset paling berharga lu.</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-6 bg-zinc-900/50 rounded-3xl border border-zinc-800"><ShieldCheck className="text-red-600 mb-2" /><p className="font-bold uppercase text-xs">100% Aman</p></div>
                <div className="p-6 bg-zinc-900/50 rounded-3xl border border-zinc-800"><Zap className="text-red-600 mb-2" /><p className="font-bold uppercase text-xs">Kilat</p></div>
              </div>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-[4rem] space-y-8">
               <h4 className="text-red-600 font-mono text-[10px] font-bold tracking-widest uppercase mb-4">AGENT PROFILES</h4>
               {[{name: "Ugroseno Dwi P", role: "Fullstack Developer"}, {name: "Rudilou Tiwon", role: "Technical Specialist"}, {name: "Tengku Erlangga", role: "Mobile Expert"}].map((agent, i) => (
                 <div key={i} className="flex items-center gap-6">
                   <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center"><User /></div>
                   <div><p className="text-xl font-black uppercase italic tracking-tighter">{agent.name}</p><p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">{agent.role}</p></div>
                 </div>
               ))}
            </div>
          </div>
        </div>
      </section>

      <section id="paket" className="py-24 px-6 bg-zinc-950/50">
        <div className="container mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <PriceCard title="Infiltrator" price="25K" features={["Tugas Umum", "3-5 Hari", "Standard"]} />
          <PriceCard title="Commando" price="60K" features={["Coding/Desain", "24-48 Jam", "Prioritas"]} />
          <PriceCard title="Overlord" price="Custom" features={["Skripsi/Final Project", "Full Bimbingan"]} />
        </div>
      </section>

      <section className="py-24 px-6">
        <div className="container mx-auto max-w-5xl bg-zinc-900/20 border border-zinc-800 p-8 md:p-20 rounded-[4rem]">
          <h2 className="text-center text-4xl md:text-7xl font-black mb-12 italic uppercase tracking-tighter">RADAR <span className="text-red-600">MISI</span></h2>
          <div className="flex flex-col md:flex-row gap-4">
            <input type="text" placeholder="ID (BND-XXXX)" className="flex-1 bg-black border border-zinc-800 p-6 rounded-2xl font-mono text-red-600 outline-none focus:border-red-600" value={orderId} onChange={(e)=>setOrderId(e.target.value.toUpperCase())} />
            <button onClick={handleTrack} className="bg-red-600 px-10 py-6 rounded-2xl font-black italic flex items-center justify-center gap-3">
              {loading ? <Loader2 className="animate-spin" /> : <Target />} SCAN
            </button>
          </div>
          {trackData && (
            <div className="mt-12 p-8 bg-black/50 border border-red-600/20 rounded-[2.5rem] animate-in fade-in zoom-in duration-500">
              <div className="flex justify-between items-end mb-4">
                <h4 className="text-2xl font-black italic uppercase">{trackData.project_name}</h4>
                <span className="text-5xl font-black text-red-600 italic leading-none">{trackData.progress}%</span>
              </div>
              <div className="w-full bg-zinc-900 h-3 rounded-full overflow-hidden border border-zinc-800">
                <div className="bg-red-600 h-full transition-all duration-1000" style={{width: `${trackData.progress}%`}}></div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section id="order" className="py-24 px-6">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-center text-5xl md:text-8xl font-black mb-16 italic uppercase tracking-tighter leading-none">LUNCURKAN <span className="text-red-600">MISI</span></h2>
          <form className="space-y-4" onSubmit={handleDeploy}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input required placeholder="NAMA KODE" className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl outline-none focus:border-red-600" onChange={(e) => setFormData({...formData, name: e.target.value})} />
              <input required placeholder="KONTAK" className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl outline-none focus:border-red-600" onChange={(e) => setFormData({...formData, contact: e.target.value})} />
            </div>
            <select className="w-full bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl outline-none focus:border-red-600 text-zinc-500" onChange={(e) => setFormData({...formData, package: e.target.value})}>
              <option>PILIH PAKET MISI</option>
              <option value="INFILTRATOR">INFILTRATOR (TUGAS UMUM)</option>
              <option value="COMMANDO">COMMANDO (CODING / DESAIN)</option>
              <option value="OVERLORD">OVERLORD (SKRIPSI / FINAL)</option>
            </select>
            <textarea required placeholder="DETAIL MISI" className="w-full bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl h-40 outline-none focus:border-red-600 resize-none" onChange={(e) => setFormData({...formData, details: e.target.value})}></textarea>
            <button type="submit" className="w-full py-8 bg-red-600 text-white font-black text-2xl rounded-2xl hover:bg-white hover:text-black transition-all flex items-center justify-center gap-4">
              {loading ? 'MENGIRIM...' : 'DEPLOY AGENT'} <Rocket />
            </button>
          </form>
        </div>
      </section>

      <footer className="py-20 px-6 border-t border-white/5 text-center bg-black">
        <div className="flex justify-center gap-10 mb-10 text-zinc-500">
          <Instagram className="hover:text-red-600 cursor-pointer transition-colors" /> <Twitter className="hover:text-red-600 cursor-pointer transition-colors" /> <Github className="hover:text-red-600 cursor-pointer transition-colors" />
        </div>
        <p className="text-zinc-800 text-[10px] tracking-[1em] font-mono font-bold uppercase">© 2026 BANDIT JOKI // NO LIMITS NO RULES</p>
      </footer>
    </main>
  );
}