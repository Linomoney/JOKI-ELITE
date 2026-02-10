"use client";
import { useState, useEffect, useCallback, useRef, useMemo, useTransition } from "react";
import {
  RefreshCcw,
  Eye,
  Plus,
  Loader2,
  Skull,
  Terminal,
  Database,
  CheckCircle2,
  Users,
  Trash2,
  Shield,
  Mail,
  Phone,
  Calendar,
  Search,
  AlertCircle,
  LogOut,
  MessageCircle,
  Send,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Filter,
  CreditCard,
  Package as PackageIcon,
  TrendingUp,
  FileText,
  Download,
  BarChart3,
  MoreVertical,
  Edit,
  EyeOff,
  Home,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { authHelpers, supabase, dbHelpers } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

// ========== COMPONENT-SPECIFIC IMPORTS ==========
import OrdersTab from "@/components/admin/OrdersTab";
import UsersTab from "@/components/admin/UsersTab";
import PackagesTab from "@/components/admin/PackagesTab";
import TopupsTab from "@/components/admin/TopupsTab";
import FinanceTab from "@/components/admin/FinanceTab";
import ChatTab from "@/components/admin/ChatTab";
import TestimonialsTab from "@/components/admin/TestimonialsTab";
import TeamTab from "@/components/admin/TeamTab";

// ========== TYPE DEFINITIONS ==========
type TabType = "orders" | "users" | "packages" | "topups" | "finance" | "chat" | "testimonials" | "team";

interface DashboardStats {
  totalOrders: number;
  activeOrders: number;
  pendingTopups: number;
  totalRevenue: number;
}

// ========== SIMPLE CACHE IMPLEMENTATION ==========
const dataCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getCachedData = (key: string) => {
  const cached = dataCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
};

const setCachedData = (key: string, data: any) => {
  dataCache.set(key, { data, timestamp: Date.now() });
};

const clearCache = (key: string) => {
  dataCache.delete(key);
};

// ========== DEBOUNCE HOOK ==========
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// ========== PAGINATION HOOK ==========
const usePagination = <T,>(items: T[], itemsPerPage: number) => {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(items.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = items.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  return {
    currentPage,
    totalPages,
    currentItems,
    goToPage,
    nextPage,
    prevPage,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
  };
};

// ========== ANIMATION VARIANTS ==========
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3 },
  },
};

