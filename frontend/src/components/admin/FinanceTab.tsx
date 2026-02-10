"use client";
import { useState, useMemo } from "react";
import { TrendingUp, FileText, Download, Calendar, BarChart3, RefreshCcw, Loader2 } from "lucide-react";
import { dbHelpers } from "@/lib/supabase";
import { motion } from "framer-motion";
import { usePagination } from "@/hooks/usePagination";
import { DateRangePicker } from "@/components/ui/DateRangePicker";

interface FinanceTabProps {
  financeReports: any[];
  onRefresh: () => void;
}

export default function FinanceTab({ financeReports, onRefresh }: FinanceTabProps) {
  const [dateRange, setDateRange] = useState({ start: null as Date | null, end: null as Date | null });
  const [generatingReport, setGeneratingReport] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  
  // Filter reports by date range
  const filteredReports = useMemo(() => {
    if (!dateRange.start || !dateRange.end) {
      return financeReports;
    }
    
    return financeReports.filter((report: any) => {
      const reportDate = new Date(report.report_date);
      return reportDate >= dateRange.start! && reportDate <= dateRange.end!;
    });
  }, [financeReports, dateRange]);
  
  const pagination = usePagination(filteredReports, 10);
  
  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const totalIncome = filteredReports.reduce((sum, r) => sum + (r.total_income || 0), 0);
    const totalTopup = filteredReports.reduce((sum, r) => sum + (r.total_topup || 0), 0);
    const totalOrder = filteredReports.reduce((sum, r) => sum + (r.total_order || 0), 0);
    const totalCompleted = filteredReports.reduce((sum, r) => sum + (r.completed_orders || 0), 0);
    const totalPending = filteredReports.reduce((sum, r) => sum + (r.pending_orders || 0), 0);
    const totalUsers = filteredReports.reduce((sum, r) => sum + (r.active_users || 0), 0);
    
    const avgIncome = filteredReports.length > 0 ? totalIncome / filteredReports.length : 0;
    const avgTopup = filteredReports.length > 0 ? totalTopup / filteredReports.length : 0;
    const avgOrder = filteredReports.length > 0 ? totalOrder / filteredReports.length : 0;
    
    return {
      totalIncome,
      totalTopup,
      totalOrder,
      totalCompleted,
      totalPending,
      totalUsers,
      avgIncome,
      avgTopup,
      avgOrder,
      reportCount: filteredReports.length,
    };
  }, [filteredReports]);
  
  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    try {
      await dbHelpers.generateDailyReport();
      onRefresh();
      alert("Daily report generated successfully!");
    } catch (error: any) {
      console.error("Generate report error:", error);
      alert("Failed to generate report: " + error.message);
    } finally {
      setGeneratingReport(false);
    }
  };
  
  const handleExportCSV = () => {
    if (filteredReports.length === 0) {
      alert("No data to export");
      return;
    }
    
    const headers = ["Date", "Total Income", "From Topup", "From Orders", "Pending Orders", "Completed Orders", "Active Users"];
    const rows = filteredReports.map((r: any) => [
      r.report_date,
      r.total_income || 0,
      r.total_topup || 0,
      r.total_order || 0,
      r.pending_orders || 0,
      r.completed_orders || 0,
      r.active_users || 0,
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `financial_reports_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleExportPDF = () => {
    // This would typically call a server endpoint to generate PDF
    alert("PDF export would be implemented with a server endpoint");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={TrendingUp}
          label="Total Income"
          value={`Rp ${summaryStats.totalIncome.toLocaleString()}`}
          color="green"
          trend="up"
          description={`${summaryStats.reportCount} reports`}
        />
        <StatCard
          icon={BarChart3}
          label="Avg. Daily Income"
          value={`Rp ${summaryStats.avgIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          color="blue"
          description="Per day average"
        />
        <StatCard
          icon={FileText}
          label="Completed Orders"
          value={summaryStats.totalCompleted}
          color="green"
          description={`${summaryStats.totalPending} pending`}
        />
        <StatCard
          icon={TrendingUp}
          label="Active Users"
          value={summaryStats.totalUsers}
          color="purple"
          description="Last 30 days"
        />
      </div>
      
      {/* Controls */}
      <div className="bg-[#0c0c0c] rounded-3xl border border-zinc-900 p-4 md:p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <h3 className="text-lg font-black">Financial Reports</h3>
          
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
              className="w-full md:w-auto"
            />
            
            <div className="flex gap-2">
              <button
                onClick={handleGenerateReport}
                disabled={generatingReport}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50 flex items-center gap-2"
              >
                {generatingReport ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <RefreshCcw size={16} />
                )}
                Generate Today
              </button>
              
              <button
                onClick={handleExportCSV}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center gap-2"
              >
                <Download size={16} />
                Export CSV
              </button>
              
              <button
                onClick={handleExportPDF}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center gap-2"
              >
                <FileText size={16} />
                Export PDF
              </button>
            </div>
          </div>
        </div>
        
        {/* Breakdown Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-zinc-900/50 p-4 rounded-2xl">
            <h4 className="text-sm font-black text-zinc-400 mb-2">Income Breakdown</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">From Topup</span>
                <span className="font-black text-green-500">
                  Rp {summaryStats.totalTopup.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">From Orders</span>
                <span className="font-black text-blue-500">
                  Rp {summaryStats.totalOrder.toLocaleString()}
                </span>
              </div>
              <div className="pt-2 border-t border-zinc-800">
                <div className="flex justify-between">
                  <span className="font-black">Total</span>
                  <span className="font-black text-xl">
                    Rp {summaryStats.totalIncome.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-zinc-900/50 p-4 rounded-2xl">
            <h4 className="text-sm font-black text-zinc-400 mb-2">Orders Breakdown</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Completed</span>
                <span className="font-black text-green-500">{summaryStats.totalCompleted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Pending</span>
                <span className="font-black text-yellow-500">{summaryStats.totalPending}</span>
              </div>
              <div className="pt-2 border-t border-zinc-800">
                <div className="flex justify-between">
                  <span className="font-black">Success Rate</span>
                  <span className="font-black text-xl">
                    {summaryStats.totalCompleted + summaryStats.totalPending > 0
                      ? Math.round((summaryStats.totalCompleted / (summaryStats.totalCompleted + summaryStats.totalPending)) * 100)
                      : 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-zinc-900/50 p-4 rounded-2xl">
            <h4 className="text-sm font-black text-zinc-400 mb-2">Averages</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Daily Income</span>
                <span className="font-black">
                  Rp {summaryStats.avgIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Daily Topup</span>
                <span className="font-black">
                  Rp {summaryStats.avgTopup.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Daily Orders</span>
                <span className="font-black">
                  Rp {summaryStats.avgOrder.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Reports Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-900 text-left text-xs text-zinc-500">
                <th className="p-3">Date</th>
                <th className="p-3 hidden md:table-cell">Income</th>
                <th className="p-3 hidden md:table-cell">Topup</th>
                <th className="p-3 hidden md:table-cell">Orders</th>
                <th className="p-3">Pending</th>
                <th className="p-3 hidden md:table-cell">Completed</th>
                <th className="p-3 hidden md:table-cell">Users</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagination.currentItems.length > 0 ? (
                pagination.currentItems.map((report: any) => (
                  <ReportRow
                    key={report.id}
                    report={report}
                    isSelected={selectedReport?.id === report.id}
                    onSelect={() => setSelectedReport(report === selectedReport ? null : report)}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="p-8 text-center">
                    <div className="text-zinc-600">
                      <FileText size={40} className="mx-auto mb-4 opacity-20" />
                      <p className="text-sm">No financial reports found</p>
                      {dateRange.start && dateRange.end && (
                        <button
                          onClick={() => setDateRange({ start: null, end: null })}
                          className="mt-2 text-red-600 hover:text-red-500 text-sm"
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Report Details Modal */}
        {selectedReport && (
          <ReportDetails
            report={selectedReport}
            onClose={() => setSelectedReport(null)}
          />
        )}
        
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
  color,
  trend,
  description,
}: {
  icon: any;
  label: string;
  value: string | number;
  color: "green" | "blue" | "purple";
  trend?: "up" | "down" | "neutral";
  description?: string;
}) => {
  const colorClasses = {
    green: "from-green-600/20 to-green-600/5 border-green-600/30 text-green-500",
    blue: "from-blue-600/20 to-blue-600/5 border-blue-600/30 text-blue-500",
    purple: "from-purple-600/20 to-purple-600/5 border-purple-600/30 text-purple-500",
  };

  const trendIcons = {
    up: "↗",
    down: "↘",
    neutral: "→",
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} border p-4 rounded-2xl`}>
      <div className="flex items-center justify-between mb-2">
        <Icon size={20} />
        {trend && (
          <span className="text-xs font-black">{trendIcons[trend]}</span>
        )}
      </div>
      <p className="text-xl md:text-2xl font-black mb-1">{value}</p>
      <p className="text-xs font-black uppercase">{label}</p>
      {description && (
        <p className="text-[10px] text-zinc-600 font-mono mt-1">{description}</p>
      )}
    </div>
  );
};

// Subcomponent: Report Row
const ReportRow = ({
  report,
  isSelected,
  onSelect,
}: {
  report: any;
  isSelected: boolean;
  onSelect: () => void;
}) => {
  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`border-b border-zinc-900/50 hover:bg-zinc-900/30 transition-colors ${isSelected ? "bg-red-600/10" : ""}`}
    >
      <td className="p-3">
        <div className="font-bold text-sm">
          {new Date(report.report_date).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </div>
        <div className="text-xs text-zinc-600">
          {new Date(report.report_date).toLocaleDateString("en-US", { weekday: "short" })}
        </div>
      </td>
      
      <td className="p-3 hidden md:table-cell">
        <div className="font-black text-green-500 text-sm">
          Rp {(report.total_income || 0).toLocaleString()}
        </div>
      </td>
      
      <td className="p-3 hidden md:table-cell">
        <div className="font-bold text-sm">
          Rp {(report.total_topup || 0).toLocaleString()}
        </div>
      </td>
      
      <td className="p-3 hidden md:table-cell">
        <div className="font-bold text-sm">
          Rp {(report.total_order || 0).toLocaleString()}
        </div>
      </td>
      
      <td className="p-3">
        <span className="px-2 py-1 bg-yellow-600/20 text-yellow-500 rounded-lg text-xs font-black">
          {report.pending_orders || 0}
        </span>
      </td>
      
      <td className="p-3 hidden md:table-cell">
        <span className="px-2 py-1 bg-green-600/20 text-green-500 rounded-lg text-xs font-black">
          {report.completed_orders || 0}
        </span>
      </td>
      
      <td className="p-3 hidden md:table-cell">
        <span className="px-2 py-1 bg-blue-600/20 text-blue-500 rounded-lg text-xs font-black">
          {report.active_users || 0}
        </span>
      </td>
      
      <td className="p-3">
        <button
          onClick={onSelect}
          className={`px-2 py-1 rounded-lg text-xs font-black transition-colors ${
            isSelected
              ? "bg-red-600 text-white"
              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
          }`}
        >
          {isSelected ? "Selected" : "Details"}
        </button>
      </td>
    </motion.tr>
  );
};

// Subcomponent: Report Details
const ReportDetails = ({ report, onClose }: { report: any; onClose: () => void }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#0c0c0c] border border-zinc-900 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-zinc-900">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-black">Report Details</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-900 rounded-xl transition-colors"
            >
              ×
            </button>
          </div>
          
          <div className="flex items-center gap-3 text-sm text-zinc-400">
            <Calendar size={16} />
            <span>
              {new Date(report.report_date).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
                weekday: "long",
              })}
            </span>
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-4">
              <h4 className="font-black text-red-600">Income Summary</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Total Income</span>
                  <span className="font-black text-green-500">
                    Rp {(report.total_income || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>From Topup</span>
                  <span>Rp {(report.total_topup || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>From Orders</span>
                  <span>Rp {(report.total_order || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-black text-red-600">Orders Summary</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Completed Orders</span>
                  <span className="font-black text-green-500">{report.completed_orders || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pending Orders</span>
                  <span className="text-yellow-500">{report.pending_orders || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Success Rate</span>
                  <span className="font-black">
                    {report.completed_orders + report.pending_orders > 0
                      ? Math.round((report.completed_orders / (report.completed_orders + report.pending_orders)) * 100)
                      : 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h4 className="font-black text-red-600">Additional Metrics</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-zinc-900/50 p-4 rounded-2xl">
                <p className="text-sm text-zinc-400 mb-1">Active Users</p>
                <p className="text-2xl font-black">{report.active_users || 0}</p>
              </div>
              <div className="bg-zinc-900/50 p-4 rounded-2xl">
                <p className="text-sm text-zinc-400 mb-1">Avg Order Value</p>
                <p className="text-2xl font-black">
                  Rp {report.completed_orders > 0
                    ? Math.round((report.total_order || 0) / report.completed_orders).toLocaleString()
                    : "0"}
                </p>
              </div>
              <div className="bg-zinc-900/50 p-4 rounded-2xl">
                <p className="text-sm text-zinc-400 mb-1">Conversion Rate</p>
                <p className="text-2xl font-black">
                  {report.active_users > 0
                    ? Math.round((report.completed_orders / report.active_users) * 100)
                    : 0}%
                </p>
              </div>
              <div className="bg-zinc-900/50 p-4 rounded-2xl">
                <p className="text-sm text-zinc-400 mb-1">Revenue/User</p>
                <p className="text-2xl font-black">
                  Rp {report.active_users > 0
                    ? Math.round((report.total_income || 0) / report.active_users).toLocaleString()
                    : "0"}
                </p>
              </div>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-zinc-900">
            <p className="text-xs text-zinc-600">
              Report generated on: {new Date(report.updated_at || report.created_at).toLocaleString("id-ID")}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Subcomponent: Pagination Controls
const PaginationControls = ({ pagination }: { pagination: any }) => {
  return (
    <div className="flex items-center justify-between">
      <div className="text-sm text-zinc-500">
        Page {pagination.currentPage} of {pagination.totalPages}
      </div>
      
      <div className="flex items-center gap-2">
        <button
          onClick={pagination.prevPage}
          disabled={!pagination.hasPrevPage}
          className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm disabled:opacity-30"
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
                className={`w-8 h-8 rounded-lg text-sm ${
                  pagination.currentPage === pageNum
                    ? "bg-red-600 text-white font-black"
                    : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
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
          className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm disabled:opacity-30"
        >
          Next
        </button>
      </div>
    </div>
  );
};