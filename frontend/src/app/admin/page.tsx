"use client";
import { useState, useEffect, useCallback } from 'react';
import { RefreshCcw, Eye, Plus, Loader2, Skull, Terminal, Zap, Activity, ShieldAlert, Database, CheckCircle2 } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function BanditDashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [form, setForm] = useState({ order_id: '', project_name: '', progress: 0, status: 'Active' });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const fetchOrders = useCallback(async () => {
    setFetching(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/orders?t=${Date.now()}`);
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("DATABASE OFFLINE");
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleSave = async () => {
    if (!form.order_id.trim() || !form.project_name.trim()) {
      return alert("MISSION ID & NAME REQUIRED!");
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, status: form.progress === 100 ? 'Completed' : 'Active' })
      });
      if (res.ok) {
        setForm({ order_id: '', project_name: '', progress: 0, status: 'Active' });
        fetchOrders();
      }
    } catch (e) {
      alert("CONNECTION LOST");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickComplete = async (order: any) => {
    setFetching(true);
    try {
      const res = await fetch(`${API_URL}/api/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...order, progress: 100, status: 'Completed' })
      });
      if (res.ok) fetchOrders();
    } catch (e) {
      alert("FAILED");
    } finally {
      setFetching(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 p-4 md:p-10 font-sans selection:bg-red-600 selection:text-white overflow-x-hidden">
      {/* BACKGROUND: Disederhanakan (Hapus Radial Gradient Berat) */}
      <div className="fixed inset-0 bg-[#050505] z-[-1]"></div>
      
      <div className="max-w-6xl mx-auto relative z-10">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
          <div>
            <div className="flex items-center gap-2 text-red-600 mb-2">
              <ShieldAlert size={16} className="animate-pulse" />
              <span className="text-[10px] font-mono tracking-[0.4em] uppercase font-bold">Admin Level Access</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter uppercase leading-none">
              MISSION <span className="text-red-600">COMMAND</span>
            </h1>
          </div>
          
          <button onClick={fetchOrders} className="group flex items-center gap-3 px-6 py-3 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-red-600 transition-colors active:scale-95">
            <RefreshCcw size={18} className={`${fetching ? 'animate-spin' : ''}`} />
            <span className="text-[10px] font-black font-mono tracking-widest uppercase">Sync</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT: FORM (Solid Background) */}
          <div className="lg:col-span-4">
            <div className="bg-[#0c0c0c] p-8 rounded-3xl border border-zinc-900 sticky top-8">
              <div className="flex items-center gap-3 mb-8 border-b border-zinc-900 pb-4">
                <Terminal size={18} className="text-red-600"/>
                <h2 className="text-xs font-black uppercase tracking-widest italic">Input Mission</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[9px] uppercase font-mono text-zinc-600 tracking-widest mb-2 block">ID</label>
                  <input value={form.order_id} onChange={e => setForm({...form, order_id: e.target.value.toUpperCase()})} placeholder="BND-XXXX" className="w-full bg-black border border-zinc-800 p-4 rounded-xl outline-none focus:border-red-600 font-mono text-red-500 text-lg transition-all" />
                </div>

                <div>
                  <label className="text-[9px] uppercase font-mono text-zinc-600 tracking-widest mb-2 block">Name</label>
                  <input value={form.project_name} onChange={e => setForm({...form, project_name: e.target.value})} placeholder="Project X" className="w-full bg-black border border-zinc-800 p-4 rounded-xl outline-none focus:border-red-600 transition-all font-bold uppercase italic text-sm" />
                </div>

                <div>
                  <div className="flex justify-between text-[9px] font-mono text-zinc-500 mb-3 uppercase tracking-widest">
                    <span>Progress</span>
                    <span className="text-red-600 font-black">{form.progress}%</span>
                  </div>
                  <input type="range" className="w-full accent-red-600 h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer" value={form.progress} onChange={e => setForm({...form, progress: parseInt(e.target.value)})} />
                </div>

                <button onClick={handleSave} disabled={loading} className="w-full bg-red-600 text-white font-black py-4 rounded-2xl hover:bg-white hover:text-black transition-all flex items-center justify-center gap-2 active:scale-95 uppercase italic text-sm">
                  {loading ? <Loader2 className="animate-spin" /> : <><Plus size={20} /> Deploy</>}
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: DATA LIST (Optimized Content Visibility) */}
          <div className="lg:col-span-8">
            <div className="bg-[#0c0c0c] rounded-3xl border border-zinc-900 overflow-hidden">
              <div className="p-6 border-b border-zinc-900 flex items-center justify-between bg-black/20">
                <div className="flex items-center gap-2">
                  <Database size={14} className="text-zinc-600" />
                  <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-500">Live Records</span>
                </div>
                <span className="text-[9px] font-mono text-red-600 uppercase font-bold">{orders.length} Active</span>
              </div>

              {/* OPTIMASI: Content-visibility:auto bikin browser gak ngerender yang di luar layar */}
              <div className="overflow-x-auto" style={{ contentVisibility: 'auto' }}>
                <table className="w-full text-left border-collapse">
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.order_id} className="border-b border-zinc-900/50 hover:bg-zinc-900/30 transition-colors">
                        <td className="px-6 py-8">
                          <span className="font-mono text-2xl font-black text-zinc-800 italic group-hover:text-red-600 transition-colors">{o.order_id}</span>
                        </td>
                        <td className="px-6 py-8">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="text-sm font-black uppercase italic text-zinc-300">{o.project_name}</div>
                            {o.progress === 100 && <CheckCircle2 size={14} className="text-green-500" />}
                          </div>
                          <div className="flex items-center gap-4">
                             <div className="flex-1 h-1 bg-zinc-900 rounded-full overflow-hidden">
                                <div className={`h-full transition-all duration-500 ${o.progress === 100 ? 'bg-green-500' : 'bg-red-600'}`} style={{width: `${o.progress}%`}}></div>
                             </div>
                             <span className="font-mono text-[9px] text-zinc-600">{o.progress}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-8 text-right">
                          <div className="flex justify-end gap-2">
                            {o.progress < 100 && (
                                <button onClick={() => handleQuickComplete(o)} className="flex items-center gap-2 px-3 py-2 bg-black border border-green-900/30 text-green-500 rounded-lg hover:bg-green-600 hover:text-white transition-all text-[9px] font-mono uppercase font-black">
                                  Complete
                                </button>
                            )}
                            <button onClick={() => {setForm(o); window.scrollTo({top:0, behavior:'smooth'})}} className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-400 transition-all">
                              <Eye size={16}/>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {orders.length === 0 && !fetching && (
                  <div className="py-20 text-center opacity-20">
                    <Skull size={40} className="mx-auto mb-4" />
                    <p className="font-mono text-[9px] uppercase tracking-[1em]">Empty</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <footer className="max-w-6xl mx-auto mt-16 pb-10 border-t border-zinc-900 pt-8 flex justify-between items-center opacity-50">
        <span className="text-[9px] font-mono uppercase tracking-widest">Operator: Bandit_01</span>
        <div className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-widest">
          <Activity size={10} className="text-red-600" /> Secure
        </div>
      </footer>
    </div>
  );
}