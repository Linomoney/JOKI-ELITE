"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { authHelpers, supabase, dbHelpers } from "@/lib/supabase";
import {
  Skull,
  Target,
  Loader2,
  LogOut,
  User,
  Mail,
  Phone,
  Calendar,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertCircle,
  Package,
  Activity,
  Shield,
  Settings,
  CreditCard,
  History,
  Receipt,
  Edit,
  Eye,
  EyeOff,
  Upload,
  Bell,
  Lock,
  Key,
  Send,
  Check,
  X,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  Wallet,
  Package2,
  AlertTriangle,
  MessageCircle,
  Menu,
  ChevronLeft,
  ChevronRight,
  Search,
  Home,
  MessageSquare,
  HelpCircle,
  MoreVertical,
  Download,
  FileDown,
  Filter,
  Eye as EyeIcon,
} from "lucide-react";
import TopupModal from "@/components/TopupModal";
import OrderModal from "@/components/OrderModal";
import { motion, AnimatePresence } from "framer-motion";
import { useSharedChat } from "@/hooks/useSharedChat"; // IMPORT CORRECTLY

export default function ClientDashboard() {
  const router = useRouter();
  const [balance, setBalance] = useState(0);
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);

  // Simpan activeTab di localStorage
  const [activeTab, setActiveTab] = useState<"overview" | "transactions" | "settings" | "chat">(() => {
    if (typeof window !== "undefined") {
      const savedTab = localStorage.getItem("clientActiveTab");
      return (savedTab as any) || "overview";
    }
    return "overview";
  });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [topups, setTopups] = useState<any[]>([]);
  const [allPackages, setAllPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    completed: 0,
    avgProgress: 0,
    totalSpent: 0,
    totalTopup: 0,
  });

  // Settings states
  const [showPassword, setShowPassword] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    full_name: "",
    phone: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    email: "",
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [emailUpdateStep, setEmailUpdateStep] = useState<"init" | "confirm" | "success">("init");
  const [emailCode, setEmailCode] = useState("");

  // Chat states - GUNAKAN useSharedChat
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // GUNAKAN useSharedChat DI SINI
  const { 
    messages: chatMessages, 
    loading: chatLoading, 
    error: chatError,
    sendMessage: sendChatMessage,
    loadMessages: loadChatMessages 
  } = useSharedChat(user?.id || null);

  useEffect(() => {
    if (profile && user) {
      setSettingsForm({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
        email: user.email || "",
      });
    }
  }, [profile, user]);

  // Simpan tab saat berubah
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("clientActiveTab", activeTab);
    }

    // Jika pindah ke chat tab, load chat messages
    if (activeTab === "chat" && user) {
      // Scroll to bottom
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
      }, 100);
    }
  }, [activeTab, user]);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setError("");
      setLoading(true);

      const currentUser = await authHelpers.getCurrentUser();
      if (!currentUser) {
        setError("Sesi login telah berakhir. Silakan login kembali.");
        router.push("/auth/login");
        return;
      }

      setUser(currentUser);

      const userProfile = await authHelpers.getUserProfile(currentUser.id);
      if (!userProfile) {
        setError("Profil pengguna tidak ditemukan.");
        return;
      }

      setBalance(userProfile?.balance || 0);
      setProfile(userProfile);

      // Load packages dengan error handling
      let packagesData = [];
      try {
        packagesData = await dbHelpers.getPackages();
      } catch (packageError) {
        console.error("Error loading packages:", packageError);
        packagesData = [];
      }

      setAllPackages(packagesData);

      // Load orders untuk user ini
      try {
        const { data: ordersData, error: ordersError } = await supabase.from("orders").select("*").eq("user_id", currentUser.id).order("created_at", { ascending: false });

        if (ordersError) throw ordersError;
        setOrders(ordersData || []);

        // Hitung stats dari orders
        const totalOrders = ordersData?.length || 0;
        const activeOrders = ordersData?.filter((o) => o.status !== "completed" && o.status !== "cancelled").length || 0;
        const completedOrders = ordersData?.filter((o) => o.status === "completed").length || 0;
        const avgProgress = ordersData?.length > 0 ? Math.round(ordersData.reduce((sum, o) => sum + (o.progress || 0), 0) / ordersData.length) : 0;
        const totalSpent = ordersData?.filter((o) => o.status === "completed").reduce((sum, o) => sum + (o.package_price || 0), 0) || 0;

        setStats((prev) => ({
          ...prev,
          total: totalOrders,
          active: activeOrders,
          completed: completedOrders,
          avgProgress: avgProgress,
          totalSpent: totalSpent,
        }));
      } catch (ordersError) {
        console.error("Error loading orders:", ordersError);
        setOrders([]);
      }

      // Load topups untuk user ini
      try {
        const { data: topupsData, error: topupsError } = await supabase.from("topups").select("*").eq("user_id", currentUser.id).order("created_at", { ascending: false });

        if (topupsError) throw topupsError;
        setTopups(topupsData || []);

        // Hitung total topup yang approved
        const totalTopup = topupsData?.filter((t) => t.status === "approved").reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

        setStats((prev) => ({
          ...prev,
          totalTopup: totalTopup,
        }));
      } catch (topupsError) {
        console.error("Error loading topups:", topupsError);
        setTopups([]);
      }
    } catch (error: any) {
      console.error("Error loading data:", error);
      setError(error.message || "Gagal memuat data. Silakan refresh halaman.");
    } finally {
      setLoading(false);
    }
  };

  // Update fungsi sendMessage
  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    setSendingMessage(true);
    try {
      await sendChatMessage(newMessage.trim(), false);
      setNewMessage("");
      
      // Scroll to bottom
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
      }, 100);
    } catch (error) {
      console.error("Error sending message:", error);
      setError("Gagal mengirim pesan");
    } finally {
      setSendingMessage(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authHelpers.signOut();
      router.push("/");
    } catch (error: any) {
      setError("Logout gagal: " + error.message);
    }
  };

  const handleRefresh = () => {
    loadUserData();
    if (activeTab === "chat" && user) {
      loadChatMessages();
    }
  };

  const handleUpdateProfile = async () => {
    try {
      setIsUpdating(true);
      setError("");
      setSuccess("");

      // Update profile
      const { error: updateError } = await supabase
        .from("user_profiles")
        .update({
          full_name: settingsForm.full_name,
          phone: settingsForm.phone,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (updateError) throw updateError;

      // Update password if provided
      if (settingsForm.newPassword) {
        if (settingsForm.newPassword !== settingsForm.confirmPassword) {
          throw new Error("Password baru tidak cocok");
        }

        if (settingsForm.newPassword.length < 6) {
          throw new Error("Password minimal 6 karakter");
        }

        const { error: passwordError } = await supabase.auth.updateUser({
          password: settingsForm.newPassword,
        });

        if (passwordError) throw passwordError;
      }

      setSuccess("Profil berhasil diperbarui!");
      loadUserData();

      // Reset password fields
      setSettingsForm({
        ...settingsForm,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: any) {
      setError(error.message || "Gagal memperbarui profil");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleEmailUpdate = async () => {
    try {
      setError("");
      setSuccess("");

      if (emailUpdateStep === "init") {
        // Send email change request
        const { error: updateError } = await supabase.auth.updateUser({
          email: settingsForm.email,
        });

        if (updateError) throw updateError;

        setEmailUpdateStep("confirm");
        setSuccess("Kode konfirmasi telah dikirim ke email baru Anda. Silakan cek email Anda.");
      } else if (emailUpdateStep === "confirm") {
        // Verify email change
        const { error: verifyError } = await supabase.auth.verifyOtp({
          email: settingsForm.email,
          token: emailCode,
          type: "email_change",
        });

        if (verifyError) throw verifyError;

        setEmailUpdateStep("success");
        setSuccess("Email berhasil diperbarui!");

        // Update profile email
        await supabase
          .from("user_profiles")
          .update({
            email: settingsForm.email,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id);

        setTimeout(() => {
          setEmailUpdateStep("init");
          setEmailCode("");
          loadUserData();
        }, 2000);
      }
    } catch (error: any) {
      setError(error.message || "Gagal memperbarui email");
    }
  };

  const handleCancelEmailUpdate = () => {
    setEmailUpdateStep("init");
    setEmailCode("");
    setSettingsForm({
      ...settingsForm,
      email: user?.email || "",
    });
  };

  const handleUploadAvatar = async (file: File) => {
    try {
      setError("");
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/avatar.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload file
      const { error: uploadError } = await supabase.storage.from("user-avatars").upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("user-avatars").getPublicUrl(filePath);

      // Update profile with avatar URL
      const { error: updateError } = await supabase
        .from("user_profiles")
        .update({
          avatar_url: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setSuccess("Foto profil berhasil diperbarui!");
      loadUserData();
    } catch (error: any) {
      setError("Gagal mengupload foto: " + error.message);
    }
  };

  // Animation variants
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3 },
    },
  };

  const slideIn = {
    hidden: { x: -20, opacity: 0 },
    visible: {
      x: 0,
      opacity: 1,
      transition: { duration: 0.3 },
    },
  };

  const scaleIn = {
    hidden: { scale: 0.9, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: { duration: 0.3 },
    },
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <Loader2 className="animate-spin text-red-600 mx-auto mb-4" size={40} />
          <p className="text-zinc-600 font-mono text-sm">Loading Dashboard...</p>
        </motion.div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-md bg-[#0c0c0c] p-8 rounded-3xl border border-red-600/30 text-center">
          <AlertCircle className="text-red-600 mx-auto mb-4" size={48} />
          <h2 className="text-xl font-black mb-4 text-red-600">Terjadi Kesalahan</h2>
          <p className="text-zinc-400 mb-6">{error}</p>
          <div className="space-y-3">
            <button onClick={() => router.push("/auth/login")} className="w-full bg-red-600 text-white font-black py-3 rounded-xl hover:bg-red-700 transition-colors">
              Login Kembali
            </button>
            <button onClick={() => router.push("/")} className="w-full bg-zinc-800 text-white font-black py-3 rounded-xl hover:bg-zinc-700 transition-colors">
              Kembali ke Home
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />}
      </AnimatePresence>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25 }}
            className="fixed left-0 top-0 h-full w-64 bg-[#0c0c0c] border-r border-zinc-900 z-50 md:hidden overflow-y-auto"
          >
            <div className="p-6 border-b border-zinc-900">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-full flex items-center justify-center">
                    <span className="font-black">{profile?.full_name?.charAt(0) || "A"}</span>
                  </div>
                  <div>
                    <p className="text-sm font-black">{profile?.full_name}</p>
                    <p className="text-[10px] text-zinc-600 font-mono">CLIENT</p>
                  </div>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="p-2 hover:bg-zinc-800 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              {/* Mobile Tabs */}
              <div className="space-y-1">
                {[
                  { id: "overview", label: "Overview", icon: Home },
                  { id: "transactions", label: "Transactions", icon: History },
                  { id: "settings", label: "Settings", icon: Settings },
                  { id: "chat", label: "Chat Support", icon: MessageCircle },
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id as any);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === tab.id ? "bg-red-600/20 text-red-600 border border-red-600/30" : "hover:bg-zinc-900 text-zinc-400"}`}
                    >
                      <Icon size={20} />
                      <span className="font-black text-sm">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Animated Background */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: "linear-gradient(#ff0000 1px, transparent 1px), linear-gradient(90deg, #ff0000 1px, transparent 1px)",
            backgroundSize: "50px 50px",
            animation: "gridMove 20s linear infinite",
          }}
        />
      </div>

      <style jsx>{`
        @keyframes gridMove {
          0% {
            transform: translateY(0) translateX(0);
          }
          100% {
            transform: translateY(50px) translateX(50px);
          }
        }
        .glow-red {
          box-shadow: 0 0 20px rgba(220, 38, 38, 0.5);
        }
        .glow-green {
          box-shadow: 0 0 20px rgba(34, 197, 94, 0.5);
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* Header */}
      <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="relative z-10 border-b border-zinc-900 bg-[#050505]/90 backdrop-blur-xl sticky top-0">
        <div className="container mx-auto px-4 md:px-6 py-4 md:py-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => setMobileMenuOpen(true)} className="md:hidden p-2 hover:bg-zinc-900 rounded-xl">
              <Menu size={24} />
            </button>
            <div className="flex items-center gap-3">
              <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.5 }} className="p-2 md:p-3 bg-red-600/20 rounded-xl md:rounded-2xl border border-red-600/30">
                <Skull className="text-red-600" size={20} />
              </motion.div>
              <div>
                <h1 className="text-xl md:text-2xl font-black italic tracking-tighter uppercase">
                  MISSION <span className="text-red-600">CONTROL</span>
                </h1>
                <p className="text-[10px] font-mono tracking-widest text-zinc-600 uppercase hidden md:block">Client Dashboard</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {profile?.role === "admin" && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push("/admin")}
                className="flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2 bg-red-600/20 border border-red-600/30 rounded-xl hover:border-red-600 transition-colors text-sm font-mono text-red-500"
              >
                <Shield size={14} className="md:hidden" />
                <Shield size={16} className="hidden md:block" />
                <span className="hidden md:inline">Admin</span>
              </motion.button>
            )}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push("/")}
              className="flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-red-600 transition-colors text-sm font-mono"
            >
              <Home size={14} className="md:hidden" />
              <Home size={16} className="hidden md:block" />
              <span className="hidden md:inline">Landing Page</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleRefresh}
              className="flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-red-600 transition-colors text-sm font-mono"
            >
              <Loader2 size={14} className={`md:hidden ${loading ? "animate-spin" : ""}`} />
              <Loader2 size={16} className={`hidden md:block ${loading ? "animate-spin" : ""}`} />
              <span className="hidden md:inline">Refresh</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLogout}
              className="flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-red-600 transition-colors text-sm font-mono"
            >
              <LogOut size={14} className="md:hidden" />
              <LogOut size={16} className="hidden md:block" />
              <span className="hidden md:inline">Logout</span>
            </motion.button>
          </div>
        </div>

        {/* Desktop Tabs */}
        <div className="hidden md:block container mx-auto px-6">
          <div className="flex gap-8 border-t border-zinc-900">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-4 py-3 text-sm font-black uppercase border-b-2 transition-all ${activeTab === "overview" ? "text-red-600 border-red-600" : "text-zinc-600 border-transparent hover:text-zinc-400"}`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("transactions")}
              className={`px-4 py-3 text-sm font-black uppercase border-b-2 transition-all ${activeTab === "transactions" ? "text-red-600 border-red-600" : "text-zinc-600 border-transparent hover:text-zinc-400"}`}
            >
              Transactions
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`px-4 py-3 text-sm font-black uppercase border-b-2 transition-all ${activeTab === "settings" ? "text-red-600 border-red-600" : "text-zinc-600 border-transparent hover:text-zinc-400"}`}
            >
              Settings
            </button>
            <button
              onClick={() => setActiveTab("chat")}
              className={`px-4 py-3 text-sm font-black uppercase border-b-2 transition-all ${activeTab === "chat" ? "text-red-600 border-red-600" : "text-zinc-600 border-transparent hover:text-zinc-400"}`}
            >
              Chat Support
            </button>
          </div>
        </div>

        {/* Mobile Tab Selector */}
        <div className="md:hidden px-4">
          <select value={activeTab} onChange={(e) => setActiveTab(e.target.value as any)} className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-xl appearance-none text-sm">
            <option value="overview"> Overview</option>
            <option value="transactions">💳 Transactions</option>
            <option value="settings">⚙️ Settings</option>
            <option value="chat">💬 Chat Support</option>
          </select>
        </div>
      </motion.div>

      {/* Error/Success Alerts */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="container mx-auto px-4 md:px-6 py-4">
            <div className="bg-red-600/10 border border-red-600/30 p-4 rounded-xl">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-red-600" />
                <p className="text-red-500 text-sm">{error}</p>
                <button onClick={() => setError("")} className="ml-auto text-red-600 hover:text-red-400">
                  ×
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {success && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="container mx-auto px-4 md:px-6 py-4">
            <div className="bg-green-600/10 border border-green-600/30 p-4 rounded-xl">
              <div className="flex items-center gap-2">
                <Check size={16} className="text-green-600" />
                <p className="text-green-500 text-sm">{success}</p>
                <button onClick={() => setSuccess("")} className="ml-auto text-green-600 hover:text-green-400">
                  ×
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 container mx-auto px-4 md:px-6 py-6 md:py-12">
        <AnimatePresence mode="wait">
          {/* OVERVIEW TAB */}
          {activeTab === "overview" && (
            <motion.div key="overview" initial="hidden" animate="visible" variants={fadeIn} className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
              {/* Sidebar - Profile */}
              <div className="lg:col-span-1">
                <div className="text-center mb-4 md:mb-6">
                  <motion.div whileHover={{ scale: 1.1 }} className="relative w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-red-600 to-red-700 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="Profile" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span className="text-2xl md:text-3xl font-black">{profile?.full_name?.charAt(0)?.toUpperCase() || "A"}</span>
                    )}
                    <label className="absolute -bottom-1 -right-1 md:-bottom-2 md:-right-2 w-6 h-6 md:w-8 md:h-8 bg-red-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-red-700 transition-colors">
                      <Upload size={12} className="md:hidden" />
                      <Upload size={14} className="hidden md:block" />
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            handleUploadAvatar(e.target.files[0]);
                          }
                        }}
                      />
                    </label>
                  </motion.div>
                  <h2 className="text-lg md:text-xl font-black uppercase tracking-tighter mb-1">{profile?.full_name || "Agent"}</h2>
                  <p className="text-[10px] font-mono tracking-widest text-zinc-600 uppercase">{profile?.role === "admin" ? "ADMINISTRATOR" : "CLIENT"}</p>
                </div>

                <div className="space-y-3 border-t border-zinc-800 pt-4 md:pt-6">
                  <div className="flex items-center gap-3 text-xs md:text-sm">
                    <Mail size={14} className="text-red-600" />
                    <span className="text-zinc-400 truncate">{user?.email}</span>
                  </div>
                  {profile?.phone && (
                    <div className="flex items-center gap-3 text-xs md:text-sm">
                      <Phone size={14} className="text-red-600" />
                      <span className="text-zinc-400">{profile.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-xs md:text-sm">
                    <Calendar size={14} className="text-red-600" />
                    <span className="text-zinc-400">
                      Joined{" "}
                      {new Date(profile?.created_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>

                {/* Quick Stats - Single Card */}
                <motion.div variants={scaleIn} className="mt-6 md:mt-8">
                  <div className="bg-gradient-to-br from-green-600/20 to-green-600/5 border border-green-600/30 p-4 md:p-6 rounded-2xl glow-green relative overflow-hidden">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-10">
                      <div
                        className="absolute inset-0"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%234ade80' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                          backgroundSize: "30px 30px",
                        }}
                      />
                    </div>

                    {/* Content */}
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3 md:mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 bg-green-600/30 rounded-xl flex items-center justify-center">
                            <CreditCard size={20} className="text-green-400" />
                          </div>
                          <div>
                            <p className="text-[10px] md:text-xs font-mono text-green-500 uppercase tracking-wider">Current Balance</p>
                            <p className="text-2xl md:text-3xl font-black mt-1">Rp {balance.toLocaleString()}</p>
                          </div>
                        </div>

                        {/* Balance Indicator */}
                        <div className="text-right">
                          <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-600/20 rounded-lg">
                            <TrendingUp size={12} className="text-green-500" />
                            <span className="text-[10px] text-green-500 font-black">ACTIVE</span>
                          </div>
                        </div>
                      </div>

                      {/* Admin Notice */}
                      {profile?.role === "admin" && (
                        <div className="mt-4 md:mt-6 p-3 md:p-4 bg-red-600/10 border border-red-600/30 rounded-xl">
                          <div className="flex items-center gap-2 mb-1 md:mb-2">
                            <Shield size={14} className="text-red-600" />
                            <p className="text-xs md:text-sm font-black text-red-600">Admin Access</p>
                          </div>
                          <p className="text-[9px] md:text-[10px] text-zinc-400">Full access to admin panel.</p>
                          <button onClick={() => router.push("/admin")} className="w-full mt-2 px-3 py-2 bg-red-600 text-white font-black rounded-lg hover:bg-red-700 transition-colors text-xs md:text-sm">
                            Go to Admin
                          </button>
                        </div>
                      )}

                      {/* Action Button */}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowTopupModal(true)}
                        className="w-full mt-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white font-black rounded-xl hover:from-green-700 hover:to-green-800 transition-all flex items-center justify-center gap-2 group"
                      >
                        <CreditCard size={18} />
                        <span>Topup Balance</span>
                        <ArrowUpRight size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                      </motion.button>

                      {/* Additional Info */}
                      <div className="mt-4 pt-4 border-t border-green-600/20">
                        <div className="flex items-center justify-between text-[10px] text-green-600/70">
                          <span className="flex items-center gap-1">
                            <Check size={12} />
                            Last topup: {topups.length > 0 ? new Date(topups[0].created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : "None"}
                          </span>
                          <span className="font-mono">{topups.filter((t) => t.status === "approved").length} approved</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {showTopupModal && (
                  <TopupModal
                    user={user}
                    onClose={() => setShowTopupModal(false)}
                    onSuccess={() => {
                      setShowTopupModal(false);
                      loadUserData();
                    }}
                  />
                )}
              </div>

              {/* Main Content - Orders */}
              <div className="lg:col-span-2">
                {/* Stats Cards */}
                <motion.div variants={fadeIn} className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
                  <div className="bg-gradient-to-br from-red-600/20 to-red-600/5 border border-red-600/30 p-4 md:p-6 rounded-2xl glow-red">
                    <div className="flex items-center justify-between mb-3 md:mb-4">
                      <Activity className="text-red-600" size={20} />
                      <span className="text-xl md:text-3xl font-black text-red-600">{stats.active}</span>
                    </div>
                    <p className="text-xs md:text-sm font-black uppercase tracking-tighter">Active</p>
                    <p className="text-[9px] md:text-[10px] font-mono text-zinc-600 mt-1">IN PROGRESS</p>
                  </div>

                  <div className="bg-zinc-900/50 border border-zinc-800 p-4 md:p-6 rounded-2xl">
                    <div className="flex items-center justify-between mb-3 md:mb-4">
                      <Package className="text-zinc-400" size={20} />
                      <span className="text-xl md:text-3xl font-black">{stats.total}</span>
                    </div>
                    <p className="text-xs md:text-sm font-black uppercase tracking-tighter">Total</p>
                    <p className="text-[9px] md:text-[10px] font-mono text-zinc-600 mt-1">ORDERS</p>
                  </div>

                  <div className="col-span-2 md:col-span-1 bg-zinc-900/50 border border-zinc-800 p-4 md:p-6 rounded-2xl">
                    <div className="flex items-center justify-between mb-3 md:mb-4">
                      <Target className="text-zinc-400" size={20} />
                      <span className="text-xl md:text-3xl font-black">{stats.avgProgress}%</span>
                    </div>
                    <p className="text-xs md:text-sm font-black uppercase tracking-tighter">Progress</p>
                    <p className="text-[9px] md:text-[10px] font-mono text-zinc-600 mt-1">AVERAGE</p>
                  </div>
                </motion.div>

                {/* Orders List */}
                <motion.div variants={fadeIn} className="bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden">
                  <div className="p-4 md:p-6 border-b border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h3 className="text-lg md:text-xl font-black uppercase tracking-tighter">Your Missions</h3>
                    <div className="flex gap-3">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowOrderModal(true)}
                        className="px-3 py-2 bg-red-600 rounded-xl text-xs md:text-sm font-black uppercase hover:bg-red-700 transition-colors"
                      >
                        New Order
                      </motion.button>
                      <a
                        href="https://wa.me/6285710821547"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 bg-green-600 rounded-xl text-xs md:text-sm font-black uppercase hover:bg-green-700 transition-colors flex items-center gap-2"
                      >
                        <MessageSquare size={14} />
                        <span className="hidden md:inline">Support</span>
                        <span className="md:hidden">Chat</span>
                      </a>
                    </div>
                  </div>

                  {showOrderModal && (
                    <OrderModal
                      user={{
                        ...user,
                        balance: balance,
                        full_name: profile?.full_name,
                        phone: profile?.phone,
                        email: user?.email,
                      }}
                      packages={allPackages || []} // Tambahkan fallback array kosong
                      onClose={() => setShowOrderModal(false)}
                      onSuccess={() => {
                        setShowOrderModal(false);
                        loadUserData();
                      }}
                    />
                  )}

                  {orders.length === 0 ? (
                    <div className="p-8 md:p-12 text-center">
                      <AlertCircle size={32} className="text-zinc-700 mx-auto mb-4" />
                      <p className="text-zinc-600 font-mono text-sm mb-4">No active missions</p>
                      <button onClick={() => setShowOrderModal(true)} className="inline-flex items-center gap-2 px-4 py-3 bg-red-600 rounded-xl font-black uppercase hover:bg-red-700 transition-colors text-sm">
                        Start First Mission
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-800">
                      {orders.map((order, index) => (
                        <motion.div key={order.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }} className="p-4 md:p-6 hover:bg-zinc-900/30 transition-colors group">
                          <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 md:gap-0">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 md:gap-3 mb-2">
                                <span className="text-xs md:text-sm font-mono text-red-600 font-black">{order.order_code || order.id}</span>
                                {order.progress === 100 ? (
                                  <span className="px-2 py-1 bg-green-600/20 border border-green-600/30 rounded-lg text-[8px] md:text-[9px] font-black uppercase text-green-500">Done</span>
                                ) : order.status === "cancelled" ? (
                                  <span className="px-2 py-1 bg-gray-600/20 border border-gray-600/30 rounded-lg text-[8px] md:text-[9px] font-black uppercase text-gray-500">Cancelled</span>
                                ) : (
                                  <span className="px-2 py-1 bg-red-600/20 border border-red-600/30 rounded-lg text-[8px] md:text-[9px] font-black uppercase text-red-500">Active</span>
                                )}
                              </div>
                              <h4 className="text-base md:text-lg font-black uppercase tracking-tighter mb-1">{order.project_name}</h4>
                              <p className="text-[9px] md:text-[10px] font-mono text-zinc-600">
                                Created{" "}
                                {new Date(order.created_at).toLocaleDateString("id-ID", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl md:text-3xl font-black text-red-600">{order.progress}%</p>
                              <p className="text-[9px] md:text-[10px] font-mono text-zinc-600 mt-1">{order.status}</p>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="w-full h-1.5 md:h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800 mt-3 md:mt-4">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${order.progress || 0}%` }}
                              transition={{ duration: 1, ease: "easeOut" }}
                              className={`h-full ${(order.progress || 0) === 100 ? "bg-green-500" : "bg-red-600"}`}
                            />
                          </div>

                          {order.progress < 100 && (
                            <div className="mt-3 md:mt-4 flex items-center gap-2 text-xs text-zinc-500">
                              <Clock size={12} />
                              <span className="font-mono text-[10px] md:text-xs">Completion: 24-48 hours</span>
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* TRANSACTIONS TAB */}
          {activeTab === "transactions" && (
            <motion.div key="transactions" initial="hidden" animate="visible" variants={fadeIn} className="space-y-6 md:space-y-8">
              {/* Stats */}
              <motion.div variants={slideIn} className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                <div className="bg-gradient-to-br from-green-600/20 to-green-600/5 border border-green-600/30 p-4 md:p-6 rounded-2xl glow-green">
                  <Wallet className="text-green-500 mb-2 md:mb-3" size={20} />
                  <p className="text-xs md:text-sm text-zinc-400">Balance</p>
                  <p className="text-lg md:text-2xl font-black mt-1 md:mt-2">Rp {balance.toLocaleString()}</p>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 p-4 md:p-6 rounded-2xl">
                  <ArrowUpRight className="text-red-600 mb-2 md:mb-3" size={20} />
                  <p className="text-xs md:text-sm text-zinc-400">Spent</p>
                  <p className="text-lg md:text-2xl font-black mt-1 md:mt-2">Rp {stats.totalSpent.toLocaleString()}</p>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 p-4 md:p-6 rounded-2xl">
                  <ArrowDownRight className="text-green-500 mb-2 md:mb-3" size={20} />
                  <p className="text-xs md:text-sm text-zinc-400">Topup</p>
                  <p className="text-lg md:text-2xl font-black mt-1 md:mt-2">Rp {stats.totalTopup.toLocaleString()}</p>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 p-4 md:p-6 rounded-2xl">
                  <Receipt className="text-red-600 mb-2 md:mb-3" size={20} />
                  <p className="text-xs md:text-sm text-zinc-400">Orders</p>
                  <p className="text-lg md:text-2xl font-black mt-1 md:mt-2">{stats.total}</p>
                </div>
              </motion.div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                {/* Topups */}
                <motion.div variants={slideIn} className="bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden">
                  <div className="p-4 md:p-6 border-b border-zinc-800">
                    <div className="flex items-center gap-2 md:gap-3">
                      <CreditCard className="text-green-500" size={18} />
                      <h3 className="text-lg md:text-xl font-black uppercase tracking-tighter">Topup History</h3>
                    </div>
                  </div>
                  <div className="divide-y divide-zinc-800 max-h-[400px] md:max-h-[500px] overflow-y-auto">
                    {topups.length === 0 ? (
                      <div className="p-8 md:p-12 text-center">
                        <CreditCard size={32} className="text-zinc-700 mx-auto mb-4" />
                        <p className="text-zinc-600 font-mono text-sm">No topup history</p>
                      </div>
                    ) : (
                      topups.map((topup, index) => (
                        <motion.div key={topup.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }} className="p-4 md:p-6 hover:bg-zinc-900/30 transition-colors">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-0">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${topup.status === "approved" ? "bg-green-600/20" : topup.status === "pending" ? "bg-yellow-600/20" : "bg-red-600/20"}`}>
                                {topup.status === "approved" ? <Check className="text-green-500" size={14} /> : topup.status === "pending" ? <Clock className="text-yellow-500" size={14} /> : <X className="text-red-500" size={14} />}
                              </div>
                              <div>
                                <p className="font-mono text-sm">{topup.topup_code}</p>
                                <p className="text-[10px] text-zinc-600">{new Date(topup.created_at).toLocaleDateString("id-ID")}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-base md:text-lg font-black text-green-500">+ Rp {topup.amount.toLocaleString()}</p>
                              <span
                                className={`text-[10px] px-2 py-1 rounded ${topup.status === "approved" ? "bg-green-600/20 text-green-500" : topup.status === "pending" ? "bg-yellow-600/20 text-yellow-500" : "bg-red-600/20 text-red-500"}`}
                              >
                                {topup.status.toUpperCase()}
                              </span>
                            </div>
                          </div>
                          {topup.notes && <p className="text-sm text-zinc-400 mt-2">{topup.notes}</p>}
                        </motion.div>
                      ))
                    )}
                  </div>
                </motion.div>

                {/* Orders */}
                <motion.div variants={slideIn} className="bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden">
                  <div className="p-4 md:p-6 border-b border-zinc-800">
                    <div className="flex items-center gap-2 md:gap-3">
                      <Package2 className="text-red-600" size={18} />
                      <h3 className="text-lg md:text-xl font-black uppercase tracking-tighter">Order History</h3>
                    </div>
                  </div>
                  <div className="divide-y divide-zinc-800 max-h-[400px] md:max-h-[500px] overflow-y-auto">
                    {orders.length === 0 ? (
                      <div className="p-8 md:p-12 text-center">
                        <Package size={32} className="text-zinc-700 mx-auto mb-4" />
                        <p className="text-zinc-600 font-mono text-sm">No order history</p>
                      </div>
                    ) : (
                      orders.map((order, index) => (
                        <motion.div key={order.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }} className="p-4 md:p-6 hover:bg-zinc-900/30 transition-colors">
                          <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 md:gap-0">
                            <div>
                              <p className="font-mono text-sm">{order.order_code || order.id}</p>
                              <h4 className="font-black uppercase text-sm mt-1">{order.project_name}</h4>
                              <p className="text-[10px] text-zinc-600">{new Date(order.created_at).toLocaleDateString("id-ID")}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-base md:text-lg font-black text-red-600">- Rp {(order.package_price || 0).toLocaleString()}</p>
                              <span className={`text-[10px] px-2 py-1 rounded ${order.progress === 100 ? "bg-green-600/20 text-green-500" : "bg-red-600/20 text-red-500"}`}>{order.progress === 100 ? "COMPLETED" : "IN PROGRESS"}</span>
                            </div>
                          </div>
                          <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden mt-3">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${order.progress}%` }} transition={{ duration: 1 }} className={`h-full ${order.progress === 100 ? "bg-green-500" : "bg-red-600"}`} />
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === "settings" && (
            <motion.div key="settings" initial="hidden" animate="visible" variants={fadeIn} className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
              {/* Profile Settings */}
              <motion.div variants={slideIn} className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 md:p-8">
                <div className="flex items-center gap-2 md:gap-3 mb-6 md:mb-8">
                  <User className="text-red-600" size={20} />
                  <h3 className="text-lg md:text-xl font-black uppercase tracking-tighter">Profile Settings</h3>
                </div>

                <div className="space-y-4 md:space-y-6">
                  <div>
                    <label className="text-sm font-black text-zinc-400 mb-2 block">Full Name</label>
                    <input
                      type="text"
                      value={settingsForm.full_name}
                      onChange={(e) => setSettingsForm({ ...settingsForm, full_name: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 px-4 py-3 rounded-xl outline-none focus:border-red-600 text-sm"
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-black text-zinc-400 mb-2 block">Phone Number</label>
                    <input
                      type="tel"
                      value={settingsForm.phone}
                      onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 px-4 py-3 rounded-xl outline-none focus:border-red-600 text-sm"
                      placeholder="+62 xxx xxx xxx"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-black text-zinc-400 mb-2 block">Email Address</label>
                    <div className="space-y-4">
                      {emailUpdateStep === "init" ? (
                        <>
                          <input
                            type="email"
                            value={settingsForm.email}
                            onChange={(e) => setSettingsForm({ ...settingsForm, email: e.target.value })}
                            className="w-full bg-zinc-900 border border-zinc-800 px-4 py-3 rounded-xl outline-none focus:border-red-600 text-sm"
                            placeholder="your@email.com"
                          />
                          <div className="flex gap-3">
                            <button onClick={handleEmailUpdate} className="flex-1 py-3 bg-red-600 rounded-xl font-black hover:bg-red-700 transition-colors text-sm">
                              Update Email
                            </button>
                          </div>
                        </>
                      ) : emailUpdateStep === "confirm" ? (
                        <div className="space-y-4">
                          <div className="bg-yellow-600/10 border border-yellow-600/30 p-4 rounded-xl">
                            <div className="flex items-center gap-2 mb-2">
                              <Bell className="text-yellow-600" size={14} />
                              <p className="text-sm text-yellow-500">Check your email for verification code</p>
                            </div>
                          </div>
                          <input
                            type="text"
                            value={emailCode}
                            onChange={(e) => setEmailCode(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 px-4 py-3 rounded-xl outline-none focus:border-red-600 text-sm"
                            placeholder="Enter verification code"
                          />
                          <div className="flex gap-3">
                            <button onClick={handleEmailUpdate} className="flex-1 py-3 bg-green-600 rounded-xl font-black hover:bg-green-700 transition-colors text-sm">
                              Verify Code
                            </button>
                            <button onClick={handleCancelEmailUpdate} className="px-4 py-3 bg-zinc-800 rounded-xl font-black hover:bg-zinc-700 transition-colors text-sm">
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-green-600/10 border border-green-600/30 p-4 rounded-xl">
                          <div className="flex items-center gap-2">
                            <Check className="text-green-600" size={14} />
                            <p className="text-sm text-green-500">Email updated successfully!</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <button onClick={handleUpdateProfile} disabled={isUpdating} className="w-full py-3 bg-red-600 text-white font-black rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm">
                    {isUpdating ? <Loader2 className="animate-spin mx-auto" size={20} /> : "Update Profile"}
                  </button>
                </div>
              </motion.div>

              {/* Security Settings */}
              <motion.div variants={slideIn} className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 md:p-8">
                <div className="flex items-center gap-2 md:gap-3 mb-6 md:mb-8">
                  <Lock className="text-red-600" size={20} />
                  <h3 className="text-lg md:text-xl font-black uppercase tracking-tighter">Security Settings</h3>
                </div>

                <div className="space-y-4 md:space-y-6">
                  <div>
                    <label className="text-sm font-black text-zinc-400 mb-2 block">Current Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={settingsForm.currentPassword}
                        onChange={(e) => setSettingsForm({ ...settingsForm, currentPassword: e.target.value })}
                        className="w-full bg-zinc-900 border border-zinc-800 px-4 py-3 rounded-xl outline-none focus:border-red-600 pr-12 text-sm"
                        placeholder="Enter current password"
                      />
                      <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400">
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-black text-zinc-400 mb-2 block">New Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={settingsForm.newPassword}
                        onChange={(e) => setSettingsForm({ ...settingsForm, newPassword: e.target.value })}
                        className="w-full bg-zinc-900 border border-zinc-800 px-4 py-3 rounded-xl outline-none focus:border-red-600 pr-12 text-sm"
                        placeholder="Enter new password"
                      />
                      <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400">
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-black text-zinc-400 mb-2 block">Confirm New Password</label>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={settingsForm.confirmPassword}
                      onChange={(e) => setSettingsForm({ ...settingsForm, confirmPassword: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 px-4 py-3 rounded-xl outline-none focus:border-red-600 text-sm"
                      placeholder="Confirm new password"
                    />
                  </div>

                  <div className="bg-red-600/10 border border-red-600/30 p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="text-red-600" size={14} />
                      <p className="text-sm font-black text-red-600">Security Tips</p>
                    </div>
                    <ul className="text-[10px] text-zinc-400 space-y-1">
                      <li>• Use at least 8 characters</li>
                      <li>• Mix letters, numbers, symbols</li>
                      <li>• Don't reuse passwords</li>
                      <li>• Store passwords securely</li>
                    </ul>
                  </div>

                  <button
                    onClick={() => {
                      supabase.auth
                        .resetPasswordForEmail(settingsForm.email, {
                          redirectTo: `${window.location.origin}/auth/reset-password`,
                        })
                        .then(() => {
                          setSuccess("Password reset email sent!");
                        })
                        .catch((error) => {
                          setError("Failed to send reset email: " + error.message);
                        });
                    }}
                    className="w-full py-3 bg-zinc-800 border border-zinc-700 text-white font-black rounded-xl hover:bg-zinc-700 transition-colors text-sm"
                  >
                    Send Password Reset Email
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* CHAT TAB */}
          {activeTab === "chat" && (
            <motion.div key="chat" initial="hidden" animate="visible" variants={fadeIn} className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-3">
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden h-[calc(100vh-300px)] md:h-[calc(100vh-350px)] flex flex-col">
                  {/* Chat Header */}
                  <div className="p-4 md:p-6 border-b border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-600/20 rounded-full flex items-center justify-center">
                        <MessageSquare className="text-red-600" size={20} />
                      </div>
                      <div>
                        <h3 className="font-black text-lg">Support Chat</h3>
                        <p className="text-[10px] text-zinc-600 font-mono">Talk to our support team</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={loadChatMessages} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
                        <Loader2 size={18} className={sendingMessage ? "animate-spin" : ""} />
                      </button>
                    </div>
                  </div>

                  {/* Messages Area */}
                  <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#050505] scrollbar-hide">
                    {chatMessages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center p-8">
                        <MessageSquare size={64} className="text-zinc-800 mb-4" />
                        <p className="text-zinc-600 text-center mb-2">No messages yet</p>
                        <p className="text-zinc-700 text-sm text-center">Start a conversation with our support team</p>
                      </div>
                    ) : (
                      chatMessages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.is_admin ? "justify-start" : "justify-end"}`}>
                          <div className={`max-w-[80%] rounded-2xl p-3 md:p-4 ${msg.is_admin ? "bg-zinc-900 border border-zinc-800 rounded-bl-none" : "bg-red-600/20 border border-red-600/30 rounded-br-none"}`}>
                            <div className="flex items-center gap-2 mb-1">
                              {msg.is_admin ? (
                                <div className="flex items-center gap-2">
                                  <Shield size={12} className="text-red-600" />
                                  <span className="text-[10px] font-mono text-zinc-600">Admin</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <User size={12} className="text-red-600" />
                                  <span className="text-[10px] font-mono text-zinc-600">You</span>
                                </div>
                              )}
                              <span className="text-[10px] text-zinc-600">
                                {new Date(msg.created_at).toLocaleTimeString("id-ID", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                            <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Input Area */}
                  <div className="p-4 border-t border-zinc-800">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                        placeholder="Type your message..."
                        className="flex-1 bg-zinc-900 border border-zinc-800 px-4 py-3 rounded-xl outline-none focus:border-red-600 text-sm"
                        disabled={sendingMessage}
                      />
                      <button onClick={sendMessage} disabled={sendingMessage || !newMessage.trim()} className="px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        {sendingMessage ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                      </button>
                    </div>
                    <p className="text-[10px] text-zinc-600 mt-2 text-center">Our team typically responds within 1-2 hours</p>
                  </div>
                </div>
              </div>

              {/* Chat Info Sidebar */}
              <div className="lg:col-span-1">
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 sticky top-32">
                  <h4 className="font-black text-lg mb-4">Chat Info</h4>

                  <div className="space-y-4">
                    <div className="bg-zinc-900/30 p-4 rounded-xl">
                      <p className="text-sm font-black mb-2">Support Hours</p>
                      <p className="text-xs text-zinc-400">24/7 Support Available</p>
                      <p className="text-[10px] text-zinc-600 mt-1">Quick response guaranteed</p>
                    </div>

                    <div className="bg-zinc-900/30 p-4 rounded-xl">
                      <p className="text-sm font-black mb-2">Typical Response Time</p>
                      <p className="text-xs text-zinc-400">1-2 Hours</p>
                      <p className="text-[10px] text-zinc-600 mt-1">During business hours</p>
                    </div>

                    <div className="bg-red-600/10 border border-red-600/30 p-4 rounded-xl">
                      <p className="text-sm font-black text-red-600 mb-2">Emergency Contact</p>
                      <a href="https://wa.me/6285710821547" target="_blank" className="text-xs text-zinc-400 hover:text-white transition-colors">
                        WhatsApp: +62 857-1082-1547
                      </a>
                      <p className="text-[10px] text-zinc-600 mt-1">For urgent matters only</p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-black">Quick Questions</p>
                      <div className="space-y-2">
                        <button onClick={() => setNewMessage("I have a question about my order")} className="w-full p-3 bg-zinc-900 rounded-xl text-xs text-left hover:bg-zinc-800 transition-colors">
                          Order status question
                        </button>
                        <button onClick={() => setNewMessage("I need help with payment")} className="w-full p-3 bg-zinc-900 rounded-xl text-xs text-left hover:bg-zinc-800 transition-colors">
                          Payment issue
                        </button>
                        <button onClick={() => setNewMessage("I want to change my order details")} className="w-full p-3 bg-zinc-900 rounded-xl text-xs text-left hover:bg-zinc-800 transition-colors">
                          Change order details
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