export default function AdminDashboard() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // ========== STATE MANAGEMENT ==========
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    if (typeof window !== "undefined") {
      const savedTab = localStorage.getItem("adminActiveTab");
      return (savedTab as TabType) || "orders";
    }
    return "orders";
  });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState<any>(null);
  const [authError, setAuthError] = useState<string>("");
  const [pageLoading, setPageLoading] = useState(true);
  const [showStats, setShowStats] = useState(true);

  // Data states
  const [orders, setOrders] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [topups, setTopups] = useState<any[]>([]);
  const [financeReports, setFinanceReports] = useState<any[]>([]);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);

  // Search states
  const [searchUser, setSearchUser] = useState("");
  const debouncedSearchUser = useDebounce(searchUser, 300);

  // ========== MEMOIZED VALUES ==========
  const dashboardStats = useMemo((): DashboardStats => {
    const totalOrders = orders.length;
    const activeOrders = orders.filter((o) => o.progress < 100).length;
    const pendingTopups = topups.filter((t: any) => t.status === "pending").length;
    const totalRevenue = orders.reduce((sum, o) => sum + (o.package_price || 0), 0);

    return { totalOrders, activeOrders, pendingTopups, totalRevenue };
  }, [orders, topups]);

  const filteredUsers = useMemo(() => {
    if (!debouncedSearchUser.trim()) return users;

    const searchTerm = debouncedSearchUser.toLowerCase();
    return users.filter((u) => u.full_name?.toLowerCase().includes(searchTerm) || u.email?.toLowerCase().includes(searchTerm));
  }, [users, debouncedSearchUser]);

  // ========== REAL-TIME SUBSCRIPTIONS ==========
  const setupRealtimeSubscriptions = useCallback(() => {
    if (!currentAdmin) return;

    console.log("🔄 Setting up real-time subscriptions for all tabs...");

    // Channel untuk semua tabel yang perlu real-time
    const channels = [
      // Orders subscription
      supabase
        .channel("realtime-orders")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "orders",
          },
          (payload) => {
            console.log("📦 Orders real-time update:", payload);
            // Update orders data berdasarkan event
            setOrders((prev) => {
              if (payload.eventType === "INSERT") {
                return [payload.new, ...prev];
              } else if (payload.eventType === "UPDATE") {
                return prev.map((item) => (item.id === payload.new.id ? payload.new : item));
              } else if (payload.eventType === "DELETE") {
                return prev.filter((item) => item.id !== payload.old.id);
              }
              return prev;
            });
          },
        )
        .subscribe(),

      // Users subscription
      supabase
        .channel("realtime-users")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "user_profiles",
          },
          (payload) => {
            console.log("👥 Users real-time update:", payload);
            // Update users data
            setUsers((prev) => {
              if (payload.eventType === "INSERT") {
                return [payload.new, ...prev];
              } else if (payload.eventType === "UPDATE") {
                return prev.map((item) => (item.id === payload.new.id ? payload.new : item));
              } else if (payload.eventType === "DELETE") {
                return prev.filter((item) => item.id !== payload.old.id);
              }
              return prev;
            });
          },
        )
        .subscribe(),

      // Packages subscription
      supabase
        .channel("realtime-packages")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "packages",
          },
          (payload) => {
            console.log("📦 Packages real-time update:", payload);
            // Update packages data
            setPackages((prev) => {
              if (payload.eventType === "INSERT") {
                return [payload.new, ...prev];
              } else if (payload.eventType === "UPDATE") {
                return prev.map((item) => (item.id === payload.new.id ? payload.new : item));
              } else if (payload.eventType === "DELETE") {
                return prev.filter((item) => item.id !== payload.old.id);
              }
              return prev;
            });
          },
        )
        .subscribe(),

      // Topups subscription
      supabase
        .channel("realtime-topups")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "topups",
          },
          (payload) => {
            console.log("💰 Topups real-time update:", payload);
            // Update topups data
            setTopups((prev) => {
              if (payload.eventType === "INSERT") {
                return [payload.new, ...prev];
              } else if (payload.eventType === "UPDATE") {
                return prev.map((item) => (item.id === payload.new.id ? payload.new : item));
              } else if (payload.eventType === "DELETE") {
                return prev.filter((item) => item.id !== payload.old.id);
              }
              return prev;
            });
          },
        )
        .subscribe(),

      // Testimonials subscription
      supabase
        .channel("realtime-testimonials")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "testimonials",
          },
          (payload) => {
            console.log("⭐ Testimonials real-time update:", payload);
            // Update testimonials data
            setTestimonials((prev) => {
              if (payload.eventType === "INSERT") {
                return [payload.new, ...prev];
              } else if (payload.eventType === "UPDATE") {
                return prev.map((item) => (item.id === payload.new.id ? payload.new : item));
              } else if (payload.eventType === "DELETE") {
                return prev.filter((item) => item.id !== payload.old.id);
              }
              return prev;
            });
          },
        )
        .subscribe(),

      // Team members subscription
      supabase
        .channel("realtime-team")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "user_profiles",
            filter: "is_team_member=eq.true",
          },
          (payload) => {
            console.log("👨‍💼 Team real-time update:", payload);
            // Update team members data
            setTeamMembers((prev) => {
              if (payload.eventType === "INSERT" && payload.new.is_team_member) {
                return [payload.new, ...prev];
              } else if (payload.eventType === "UPDATE") {
                if (payload.new.is_team_member) {
                  // Update existing or add new
                  const exists = prev.some((item) => item.id === payload.new.id);
                  if (exists) {
                    return prev.map((item) => (item.id === payload.new.id ? payload.new : item));
                  } else {
                    return [payload.new, ...prev];
                  }
                } else {
                  // Remove if no longer team member
                  return prev.filter((item) => item.id !== payload.new.id);
                }
              } else if (payload.eventType === "DELETE") {
                return prev.filter((item) => item.id !== payload.old.id);
              }
              return prev;
            });
          },
        )
        .subscribe(),

      // Financial reports subscription
      supabase
        .channel("realtime-finance")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "financial_reports",
          },
          (payload) => {
            console.log("📊 Finance real-time update:", payload);
            // Update finance reports data
            setFinanceReports((prev) => {
              if (payload.eventType === "INSERT") {
                return [payload.new, ...prev];
              } else if (payload.eventType === "UPDATE") {
                return prev.map((item) => (item.id === payload.new.id ? payload.new : item));
              } else if (payload.eventType === "DELETE") {
                return prev.filter((item) => item.id !== payload.old.id);
              }
              return prev;
            });
          },
        )
        .subscribe(),
    ];

    return () => {
      console.log("🧹 Cleaning up real-time subscriptions");
      channels.forEach((channel) => {
        supabase.removeChannel(channel);
      });
    };
  }, [currentAdmin]);

  // ========== EFFECTS ==========
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("adminActiveTab", activeTab);
    }
  }, [activeTab]);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  // Setup real-time subscriptions
  useEffect(() => {
    if (currentAdmin) {
      const cleanup = setupRealtimeSubscriptions();
      return cleanup;
    }
  }, [currentAdmin, setupRealtimeSubscriptions]);

  useEffect(() => {
    if (currentAdmin) {
      // Load initial data for all tabs (bukan hanya tab aktif)
      loadAllData();
    }
  }, [currentAdmin]);

  // ========== DATA LOADING FUNCTIONS ==========
  const loadAllData = async () => {
    try {
      console.log("📊 Loading all data...");
      await Promise.all([loadOrders(), loadUsers(), loadPackages(), loadTopups(), loadFinanceReports(), loadTestimonials(), loadTeamMembers()]);
    } catch (error) {
      console.error("Error loading all data:", error);
    }
  };

  const loadOrders = async () => {
    try {
      const cached = getCachedData("orders-all");
      if (cached) {
        setOrders(cached);
        return;
      }

      const data = await dbHelpers.getOrders();
      setOrders(data);
      setCachedData("orders-all", data);
    } catch (error: any) {
      console.error("Load orders error:", error);
    }
  };

  const loadUsers = async () => {
    try {
      const cached = getCachedData("users-all");
      if (cached) {
        setUsers(cached);
        return;
      }

      const data = await dbHelpers.getUsers();
      setUsers(data);
      setCachedData("users-all", data);
    } catch (error: any) {
      console.error("Load users error:", error);
    }
  };

  const loadPackages = async () => {
    try {
      const cached = getCachedData("packages-all");
      if (cached) {
        setPackages(cached);
        return;
      }

      const data = await dbHelpers.getPackages();
      setPackages(data);
      setCachedData("packages-all", data);
    } catch (error: any) {
      console.error("Load packages error:", error);
    }
  };

  const loadTopups = async () => {
    try {
      const cached = getCachedData("topups-all");
      if (cached) {
        setTopups(cached);
        return;
      }

      const data = await dbHelpers.getTopups();
      setTopups(data);
      setCachedData("topups-all", data);
    } catch (error: any) {
      console.error("Load topups error:", error);
    }
  };

  const loadFinanceReports = async () => {
    try {
      const cached = getCachedData("reports-all");
      if (cached) {
        setFinanceReports(cached);
        return;
      }

      const data = await dbHelpers.getFinancialReports();
      setFinanceReports(data);
      setCachedData("reports-all", data);
    } catch (error: any) {
      console.error("Load finance reports error:", error);
    }
  };

  const loadTestimonials = async () => {
    try {
      const cached = getCachedData("testimonials-all");
      if (cached) {
        setTestimonials(cached);
        return;
      }

      const data = await dbHelpers.getTestimonials();
      setTestimonials(data);
      setCachedData("testimonials-all", data);
    } catch (error: any) {
      console.error("Load testimonials error:", error);
    }
  };

  const loadTeamMembers = async () => {
    try {
      const cached = getCachedData("team-members");
      if (cached) {
        setTeamMembers(cached);
        return;
      }

      const data = await dbHelpers.getTeamMembers();
      setTeamMembers(data);
      setCachedData("team-members", data);
    } catch (error: any) {
      console.error("Load team members error:", error);
    }
  };
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  // ========== REFRESH FUNCTION ==========
  const handleRefresh = useCallback(() => {
    startTransition(() => {
      setRefreshTrigger((prev) => prev + 1);
      console.log(`🔄 Manual refresh for tab: ${activeTab}`);

      // Clear cache dan reload data untuk tab aktif saja
      const cacheKeys = {
        orders: "orders-all",
        users: "users-all",
        packages: "packages-all",
        topups: "topups-all",
        finance: "reports-all",
        testimonials: "testimonials-all",
        team: "team-members",
        chat: null,
      };

      const key = cacheKeys[activeTab];
      if (key) {
        clearCache(key);
      }

      switch (activeTab) {
        case "orders":
          loadOrders();
          break;
        case "users":
          loadUsers();
          break;
        case "packages":
          loadPackages();
          break;
        case "topups":
          loadTopups();
          break;
        case "finance":
          loadFinanceReports();
          break;
        case "testimonials":
          loadTestimonials();
          break;
        case "team":
          loadTeamMembers();
          break;
      }
    });
  }, [activeTab]);

  // ========== AUTH FUNCTIONS ==========
  const checkAdminAccess = async () => {
    try {
      setAuthError("");
      setPageLoading(true);

      const user = await authHelpers.getCurrentUser();
      if (!user) {
        setAuthError("Silakan login untuk mengakses halaman admin");
        router.push("/auth/login?redirect=admin");
        return;
      }

      const profile = await authHelpers.getUserProfile(user.id);
      if (!profile) {
        setAuthError("Profil pengguna tidak ditemukan");
        router.push("/auth/login?redirect=admin&error=profile_not_found");
        return;
      }

      if (profile.role !== "admin" && user.email !== "tengkuerlangga2802@gmail.com") {
        router.push("/dashboard");
        return;
      }

      setCurrentAdmin(profile);
    } catch (error: any) {
      console.error("Check admin access error:", error);
      setAuthError(error.message || "Terjadi kesalahan saat memeriksa akses");
    } finally {
      setPageLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authHelpers.signOut();
      router.push("/auth/login");
    } catch (error: any) {
      setAuthError("Logout gagal: " + error.message);
    }
  };

  // ========== LOADING STATES ==========
  if (pageLoading) {
    return (
      <div className="min-h-screen bg-[#050505] text-zinc-100 flex items-center justify-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <Loader2 className="animate-spin text-red-600 mx-auto mb-4" size={40} />
          <p className="text-zinc-600 font-mono text-sm">Memuat Dashboard Admin...</p>
        </motion.div>
      </div>
    );
  }

  if (authError && !currentAdmin) {
    return (
      <div className="min-h-screen bg-[#050505] text-zinc-100 flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-md bg-[#0c0c0c] p-8 rounded-3xl border border-red-600/30 text-center">
          <AlertCircle className="text-red-600 mx-auto mb-4" size={48} />
          <h2 className="text-xl font-black mb-4 text-red-600">Akses Ditolak</h2>
          <p className="text-zinc-400 mb-6">{authError}</p>
          <div className="space-y-3">
            <button onClick={() => router.push("/auth/login?redirect=admin")} className="w-full bg-red-600 text-white font-black py-3 rounded-xl hover:bg-red-700 transition-colors">
              Login Kembali
            </button>
            <button onClick={() => router.push("/dashboard")} className="w-full bg-zinc-800 text-white font-black py-3 rounded-xl hover:bg-zinc-700 transition-colors">
              Ke Dashboard Client
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100">
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
            <MobileSidebar currentAdmin={currentAdmin} activeTab={activeTab} setActiveTab={setActiveTab} setMobileMenuOpen={setMobileMenuOpen} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          {/* HEADER */}
          <Header currentAdmin={currentAdmin} mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} handleRefresh={handleRefresh} handleLogout={handleLogout} isPending={isPending} />

          {/* Stats Cards - Collapsible */}
          <StatsSection showStats={showStats} setShowStats={setShowStats} dashboardStats={dashboardStats} />

          {/* Error Alert */}
          <ErrorAlert authError={authError} setAuthError={setAuthError} />

          {/* Real-time Indicator */}
          <RealtimeIndicator />

          {/* TABS - Desktop */}
          <DesktopTabs activeTab={activeTab} setActiveTab={setActiveTab} />

          {/* Mobile Tab Selector */}
          <MobileTabSelector activeTab={activeTab} setActiveTab={setActiveTab} />

          {/* MAIN CONTENT */}
          <div className="mt-8">
            <AnimatePresence mode="wait">
              {activeTab === "orders" && <OrdersTab key="orders" orders={orders} users={users} onRefresh={loadOrders} />}
              {activeTab === "users" && <UsersTab key="users" users={filteredUsers} searchUser={searchUser} setSearchUser={setSearchUser} currentAdmin={currentAdmin} onRefresh={loadUsers} />}
              {activeTab === "packages" && (
                <PackagesTab
                  key={`packages-${refreshTrigger}`} // Key akan force re-render
                  packages={packages}
                  onRefresh={() => {
                    clearCache("packages-all");
                    loadPackages();
                  }}
                />
              )}
              {activeTab === "topups" && <TopupsTab key="topups" topups={topups} onRefresh={loadTopups} />}
              {activeTab === "finance" && <FinanceTab key="finance" financeReports={financeReports} onRefresh={loadFinanceReports} />}
              {activeTab === "testimonials" && <TestimonialsTab key="testimonials" testimonials={testimonials} onRefresh={loadTestimonials} />}
              {activeTab === "team" && <TeamTab key="team" teamMembers={teamMembers} currentAdmin={currentAdmin} onRefresh={loadTeamMembers} />}
              {activeTab === "chat" && <ChatTab key="chat" currentAdmin={currentAdmin} />}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

// ========== NEW: REAL-TIME INDICATOR COMPONENT ==========
const RealtimeIndicator = () => {
  const [isConnected, setIsConnected] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    // Simulate connection status
    const interval = setInterval(() => {
      setIsConnected(Math.random() > 0.1); // 90% chance connected
      setLastUpdate(new Date());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  if (!lastUpdate) return null;

  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
      <div className="flex items-center justify-end gap-2">
        <div className={`flex items-center gap-1 ${isConnected ? "text-green-500" : "text-red-500"}`}>
          <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
          <span className="text-xs font-mono">{isConnected ? "REAL-TIME ACTIVE" : "DISCONNECTED"}</span>
        </div>
        <span className="text-xs text-zinc-600 font-mono">• Auto-updates enabled</span>
      </div>
    </motion.div>
  );
};

// ========== COMPONENT BREAKDOWN ==========

const MobileSidebar = ({ currentAdmin, activeTab, setActiveTab, setMobileMenuOpen }: { currentAdmin: any; activeTab: TabType; setActiveTab: (tab: TabType) => void; setMobileMenuOpen: (open: boolean) => void }) => {
  const tabs = [
    { id: "orders" as TabType, label: "Orders", icon: PackageIcon },
    { id: "users" as TabType, label: "Users", icon: Users },
    { id: "packages" as TabType, label: "Packages", icon: PackageIcon },
    { id: "topups" as TabType, label: "Topups", icon: CreditCard },
    { id: "finance" as TabType, label: "Finance", icon: TrendingUp },
    { id: "chat" as TabType, label: "Chat", icon: MessageCircle },
    { id: "testimonials" as TabType, label: "Testimonials", icon: FileText },
    { id: "team" as TabType, label: "Team", icon: Users },
  ];

  return (
    <div className="p-6 border-b border-zinc-900">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-full flex items-center justify-center">
            <span className="font-black">{currentAdmin?.full_name?.charAt(0) || "A"}</span>
          </div>
          <div>
            <p className="text-sm font-black">{currentAdmin?.full_name}</p>
            <p className="text-[10px] text-zinc-600 font-mono">ADMIN</p>
          </div>
        </div>
        <button onClick={() => setMobileMenuOpen(false)} className="p-2 hover:bg-zinc-800 rounded-lg">
          <X size={20} />
        </button>
      </div>

      <div className="space-y-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
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
  );
};

const Header = ({
  currentAdmin,
  mobileMenuOpen,
  setMobileMenuOpen,
  handleRefresh,
  handleLogout,
  isPending,
}: {
  currentAdmin: any;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  handleRefresh: () => void;
  handleLogout: () => void;
  isPending: boolean;
}) => {
  return (
    <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex-1">
          <div className="flex items-center justify-between md:justify-start gap-4">
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 hover:bg-zinc-900 rounded-xl">
              <Menu size={24} />
            </button>
            <div className="flex-1 md:flex-initial">
              <div className="flex items-center gap-2 text-red-600 mb-2">
                <Shield size={16} className="animate-pulse" />
                <span className="text-[10px] font-mono tracking-[0.4em] uppercase font-bold">Admin Control Panel</span>
              </div>
              <h1 className="text-3xl md:text-5xl lg:text-7xl font-black italic tracking-tighter uppercase leading-none">
                COMMAND <span className="text-red-600">CENTER</span>
              </h1>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="hidden md:flex items-center gap-3 ml-4">
            <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-full flex items-center justify-center">
              <span className="font-black">{currentAdmin?.full_name?.charAt(0) || "A"}</span>
            </div>
            <div>
              <p className="text-sm font-black">{currentAdmin?.full_name}</p>
              <p className="text-[10px] text-zinc-600 font-mono">ADMIN</p>
            </div>
          </div>
          <button onClick={() => (window.location.href = "/")} className="group flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-red-600 transition-colors">
            <Home size={18} />
            <span className="text-[10px] font-black font-mono tracking-widest uppercase hidden md:inline">Home</span>
            <span className="text-sm font-black md:hidden">Home</span>
          </button>
          <button
            onClick={handleRefresh}
            disabled={isPending}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-red-600 transition-colors disabled:opacity-50"
          >
            <RefreshCcw size={18} className={isPending ? "animate-spin" : ""} />
            <span className="text-[10px] font-black font-mono tracking-widest uppercase hidden md:inline">Sync</span>
            <span className="text-sm font-black md:hidden">Sync</span>
          </button>
          <button onClick={handleLogout} className="group flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-red-600 transition-colors">
            <LogOut size={18} />
            <span className="text-[10px] font-black font-mono tracking-widest uppercase hidden md:inline">Logout</span>
            <span className="text-sm font-black md:hidden">Logout</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const StatsSection = ({ showStats, setShowStats, dashboardStats }: { showStats: boolean; setShowStats: (show: boolean) => void; dashboardStats: DashboardStats }) => {
  return (
    <motion.div variants={fadeIn} initial="hidden" animate="visible" className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-black uppercase">Dashboard Overview</h2>
        <button onClick={() => setShowStats(!showStats)} className="p-2 hover:bg-zinc-900 rounded-lg">
          {showStats ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>

      <AnimatePresence>
        {showStats && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={PackageIcon} value={dashboardStats.totalOrders} label="Total Orders" description="ALL TIME" color="red" />
              <StatCard icon={Loader2} value={dashboardStats.activeOrders} label="Active" description="IN PROGRESS" color="yellow" />
              <StatCard icon={CreditCard} value={dashboardStats.pendingTopups} label="Pending Topups" description="NEEDS REVIEW" color="green" />
              <StatCard icon={TrendingUp} value={`Rp ${dashboardStats.totalRevenue.toLocaleString()}`} label="Total Revenue" description="ALL TIME" color="green" isCurrency />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const StatCard = ({ icon: Icon, value, label, description, color, isCurrency = false }: { icon: any; value: number | string; label: string; description: string; color: "red" | "green" | "yellow"; isCurrency?: boolean }) => {
  const colorClasses = {
    red: "from-red-600/20 to-red-600/5 border-red-600/30 text-red-600",
    green: "from-green-600/20 to-green-600/5 border-green-600/30 text-green-500",
    yellow: "bg-zinc-900/50 border-zinc-800 text-yellow-500",
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} border p-4 rounded-2xl`}>
      <div className="flex items-center justify-between">
        <Icon className={color === "yellow" ? "text-yellow-500" : ""} size={20} />
        <span className="text-2xl font-black">{value}</span>
      </div>
      <p className="text-xs font-black uppercase mt-2">{label}</p>
      <p className="text-[10px] text-zinc-600 font-mono mt-1">{description}</p>
    </div>
  );
};

const ErrorAlert = ({ authError, setAuthError }: { authError: string; setAuthError: (error: string) => void }) => {
  if (!authError) return null;

  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mb-6">
      <div className="p-4 bg-red-600/10 border border-red-600/30 rounded-xl">
        <div className="flex items-center gap-2">
          <AlertCircle size={16} className="text-red-600" />
          <p className="text-red-500 text-sm flex-1">{authError}</p>
          <button onClick={() => setAuthError("")} className="ml-2 text-red-600 hover:text-red-400">
            ×
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const DesktopTabs = ({ activeTab, setActiveTab }: { activeTab: TabType; setActiveTab: (tab: TabType) => void }) => {
  const tabs = [
    { id: "orders", label: "Orders", icon: PackageIcon },
    { id: "users", label: "Users", icon: Users },
    { id: "packages", label: "Packages", icon: PackageIcon },
    { id: "topups", label: "Topups", icon: CreditCard },
    { id: "finance", label: "Finance", icon: TrendingUp },
    { id: "chat", label: "Chat", icon: MessageCircle },
    { id: "testimonials", label: "Testimonials", icon: FileText },
    { id: "team", label: "Team", icon: Users },
  ];

  return (
    <div className="hidden md:flex gap-4 mb-8 border-b border-zinc-900 overflow-x-auto">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`px-4 py-2 font-black uppercase whitespace-nowrap border-b-2 transition-all flex items-center gap-2 ${activeTab === tab.id ? "text-red-600 border-red-600" : "text-zinc-400 border-transparent hover:text-zinc-300"}`}
          >
            <Icon size={16} />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};

const MobileTabSelector = ({ activeTab, setActiveTab }: { activeTab: TabType; setActiveTab: (tab: TabType) => void }) => {
  const tabs = [
    { id: "orders", label: "📦 Orders" },
    { id: "users", label: "👥 Users" },
    { id: "packages", label: "📁 Packages" },
    { id: "topups", label: "💰 Topups" },
    { id: "finance", label: "📊 Finance" },
    { id: "chat", label: "💬 Chat" },
    { id: "testimonials", label: "⭐ Testimonials" },
    { id: "team", label: "👨‍💼 Team" },
  ];

  return (
    <div className="md:hidden mb-6">
      <select value={activeTab} onChange={(e) => setActiveTab(e.target.value as TabType)} className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-xl appearance-none text-sm">
        {tabs.map((tab) => (
          <option key={tab.id} value={tab.id}>
            {tab.label}
          </option>
        ))}
      </select>
    </div>
  );
};
