"use client";
import { useState, useMemo, useEffect } from "react";
import { 
  CreditCard, Loader2, Filter, Download, Check, X, Clock, 
  Search, Trash2, AlertCircle, DollarSign, TrendingUp 
} from "lucide-react";
import { dbHelpers, supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { usePagination } from "@/hooks/usePagination";
import { useDebounce } from "@/hooks/useDebounce";

interface TopupsTabProps {
  topups: any[];
  onRefresh: () => void;
}

export default function TopupsTab({ topups, onRefresh }: TopupsTabProps) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [deletingTopup, setDeletingTopup] = useState<string | null>(null);
  const [topupStats, setTopupStats] = useState({
    totalAmount: 0,
    pendingAmount: 0,
    approvedAmount: 0,
    rejectedAmount: 0,
    expiredAmount: 0,
    todayAmount: 0,
    weekAmount: 0,
  });
  
  const debouncedSearch = useDebounce(searchTerm, 300);
  
  // Filter topups
  const filteredTopups = useMemo(() => {
    return topups.filter((topup: any) => {
      // Filter by status
      if (statusFilter !== "all" && topup.status !== statusFilter) return false;
      
      // Filter by date
      if (dateFilter !== "all") {
        const today = new Date();
        const topupDate = new Date(topup.created_at);
        
        switch (dateFilter) {
          case "today":
            return topupDate.toDateString() === today.toDateString();
          case "week":
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            return topupDate >= weekAgo;
          case "month":
            const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
            return topupDate >= monthAgo;
        }
      }
      
      // Filter by search
      if (debouncedSearch) {
        const searchLower = debouncedSearch.toLowerCase();
        return (
          topup.topup_code?.toLowerCase().includes(searchLower) ||
          topup.user_profiles?.full_name?.toLowerCase().includes(searchLower) ||
          topup.user_profiles?.email?.toLowerCase().includes(searchLower) ||
          topup.payment_method?.toLowerCase().includes(searchLower) ||
          topup.amount?.toString().includes(searchLower)
        );
      }
      
      return true;
    });
  }, [topups, statusFilter, dateFilter, debouncedSearch]);
  
  // Calculate stats
  useEffect(() => {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    let stats = {
      totalAmount: 0,
      pendingAmount: 0,
      approvedAmount: 0,
      rejectedAmount: 0,
      expiredAmount: 0,
      todayAmount: 0,
      weekAmount: 0,
    };
    
    topups.forEach((topup: any) => {
      const amount = topup.amount || 0;
      const topupDate = new Date(topup.created_at);
      
      stats.totalAmount += amount;
      
      switch (topup.status) {
        case "pending":
          stats.pendingAmount += amount;
          break;
        case "approved":
          stats.approvedAmount += amount;
          break;
        case "rejected":
          stats.rejectedAmount += amount;
          break;
        case "expired":
          stats.expiredAmount += amount;
          break;
      }
      
      // Today's approved topups
      if (topup.status === "approved" && topupDate.toDateString() === today.toDateString()) {
        stats.todayAmount += amount;
      }
      
      // This week's approved topups
      if (topup.status === "approved" && topupDate >= weekAgo) {
        stats.weekAmount += amount;
      }
    });
    
    setTopupStats(stats);
  }, [topups]);
  
  const pagination = usePagination(filteredTopups, 10);
  
  const handleUpdateStatus = async (topupCode: string, status: string) => {
    setProcessingAction(topupCode);
    try {
      await dbHelpers.updateTopupStatus(topupCode, status);
      onRefresh();
    } catch (error: any) {
      console.error("Update status error:", error);
      alert("Gagal update status: " + error.message);
    } finally {
      setProcessingAction(null);
    }
  };
  
  const handleDeleteTopup = async (topupId: string) => {
    if (!confirm("Yakin ingin menghapus topup ini? Tindakan ini tidak dapat dibatalkan.")) {
      return;
    }
    
    setDeletingTopup(topupId);
    try {
      await supabase.from("topups").delete().eq("id", topupId);
      onRefresh();
    } catch (error: any) {
      console.error("Delete topup error:", error);
      alert("Gagal menghapus topup: " + error.message);
    } finally {
      setDeletingTopup(null);
    }
  };
  
  const handleExportCSV = () => {
    if (filteredTopups.length === 0) {
      alert("No data to export");
      return;
    }
    
    const headers = ["Code", "User", "Amount", "Status", "Method", "Date", "Time", "Payment Proof"];
    const rows = filteredTopups.map((t: any) => [
      t.topup_code,
      t.user_profiles?.full_name || "Unknown",
      `Rp ${t.amount?.toLocaleString() || 0}`,
      t.status,
      t.payment_method || "Unknown",
      new Date(t.created_at).toLocaleDateString("id-ID"),
      new Date(t.created_at).toLocaleTimeString("id-ID"),
      t.payment_proof_url || "-"
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `topups_export_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Get counts for each status
  const statusCounts = useMemo(() => {
    return {
      all: filteredTopups.length,
      pending: filteredTopups.filter((t: any) => t.status === "pending").length,
      approved: filteredTopups.filter((t: any) => t.status === "approved").length,
      rejected: filteredTopups.filter((t: any) => t.status === "rejected").length,
      expired: filteredTopups.filter((t: any) => t.status === "expired").length,
    };
  }, [filteredTopups]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-7 gap-4">
        <StatCard
          icon={DollarSign}
          label="Total"
          value={`Rp ${topupStats.totalAmount.toLocaleString()}`}
          description="All time"
          color="red"
        />
        <StatCard
          icon={Clock}
          label="Pending"
          value={`Rp ${topupStats.pendingAmount.toLocaleString()}`}
          description={`${statusCounts.pending} requests`}
          color="yellow"
        />
        <StatCard
          icon={Check}
          label="Approved"
          value={`Rp ${topupStats.approvedAmount.toLocaleString()}`}
          description={`${statusCounts.approved} approved`}
          color="green"
        />
        <StatCard
          icon={X}
          label="Rejected"
          value={`Rp ${topupStats.rejectedAmount.toLocaleString()}`}
          description={`${statusCounts.rejected} rejected`}
          color="red"
        />
        <StatCard
          icon={AlertCircle}
          label="Expired"
          value={`Rp ${topupStats.expiredAmount.toLocaleString()}`}
          description={`${statusCounts.expired} expired`}
          color="zinc"
        />
        <StatCard
          icon={TrendingUp}
          label="Today"
          value={`Rp ${topupStats.todayAmount.toLocaleString()}`}
          description="Today's approved"
          color="green"
        />
        <StatCard
          icon={TrendingUp}
          label="This Week"
          value={`Rp ${topupStats.weekAmount.toLocaleString()}`}
          description="Last 7 days"
          color="blue"
        />
      </div>
      
      {/* Filters and Controls */}
      <div className="bg-[#0c0c0c] rounded-3xl border border-zinc-900 p-4 md:p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h3 className="text-lg font-black">Topup Requests</h3>
            <p className="text-sm text-zinc-500">
              Total {filteredTopups.length} topups found
            </p>
          </div>
          
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:flex-initial">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
              <input
                type="text"
                placeholder="Search by code, name, email, or amount..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-black border border-zinc-800 rounded-lg text-sm w-full focus:border-red-600 focus:outline-none"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-black border border-zinc-800 px-3 py-2 rounded-lg text-sm focus:border-red-600 focus:outline-none"
            >
              <option value="all">All Status ({statusCounts.all})</option>
              <option value="pending">Pending ({statusCounts.pending})</option>
              <option value="approved">Approved ({statusCounts.approved})</option>
              <option value="rejected">Rejected ({statusCounts.rejected})</option>
              <option value="expired">Expired ({statusCounts.expired})</option>
            </select>
            
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-black border border-zinc-800 px-3 py-2 rounded-lg text-sm focus:border-red-600 focus:outline-none"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
            
            <button
              onClick={handleExportCSV}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
            >
              <Download size={16} />
              <span className="hidden md:inline">Export CSV</span>
              <span className="md:hidden">Export</span>
            </button>
          </div>
        </div>
        
        {/* Topups Table */}
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full">
            <thead>
              <tr className="bg-zinc-900 text-left text-xs text-zinc-500">
                <th className="p-3 font-bold">Code</th>
                <th className="p-3 font-bold">User</th>
                <th className="p-3 font-bold">Amount</th>
                <th className="p-3 font-bold">Method</th>
                <th className="p-3 font-bold">Status</th>
                <th className="p-3 font-bold hidden lg:table-cell">Date & Time</th>
                <th className="p-3 font-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagination.currentItems.length > 0 ? (
                pagination.currentItems.map((topup: any) => (
                  <TopupRow
                    key={topup.id}
                    topup={topup}
                    processingAction={processingAction}
                    deletingTopup={deletingTopup}
                    onUpdateStatus={handleUpdateStatus}
                    onDeleteTopup={handleDeleteTopup}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center">
                    <div className="text-zinc-600">
                      <CreditCard size={40} className="mx-auto mb-4 opacity-20" />
                      <p className="text-sm font-semibold">No topup requests found</p>
                      {debouncedSearch && (
                        <button
                          onClick={() => setSearchTerm("")}
                          className="mt-2 text-red-600 hover:text-red-500 text-sm"
                        >
                          Clear search
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mt-6 pt-6 border-t border-zinc-900">
            <PaginationControls pagination={pagination} />
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Subcomponent: Stat Card
const StatCard = ({
  icon: Icon,
  label,
  value,
  description,
  color,
}: {
  icon: any;
  label: string;
  value: string;
  description: string;
  color: "red" | "green" | "yellow" | "blue" | "zinc";
}) => {
  const colorClasses = {
    red: "from-red-600/20 to-red-600/5 border-red-600/30 text-red-500",
    green: "from-green-600/20 to-green-600/5 border-green-600/30 text-green-500",
    yellow: "from-yellow-600/20 to-yellow-600/5 border-yellow-600/30 text-yellow-500",
    blue: "from-blue-600/20 to-blue-600/5 border-blue-600/30 text-blue-500",
    zinc: "from-zinc-700/20 to-zinc-700/5 border-zinc-700/30 text-zinc-500",
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} border p-4 rounded-2xl`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Icon size={16} />
            <span className="text-xs font-black uppercase">{label}</span>
          </div>
          <p className="text-lg font-black">{value}</p>
          <p className="text-[10px] text-zinc-500 font-mono mt-1">{description}</p>
        </div>
      </div>
    </div>
  );
};

// Subcomponent: Topup Row
const TopupRow = ({
  topup,
  processingAction,
  deletingTopup,
  onUpdateStatus,
  onDeleteTopup,
}: {
  topup: any;
  processingAction: string | null;
  deletingTopup: string | null;
  onUpdateStatus: (code: string, status: string) => void;
  onDeleteTopup: (id: string) => void;
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-600/20 text-green-500 border-green-600/30";
      case "rejected":
        return "bg-red-600/20 text-red-500 border-red-600/30";
      case "pending":
        return "bg-yellow-600/20 text-yellow-500 border-yellow-600/30";
      case "expired":
        return "bg-zinc-800 text-zinc-500 border-zinc-700";
      default:
        return "bg-zinc-800 text-zinc-500 border-zinc-700";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <Check size={12} />;
      case "rejected":
        return <X size={12} />;
      case "pending":
        return <Clock size={12} />;
      default:
        return null;
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString("id-ID"),
      time: date.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' }),
      fullDate: date.toLocaleDateString("id-ID", { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      })
    };
  };

  const datetime = formatDateTime(topup.created_at);

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="border-b border-zinc-900/50 hover:bg-zinc-900/30 transition-colors"
    >
      <td className="p-3">
        <div className="font-mono text-xs bg-black/30 px-2 py-1 rounded inline-block">
          {topup.topup_code}
        </div>
      </td>
      
      <td className="p-3">
        <div>
          <p className="font-bold text-sm">{topup.user_profiles?.full_name || "Unknown"}</p>
          <p className="text-xs text-zinc-600 truncate max-w-[150px]">
            {topup.user_profiles?.email || "No email"}
          </p>
        </div>
      </td>
      
      <td className="p-3">
        <p className="font-black text-sm">Rp {topup.amount?.toLocaleString() || 0}</p>
      </td>
      
      <td className="p-3">
        <span className="text-xs px-2 py-1 bg-zinc-800 rounded">
          {topup.payment_method || "Unknown"}
        </span>
      </td>
      
      <td className="p-3">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-lg text-xs font-black flex items-center gap-1 ${getStatusColor(topup.status)} border`}>
            {getStatusIcon(topup.status)}
            {topup.status.toUpperCase()}
          </span>
        </div>
      </td>
      
      <td className="p-3 hidden lg:table-cell">
        <p className="text-xs font-semibold">{datetime.date}</p>
        <p className="text-xs text-zinc-600">{datetime.time}</p>
        <p className="text-[10px] text-zinc-500 mt-1">{datetime.fullDate}</p>
      </td>
      
      <td className="p-3">
        <div className="flex flex-col sm:flex-row gap-2">
          {topup.status === "pending" && !topup.payment_method?.includes("duitku") && (
            <>
              <button
                onClick={() => onUpdateStatus(topup.topup_code, "approved")}
                disabled={processingAction === topup.topup_code}
                className="px-3 py-1 bg-green-600/20 text-green-500 rounded text-xs hover:bg-green-600/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {processingAction === topup.topup_code ? (
                  <Loader2 size={10} className="animate-spin" />
                ) : (
                  <>
                    <Check size={10} />
                    Approve
                  </>
                )}
              </button>
              <button
                onClick={() => onUpdateStatus(topup.topup_code, "rejected")}
                disabled={processingAction === topup.topup_code}
                className="px-3 py-1 bg-red-600/20 text-red-500 rounded text-xs hover:bg-red-600/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {processingAction === topup.topup_code ? (
                  <Loader2 size={10} className="animate-spin" />
                ) : (
                  <>
                    <X size={10} />
                    Reject
                  </>
                )}
              </button>
            </>
          )}
          
          {topup.payment_proof_url && (
            <a
              href={topup.payment_proof_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1 bg-blue-600/20 text-blue-500 rounded text-xs hover:bg-blue-600/30 transition-colors text-center"
            >
              View Proof
            </a>
          )}
          
          <button
            onClick={() => onDeleteTopup(topup.id)}
            disabled={deletingTopup === topup.id}
            className="px-3 py-1 bg-red-600/20 text-red-500 rounded text-xs hover:bg-red-600/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
          >
            {deletingTopup === topup.id ? (
              <Loader2 size={10} className="animate-spin" />
            ) : (
              <>
                <Trash2 size={10} />
                Delete
              </>
            )}
          </button>
        </div>
      </td>
    </motion.tr>
  );
};

// Subcomponent: Pagination Controls
const PaginationControls = ({ pagination }: { pagination: any }) => {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="text-sm text-zinc-500">
        Showing {pagination.currentItems.length} of {pagination.currentItems.length === 0 ? 0 : ((pagination.currentPage - 1) * 10) + 1}-{Math.min(pagination.currentPage * 10, pagination.currentItems.length)} entries
      </div>
      
      <div className="flex items-center gap-2">
        <button
          onClick={pagination.prevPage}
          disabled={!pagination.hasPrevPage}
          className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:border-red-600 transition-colors"
        >
          Previous
        </button>
        
        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
            let pageNum;
            if (pagination.totalPages <= 5) {
              pageNum = i + 1;
            } else if (pagination.currentPage <= 3) {
              pageNum = i + 1;
            } else if (pagination.currentPage >= pagination.totalPages - 2) {
              pageNum = pagination.totalPages - 4 + i;
            } else {
              pageNum = pagination.currentPage - 2 + i;
            }
            
            return (
              <button
                key={pageNum}
                onClick={() => pagination.goToPage(pageNum)}
                className={`w-8 h-8 rounded-lg text-sm transition-colors ${
                  pagination.currentPage === pageNum
                    ? "bg-red-600 text-white font-black"
                    : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 border border-zinc-800"
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>
        
        <button
          onClick={pagination.nextPage}
          disabled={!pagination.hasNextPage}
          className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:border-red-600 transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
};