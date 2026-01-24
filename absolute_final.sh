#!/bin/bash

echo "💀 X-SYSTEM: INITIATING ABSOLUTE FINAL BUILD... 10000% READY! 💀"

# --- 1. SETUP BACKEND (THE CORE) ---
mkdir -p backend/src
cd backend
npm init -y --quiet
npm install express cors dotenv sqlite3 sqlite --quiet

cat <<EOF > src/server.js
const express = require('express');
const cors = require('cors');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');

const app = express();
app.use(cors());
app.use(express.json());

let db;
(async () => {
    db = await open({ filename: './database.sqlite', driver: sqlite3.Database });
    await db.exec("CREATE TABLE IF NOT EXISTS articles (id INTEGER PRIMARY KEY, title TEXT, category TEXT, content TEXT, image TEXT)");
    await db.exec("CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id TEXT UNIQUE, client_name TEXT, project_name TEXT, progress INTEGER, status TEXT)");
    
    const artCount = await db.get("SELECT COUNT(*) as count FROM articles");
    if (artCount.count === 0) {
        await db.run("INSERT INTO articles (title, category, content, image) VALUES ('Reality Hacking 101', 'CODE', 'Cara memanipulasi sistem...', 'https://picsum.photos/800/600?1')");
        await db.run("INSERT INTO articles (title, category, content, image) VALUES ('Next-Gen Tech', 'DEV', 'Masa depan coding...', 'https://picsum.photos/800/600?2')");
    }
    
    const orderCount = await db.get("SELECT COUNT(*) as count FROM orders");
    if (orderCount.count === 0) {
        await db.run("INSERT INTO orders (order_id, client_name, project_name, progress, status) VALUES ('JK-001', 'Seno', 'AI Reality App', 85, 'On Progress')");
    }
})();

app.get('/api/articles', async (req, res) => { res.json(await db.all("SELECT * FROM articles")); });
app.get('/api/track/:id', async (req, res) => {
    const order = await db.get("SELECT * FROM orders WHERE order_id = ?", [req.params.id]);
    if (order) res.json(order); else res.status(404).json({ error: "Gak Ketemu!" });
});

app.listen(5000, () => console.log('🔥 Backend 100% Ready: http://localhost:5000'));
EOF
cd ..

# --- 2. SETUP FRONTEND (THE FACE) ---
npx create-next-app@latest frontend --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --quiet
cd frontend
npm install gsap @studio-freight/lenis lucide-react --quiet

# INJECT IMAGE SEQUENCE ENGINE
mkdir -p src/components
cat <<EOF > src/components/HeroSequence.tsx
"use client";
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function HeroSequence() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    canvas.width = 1158; canvas.height = 770;

    const frameCount = 60;
    const currentFrame = (index: number) => \`https://www.apple.com/105/main/default/explore/product/apple-watch-ultra-2/images/anim/hero/large/\${(index + 1).toString().padStart(4, '0')}.jpg\`;

    const images: HTMLImageElement[] = [];
    const airpods = { frame: 0 };

    for (let i = 0; i < frameCount; i++) {
      const img = new Image(); img.src = currentFrame(i); images.push(img);
    }

    gsap.to(airpods, {
      frame: frameCount - 1, snap: "frame", ease: "none",
      scrollTrigger: { trigger: sectionRef.current, start: "top top", end: "+=200%", scrub: 0.5, pin: true },
      onUpdate: () => {
        if (context) {
          context.clearRect(0, 0, canvas.width, canvas.height);
          context.drawImage(images[airpods.frame], 0, 0, canvas.width, canvas.height);
        }
      }
    });
  }, []);

  return (
    <div ref={sectionRef} className="h-screen bg-black relative">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-10 pointer-events-none">
        <h1 className="text-[12vw] font-black uppercase tracking-tighter mix-blend-difference">SENO ELITE</h1>
        <p className="text-zinc-400 tracking-[1em] text-sm md:text-xl">SCROLL TO REVEAL POWER</p>
      </div>
    </div>
  );
}
EOF

# PAGE UTAMA (Landing + Tracking + Articles)
cat <<EOF > src/app/page.tsx
"use client";
import { useEffect, useState } from 'react';
import HeroSequence from '@/components/HeroSequence';
import Lenis from '@studio-freight/lenis';
import { Search, Loader2 } from 'lucide-react';

export default function Home() {
  const [articles, setArticles] = useState([]);
  const [orderId, setOrderId] = useState('');
  const [trackData, setTrackData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const lenis = new Lenis();
    function raf(time: number) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);

    fetch('http://localhost:5000/api/articles').then(res => res.json()).then(setArticles);
  }, []);

  const handleTrack = async () => {
    setLoading(true);
    const res = await fetch(\`http://localhost:5000/api/track/\${orderId}\`);
    if (res.ok) setTrackData(await res.json());
    else alert("Order ID Salah!");
    setLoading(false);
  };

  return (
    <main className="bg-black text-white">
      <HeroSequence />

      <section className="bg-white text-black py-20 px-6 rounded-t-[60px] relative z-20">
        <div className="container mx-auto">
          {/* TRACKING SYSTEM */}
          <div className="max-w-xl mx-auto mb-32 bg-zinc-100 p-10 rounded-[40px] shadow-xl">
             <h2 className="text-4xl font-black mb-6 uppercase tracking-tight">Cek Progres Joki 💀</h2>
             <div className="flex gap-2">
                <input type="text" placeholder="Masukkan ID Order (JK-001)" className="flex-1 p-4 rounded-2xl border-2 border-zinc-300 focus:border-black outline-none" value={orderId} onChange={(e)=>setOrderId(e.target.value)} />
                <button onClick={handleTrack} className="bg-black text-white p-4 rounded-2xl">{loading ? <Loader2 className="animate-spin" /> : <Search />}</button>
             </div>
             {trackData && (
                <div className="mt-8 p-6 bg-white rounded-3xl border-2 border-black animate-bounce-short">
                    <p className="font-bold uppercase text-xs text-zinc-400">Project: {trackData.project_name}</p>
                    <div className="h-4 bg-zinc-200 rounded-full mt-4 overflow-hidden">
                        <div className="bg-red-600 h-full transition-all duration-1000" style={{width: \`\${trackData.progress}%\`}}></div>
                    </div>
                    <p className="mt-2 font-black text-right">{trackData.progress}% DONE</p>
                    <p className="mt-4 bg-black text-white text-center py-2 rounded-xl text-sm font-bold uppercase">{trackData.status}</p>
                </div>
             )}
          </div>

          <h2 className="text-7xl font-black mb-16 uppercase italic tracking-tighter">Selected Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {articles.map((art: any) => (
              <div key={art.id} className="group">
                <img src={art.image} className="w-full aspect-video object-cover rounded-3xl mb-6 grayscale group-hover:grayscale-0 transition-all duration-500" />
                <h3 className="text-3xl font-black uppercase">{art.title}</h3>
                <p className="text-zinc-500 italic">#{art.category}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHATSAPP FINAL */}
      <a href="https://wa.me/6281234567890?text=Halo%20Seno%2C%20mau%20konsultasi%20order%20joki!" className="fixed bottom-10 right-10 z-50 bg-green-500 text-white px-10 py-5 rounded-full font-black text-xl shadow-2xl hover:scale-110 transition active:scale-95">
        CHAT SENO SEKARANG 💀
      </a>
    </main>
  );
}
EOF
cd ..

echo "💀 X-SYSTEM: INJECTION 10000% SUCCESSFUL!"
echo "👉 TAB 1: cd backend && node src/server.js"
echo "👉 TAB 2: cd frontend && npm run dev"