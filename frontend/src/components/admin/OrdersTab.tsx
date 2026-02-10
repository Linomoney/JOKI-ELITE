"use client";
import { useState, useEffect, useMemo } from "react";
import { 
  Terminal, Plus, Loader2, Database, CheckCircle2, Eye, 
  ChevronLeft, ChevronRight, Search, User, ChevronDown,
  Filter, X, Radio, Clock, Zap
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { usePagination } from "@/hooks/usePagination";

interface OrdersTabProps {
  orders: any[];
  users: any[];
  onRefresh: () => void;
}

export default function OrdersTab({ orders, users, onRefresh }: OrdersTabProps) {
  const [form, setForm] = useState({
    id: "",
    project_name: "",
    progress: 0,
    status: "processing",
    user_id: "",
    client_name: "",
    client_contact: "",
  });
  const [loading, setLoading] = useState(false);
  const [quickCompleting, setQuickCompleting] = useState<string | null>(null);
  
  // State untuk search dan filter
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [clientSearch, setClientSearch] = useState("");
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  // TAMBAH: Local state untuk real-time
  const [localOrders, setLocalOrders] = useState<any[]>(orders);
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  // Sync dengan props orders
  useEffect(() => {
    setLocalOrders(orders);
  }, [orders]);

  // REAL-TIME SUBSCRIPTION UNTUK ORDERS
  useEffect(() => {
    console.log("📦 Setting up real-time subscription for orders...");

    const channel = supabase
      .channel('orders-realtime-tab')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('📦 Order real-time update:', payload);
          
          setLocalOrders(prev => {
            if (payload.eventType === 'INSERT') {
              return [payload.new, ...prev];
            } else if (payload.eventType === 'UPDATE') {
              return prev.map(item =>
                item.id === payload.new.id ? payload.new : item
              );
            } else if (payload.eventType === 'DELETE') {
              return prev.filter(item => item.id !== payload.old.id);
            }
            return prev;
          });
        }
      )
      .subscribe((status) => {
        console.log('📦 Order subscription status:', status);
        setRealtimeConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
      console.log("🧹 Cleanup order subscription");
    };
  }, []);

  // Filter orders berdasarkan search term dan status
  const filteredOrders = useMemo(() => {
    let filtered = localOrders; // Ganti orders dengan localOrders
    
    // Filter berdasarkan search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(order => 
        order.order_code?.toLowerCase().includes(term) ||
        order.project_name?.toLowerCase().includes(term) ||
        order.client_name?.toLowerCase().includes(term) ||
        order.client_email?.toLowerCase().includes(term) ||
        order.id?.toLowerCase().includes(term)
      );
    }
    
    // Filter berdasarkan status
    if (statusFilter !== "all") {
      if (statusFilter === "completed") {
        filtered = filtered.filter(order => order.progress === 100);
      } else if (statusFilter === "active") {
        filtered = filtered.filter(order => order.progress < 100 && order.progress > 0);
      } else if (statusFilter === "pending") {
        filtered = filtered.filter(order => order.progress === 0);
      }
    }
    
    return filtered;
  }, [localOrders, searchTerm, statusFilter]);

  const pagination = usePagination(filteredOrders, 10);

  // Filter clients untuk dropdown
  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) {
      return users.filter(u => u.role === "client");
    }
    
    const search = clientSearch.toLowerCase();
    return users.filter(u => 
      u.role === "client" && (
        u.full_name?.toLowerCase().includes(search) ||
        u.email?.toLowerCase().includes(search) ||
        u.phone?.includes(search)
      )
    );
  }, [users, clientSearch]);

  const handleSaveOrder = async () => {
    if (!form.id.trim() || !form.project_name.trim() || !form.user_id) {
      alert("ORDER ID, PROJECT NAME & USER ID WAJIB DIISI!");
      return;
    }

    setLoading(true);
    try {
      const { data: userData } = await supabase
        .from("user_profiles")
        .select("full_name, email, phone")
        .eq("id", form.user_id)
        .single();

      const orderCode = form.id.includes("BND-") ? form.id : `BND-${form.id}`;

      const orderData = {
        id: form.id,
        order_code: orderCode,
        project_name: form.project_name,
        progress: form.progress,
        status: form.progress === 100 ? "completed" : "processing",
        user_id: form.user_id,
        client_name: userData?.full_name || "",
        client_contact: userData?.email || "",
        client_email: userData?.email || "",
        package_price: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await supabase.from("orders").upsert(orderData, { onConflict: "id" });

      // Update local state langsung untuk feedback cepat
      const existingIndex = localOrders.findIndex(o => o.id === form.id);
      if (existingIndex >= 0) {
        // Update existing
        setLocalOrders(prev => 
          prev.map(order => 
            order.id === form.id 
              ? { ...order, ...orderData }
              : order
          )
        );
      } else {
        // Add new
        setLocalOrders(prev => [orderData, ...prev]);
      }

      setForm({
        id: "",
        project_name: "",
        progress: 0,
        status: "processing",
        user_id: "",
        client_name: "",
        client_contact: "",
      });

      // onRefresh(); // Optional, karena sudah real-time

    } catch (e: any) {
      console.error("Save order error:", e);
      alert("Gagal menyimpan pesanan: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickComplete = async (orderId: string) => {
    setQuickCompleting(orderId);
    try {
      await supabase
        .from("orders")
        .update({
          progress: 100,
          status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);
      
      // Update local state langsung
      setLocalOrders(prev => 
        prev.map(order => 
          order.id === orderId 
            ? { ...order, progress: 100, status: "completed", updated_at: new Date().toISOString() }
            : order
        )
      );
    } catch (e: any) {
      console.error("Quick complete error:", e);
      alert("Gagal menyelesaikan order: " + e.message);
    } finally {
      setQuickCompleting(null);
    }
  };

  const handleSelectClient = (userId: string) => {
    const selectedUser = users.find(u => u.id === userId);
    setForm({ 
      ...form, 
      user_id: userId,
      client_name: selectedUser?.full_name || "",
      client_contact: selectedUser?.email || ""
    });
    setShowClientDropdown(false);
    setClientSearch("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="grid grid-cols-1 lg:grid-cols-12 gap-6"
    >
      {/* Form Section */}
      <div className="lg:col-span-4">
        <div className="bg-[#0c0c0c] p-6 rounded-3xl border border-zinc-900 sticky top-24">
          <div className="flex items-center justify-between mb-6 border-b border-zinc-900 pb-4">
            <div className="flex items-center gap-3">
              <Terminal size={18} className="text-red-600" />
              <h2 className="text-sm font-black uppercase tracking-wider">Create/Update Order</h2>
            </div>
            
            {/* Real-time indicator */}
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${realtimeConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-[10px] text-zinc-600 font-mono">LIVE</span>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="relative">
              <input
                value={form.id}
                onChange={(e) => setForm({ ...form, id: e.target.value.toUpperCase() })}
                placeholder="ORDER ID (e.g. BND-001)"
                className="w-full bg-black border border-zinc-800 p-3 rounded-xl outline-none focus:border-red-600 font-mono text-red-500 text-sm pr-20"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="flex items-center gap-1">
                  <Radio size={12} className="text-green-500" />
                  <span className="text-[10px] text-green-500 font-mono">REAL</span>
                </div>
              </div>
            </div>
            
            <input
              value={form.project_name}
              onChange={(e) => setForm({ ...form, project_name: e.target.value })}
              placeholder="PROJECT NAME"
              className="w-full bg-black border border-zinc-800 p-3 rounded-xl outline-none focus:border-red-600 font-bold uppercase italic text-sm"
            />
            
            {/* Improved Client Selector */}
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <User size={14} className="text-zinc-500" />
                <span className="text-xs text-zinc-500 font-semibold">SELECT CLIENT</span>
                <span className="text-[10px] text-zinc-600 ml-auto">
                  {users.filter(u => u.role === "client").length} clients
                </span>
              </div>
              
              {/* Selected Client Display */}
              {form.user_id ? (
                <div className="mb-3 p-3 bg-zinc-900/50 rounded-xl border border-zinc-800">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-red-600/20 rounded-full flex items-center justify-center">
                        <User size={14} className="text-red-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">
                          {users.find(u => u.id === form.user_id)?.full_name || "Unknown"}
                        </p>
                        <p className="text-xs text-zinc-400 mt-1">
                          {users.find(u => u.id === form.user_id)?.email || "No email"}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setForm({ ...form, user_id: "", client_name: "", client_contact: "" });
                        setClientSearch("");
                      }}
                      className="p-1 hover:bg-zinc-800 rounded"
                    >
                      <X size={14} className="text-zinc-500" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowClientDropdown(!showClientDropdown)}
                  className="w-full flex items-center justify-between bg-black border border-zinc-800 p-3 rounded-xl outline-none focus:border-red-600 text-zinc-400 text-sm hover:border-zinc-700"
                >
                  <span>Select a client...</span>
                  <ChevronDown size={16} className={`transition-transform ${showClientDropdown ? 'rotate-180' : ''}`} />
                </button>
              )}

              {/* Client Dropdown */}
              <AnimatePresence>
                {showClientDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute z-10 w-full mt-2 bg-[#0c0c0c] border border-zinc-800 rounded-xl shadow-2xl max-h-64 overflow-hidden"
                  >
                    {/* Search inside dropdown */}
                    <div className="p-3 border-b border-zinc-900">
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500" />
                        <input
                          type="text"
                          value={clientSearch}
                          onChange={(e) => setClientSearch(e.target.value)}
                          placeholder="Search clients..."
                          className="w-full bg-zinc-900 border border-zinc-800 pl-9 pr-3 py-2 rounded-lg text-sm outline-none focus:border-red-600"
                          autoFocus
                        />
                      </div>
                    </div>

                    {/* Clients List */}
                    <div className="overflow-y-auto max-h-48">
                      {filteredClients.length === 0 ? (
                        <div className="p-4 text-center text-zinc-500 text-sm">
                          No clients found
                        </div>
                      ) : (
                        filteredClients.map((user) => (
                          <button
                            key={user.id}
                            onClick={() => handleSelectClient(user.id)}
                            className="w-full text-left p-3 hover:bg-zinc-900 border-b border-zinc-900 last:border-b-0 transition-colors"
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 bg-red-600/20 rounded-full flex items-center justify-center flex-shrink-0">
                                <User size={14} className="text-red-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-white truncate">
                                  {user.full_name}
                                </p>
                                <p className="text-xs text-zinc-400 truncate">
                                  {user.email}
                                </p>
                                {user.phone && (
                                  <p className="text-xs text-zinc-500 mt-1">
                                    📱 {user.phone}
                                  </p>
                                )}
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div>
              <div className="flex justify-between text-xs text-zinc-500 mb-2">
                <span>Progress</span>
                <span className="text-red-600 font-black">{form.progress}%</span>
              </div>
              <input
                type="range"
                className="w-full accent-red-600 h-2 bg-zinc-800 rounded-full appearance-none cursor-pointer"
                value={form.progress}
                onChange={(e) => setForm({ ...form, progress: parseInt(e.target.value) || 0 })}
                min="0"
                max="100"
              />
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-zinc-600">0%</span>
                <span className="text-[10px] text-zinc-600">50%</span>
                <span className="text-[10px] text-zinc-600">100%</span>
              </div>
            </div>
            
            <button
              onClick={handleSaveOrder}
              disabled={loading}
              className="w-full bg-red-600 text-white font-black py-3 rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  <Plus size={20} /> Save Order
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="lg:col-span-8">
        <div className="bg-[#0c0c0c] rounded-3xl border border-zinc-900 overflow-hidden">
          {/* Search and Filter Bar */}
          <div className="p-4 md:p-6 border-b border-zinc-900">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-zinc-500">
                <Database size={14} />
                <span className="text-xs font-mono uppercase">All Orders</span>
                {/* Real-time stats */}
                <div className="flex items-center gap-2 ml-4">
                  <div className="text-xs px-2 py-1 bg-green-600/20 text-green-500 rounded">
                    {localOrders.filter(o => o.progress === 100).length} Completed
                  </div>
                  <div className="text-xs px-2 py-1 bg-yellow-600/20 text-yellow-500 rounded">
                    {localOrders.filter(o => o.progress < 100 && o.progress > 0).length} Active
                  </div>
                  <div className="text-xs px-2 py-1 bg-red-600/20 text-red-500 rounded">
                    {localOrders.filter(o => o.progress === 0).length} Pending
                  </div>
                </div>
              </div>
              
              {/* Search and Filter Controls */}
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                {/* Search Input */}
                <div className="relative flex-1 sm:flex-none sm:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search orders..."
                    className="w-full bg-zinc-900 border border-zinc-800 pl-9 pr-3 py-2 rounded-xl text-sm outline-none focus:border-red-600"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-500 hover:text-white"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Status Filter */}
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 pl-10 pr-8 py-2 rounded-xl text-sm outline-none focus:border-red-600 appearance-none"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                  </select>
                  <Filter size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500" />
                  <ChevronDown size={12} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-500" />
                </div>
              </div>
            </div>
            
            {/* Results Summary */}
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-4">
                <span className="text-red-600 font-bold text-sm">
                  {filteredOrders.length} Orders
                </span>
                {searchTerm && (
                  <span className="text-xs text-zinc-500">
                    Searching: "{searchTerm}"
                  </span>
                )}
                {/* Real-time indicator */}
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${realtimeConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                  <span className="text-[10px] text-zinc-600 font-mono">
                    {realtimeConnected ? 'REAL-TIME ACTIVE' : 'DISCONNECTED'}
                  </span>
                </div>
              </div>
              <PaginationControls pagination={pagination} />
            </div>
          </div>
          
          <OrdersList
            orders={pagination.currentItems}
            users={users}
            onEdit={(order) => {
              setForm({
                id: order.id,
                project_name: order.project_name || "",
                progress: order.progress || 0,
                status: order.status || "processing",
                user_id: order.user_id || "",
                client_name: order.client_name || "",
                client_contact: order.client_contact || "",
              });
              // Scroll ke form
              document.querySelector('input[placeholder="ORDER ID"]')?.scrollIntoView({ 
                behavior: 'smooth',
                block: 'center'
              });
            }}
            onComplete={handleQuickComplete}
            quickCompleting={quickCompleting}
          />
          
          {filteredOrders.length === 0 && (
            <EmptyState 
              icon="📦" 
              message={searchTerm ? `No orders found for "${searchTerm}"` : "No Orders"} 
            />
          )}
        </div>
      </div>
    </motion.div>
  );
}

const OrdersList = ({ 
  orders, 
  users, 
  onEdit, 
  onComplete, 
  quickCompleting 
}: { 
  orders: any[];
  users: any[];
  onEdit: (order: any) => void;
  onComplete: (orderId: string) => void;
  quickCompleting: string | null;
}) => {
  // Get status color
  const getStatusColor = (progress: number) => {
    if (progress === 100) return "text-green-500";
    if (progress > 0) return "text-yellow-500";
    return "text-zinc-500";
  };

  const getStatusText = (progress: number) => {
    if (progress === 100) return "Completed";
    if (progress > 0) return "In Progress";
    return "Pending";
  };

  // Get user info
  const getUserInfo = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return {
      name: user?.full_name || "Unknown",
      email: user?.email || "No email",
      phone: user?.phone || null
    };
  };

  return (
    <div className="divide-y divide-zinc-900">
      {orders.map((order) => {
        const userInfo = getUserInfo(order.user_id);
        const isCompleted = order.progress === 100;
        const isActive = order.progress > 0 && order.progress < 100;
        const isPending = order.progress === 0;
        
        return (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-4 md:p-6 hover:bg-zinc-900/30 group"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-mono text-xs text-red-600 bg-red-600/10 px-2 py-1 rounded">
                    {order.order_code || order.id}
                  </span>
                  <span className={`text-xs font-bold ${getStatusColor(order.progress || 0)} flex items-center gap-1`}>
                    {isCompleted && <CheckCircle2 size={10} />}
                    {isActive && <Clock size={10} />}
                    {isPending && <Zap size={10} />}
                    {getStatusText(order.progress || 0)}
                  </span>
                  <span className="text-[10px] text-zinc-600 ml-auto">
                    {new Date(order.updated_at || order.created_at).toLocaleDateString('id-ID')}
                  </span>
                </div>
                
                <h3 className="text-base font-black uppercase mb-2">{order.project_name}</h3>
                
                {/* Client Info */}
                <div className="space-y-1 mb-3">
                  <div className="flex items-center gap-2">
                    <User size={12} className="text-zinc-500" />
                    <p className="text-sm text-white font-semibold">
                      {userInfo.name}
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap gap-4">
                    {userInfo.email && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-zinc-500">📧</span>
                        <p className="text-xs text-zinc-400">
                          {userInfo.email}
                        </p>
                      </div>
                    )}
                    
                    {userInfo.phone && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-zinc-500">📱</span>
                        <p className="text-xs text-zinc-400">
                          {userInfo.phone}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">Progress</span>
                    <span className="font-bold text-white">{order.progress || 0}%</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        order.progress === 100 ? "bg-green-500" : order.progress > 0 ? "bg-yellow-500" : "bg-red-600"
                      }`}
                      style={{ width: `${order.progress || 0}%` }}
                    />
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-2">
                {order.progress < 100 && (
                  <button
                    onClick={() => onComplete(order.id)}
                    disabled={quickCompleting === order.id}
                    className="px-4 py-2 bg-black border border-green-900/30 text-green-500 rounded-lg text-xs font-black uppercase hover:bg-green-900/20 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {quickCompleting === order.id ? (
                      <>
                        <Loader2 size={12} className="animate-spin" />
                        Finishing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={12} />
                        Finish
                      </>
                    )}
                  </button>
                )}
                <button
                  onClick={() => onEdit(order)}
                  className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl hover:text-white hover:border-red-600 transition-all text-zinc-400"
                  title="Edit Order"
                >
                  <Eye size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

const PaginationControls = ({ pagination }: { pagination: any }) => {
  if (pagination.totalPages <= 1) return null;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={pagination.prevPage}
        disabled={!pagination.hasPrevPage}
        className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-red-600 disabled:opacity-30 transition-colors"
      >
        <ChevronLeft size={14} />
      </button>
      <div className="text-xs font-mono px-3 py-1 bg-zinc-900 rounded-lg">
        {pagination.currentPage} / {pagination.totalPages}
      </div>
      <button
        onClick={pagination.nextPage}
        disabled={!pagination.hasNextPage}
        className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-red-600 disabled:opacity-30 transition-colors"
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
};

const EmptyState = ({ icon, message }: { icon: string; message: string }) => {
  return (
    <div className="py-16 text-center">
      <div className="text-5xl mb-4 opacity-30">{icon}</div>
      <p className="font-mono text-sm uppercase tracking-widest text-zinc-500">{message}</p>
    </div>
  );
};