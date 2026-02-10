"use client";
import { useState, useEffect } from "react"; // TAMBAH useEffect
import { Package as PackageIcon, CheckCircle2, Plus, Loader2, Search, Filter, Star, TrendingUp } from "lucide-react";
import { dbHelpers, supabase } from "@/lib/supabase"; // TAMBAH supabase
import { motion } from "framer-motion";
import { usePagination } from "@/hooks/usePagination";
import { useDebounce } from "@/hooks/useDebounce";

interface PackagesTabProps {
  packages: any[];
  onRefresh: () => void;
}

export default function PackagesTab({ packages, onRefresh }: PackagesTabProps) {
  const [packageForm, setPackageForm] = useState({
    package_code: "",
    name: "",
    description: "",
    price: 0,
    features: [] as string[],
    duration_days: 3,
    active: true,
    is_popular: false,
  });
  const [featureInput, setFeatureInput] = useState("");
  const [editingPackage, setEditingPackage] = useState<any>(null);
  const [packageFilter, setPackageFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [localPackages, setLocalPackages] = useState<any[]>(packages); // TAMBAH LOCAL STATE

  const debouncedSearch = useDebounce(searchTerm, 300);

  // Sync dengan props packages
  useEffect(() => {
    setLocalPackages(packages);
  }, [packages]);

  // REAL-TIME SUBSCRIPTION UNTUK PACKAGES
  useEffect(() => {
    console.log("📦 Setting up real-time subscription for packages...");

    const channel = supabase
      .channel("packages-realtime-tab")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "packages",
        },
        (payload) => {
          console.log("📦 Package real-time update in tab:", payload);

          setLocalPackages((prev) => {
            if (payload.eventType === "INSERT") {
              // Tambah di awal array
              return [payload.new, ...prev];
            } else if (payload.eventType === "UPDATE") {
              // Update item yang ada
              return prev.map((item) => (item.id === payload.new.id ? payload.new : item));
            } else if (payload.eventType === "DELETE") {
              // Hapus item
              return prev.filter((item) => item.id !== payload.old.id);
            }
            return prev;
          });
        },
      )
      .subscribe((status) => {
        console.log("📦 Package subscription status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
      console.log("🧹 Cleanup package subscription");
    };
  }, []);

  // Filter packages menggunakan localPackages
  const filteredPackages = localPackages.filter((pkg) => {
    // Filter by status
    if (packageFilter === "active" && !pkg.active) return false;
    if (packageFilter === "inactive" && pkg.active) return false;
    if (packageFilter === "popular" && !pkg.is_popular) return false;

    // Filter by search
    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
      return pkg.name.toLowerCase().includes(searchLower) || pkg.description?.toLowerCase().includes(searchLower) || pkg.package_code.toLowerCase().includes(searchLower);
    }

    return true;
  });

  const pagination = usePagination(filteredPackages, 8);

  const handleSavePackage = async () => {
    if (!packageForm.name.trim() || packageForm.price <= 0) {
      alert("Nama paket dan harga harus diisi!");
      return;
    }

    setLoading(true);
    try {
      if (editingPackage) {
        await dbHelpers.updatePackage(editingPackage.id, {
          ...packageForm,
          updated_at: new Date().toISOString(),
        });

        // OPTIONAL: Update local state langsung untuk feedback lebih cepat
        setLocalPackages((prev) => prev.map((pkg) => (pkg.id === editingPackage.id ? { ...pkg, ...packageForm, updated_at: new Date().toISOString() } : pkg)));
      } else {
        const newPackage = await dbHelpers.createPackage({
          ...packageForm,
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        // OPTIONAL: Tambah ke local state langsung
        setLocalPackages((prev) => [newPackage, ...prev]);
      }

      // Reset form
      setPackageForm({
        package_code: "",
        name: "",
        description: "",
        price: 0,
        features: [],
        duration_days: 3,
        active: true,
        is_popular: false,
      });
      setEditingPackage(null);
      setFeatureInput("");

      // Refresh data parent (optional, karena sudah ada real-time)
      // onRefresh();
    } catch (error: any) {
      console.error("Save package error:", error);
      alert("Gagal menyimpan paket: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (pkg: any) => {
    try {
      await dbHelpers.updatePackage(pkg.id, {
        active: !pkg.active,
        updated_at: new Date().toISOString(),
      });
      // Update local state langsung
      setLocalPackages((prev) => prev.map((item) => (item.id === pkg.id ? { ...item, active: !pkg.active, updated_at: new Date().toISOString() } : item)));
    } catch (error: any) {
      console.error("Toggle active error:", error);
      alert("Gagal mengubah status: " + error.message);
    }
  };

  const handleDeletePackage = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus paket ini?")) return;

    try {
      await dbHelpers.deletePackage(id);
      // Update local state langsung
      setLocalPackages((prev) => prev.filter((pkg) => pkg.id !== id));
    } catch (error: any) {
      console.error("Delete package error:", error);
      alert("Gagal menghapus paket: " + error.message);
    }
  };

  const handleTogglePopular = async (pkg: any) => {
    try {
      await dbHelpers.updatePackage(pkg.id, {
        is_popular: !pkg.is_popular,
        updated_at: new Date().toISOString(),
      });
      // Update local state langsung
      setLocalPackages((prev) => prev.map((item) => (item.id === pkg.id ? { ...item, is_popular: !pkg.is_popular, updated_at: new Date().toISOString() } : item)));
    } catch (error: any) {
      console.error("Toggle popular error:", error);
      alert("Gagal mengubah status popular: " + error.message);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Form Section */}
      <div className="lg:col-span-4">
        <div className="bg-[#0c0c0c] p-6 rounded-3xl border border-zinc-900 sticky top-24">
          <div className="flex items-center gap-3 mb-6 border-b border-zinc-900 pb-4">
            <PackageIcon size={18} className="text-red-600" />
            <h2 className="text-sm font-black uppercase tracking-wider">{editingPackage ? "Edit Package" : "Create Package"}</h2>
            {/* TAMBAH REAL-TIME INDICATOR */}
            <div className="ml-auto flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[10px] text-green-500 font-mono">LIVE</span>
            </div>
          </div>

          <div className="space-y-4">
            <input
              placeholder="Package Code (e.g., PKG-001)"
              value={packageForm.package_code}
              onChange={(e) => setPackageForm({ ...packageForm, package_code: e.target.value })}
              className="w-full bg-black border border-zinc-800 p-3 rounded-xl text-sm focus:border-red-600 outline-none"
            />

            <input
              placeholder="Package Name"
              value={packageForm.name}
              onChange={(e) => setPackageForm({ ...packageForm, name: e.target.value })}
              className="w-full bg-black border border-zinc-800 p-3 rounded-xl text-sm focus:border-red-600 outline-none"
            />

            <textarea
              placeholder="Description"
              value={packageForm.description}
              onChange={(e) => setPackageForm({ ...packageForm, description: e.target.value })}
              className="w-full bg-black border border-zinc-800 p-3 rounded-xl text-sm h-24 resize-none focus:border-red-600 outline-none"
              rows={4}
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Price (Rp)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={packageForm.price === 0 ? "" : packageForm.price}
                  onChange={(e) => {
                    const value = e.target.value;
                    setPackageForm({
                      ...packageForm,
                      price: value === "" ? 0 : parseInt(value),
                    });
                  }}
                  className="w-full bg-black border border-zinc-800 p-3 rounded-xl text-sm focus:border-red-600 outline-none"
                  min="0"
                  step="1000"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Duration (Days)</label>
                <input
                  type="number"
                  placeholder="3"
                  value={packageForm.duration_days}
                  onChange={(e) => {
                    const value = e.target.value;
                    setPackageForm({
                      ...packageForm,
                      duration_days: value === "" ? 1 : parseInt(value),
                    });
                  }}
                  className="w-full bg-black border border-zinc-800 p-3 rounded-xl text-sm focus:border-red-600 outline-none"
                  min="1"
                />
              </div>
            </div>

            {/* TAMBAH CHECKBOX UNTUK POPULAR */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 p-3 bg-zinc-900/50 rounded-xl">
                <input type="checkbox" id="is_active" checked={packageForm.active} onChange={(e) => setPackageForm({ ...packageForm, active: e.target.checked })} className="w-4 h-4 accent-red-600" />
                <label htmlFor="is_active" className="text-sm text-zinc-400">
                  Active
                </label>
              </div>

              <div className="flex items-center gap-2 p-3 bg-zinc-900/50 rounded-xl">
                <input type="checkbox" id="is_popular" checked={packageForm.is_popular} onChange={(e) => setPackageForm({ ...packageForm, is_popular: e.target.checked })} className="w-4 h-4 accent-yellow-500" />
                <label htmlFor="is_popular" className="text-sm text-zinc-400 flex items-center gap-1">
                  <Star size={14} className="text-yellow-500" />
                  Popular
                </label>
              </div>
            </div>

            <div>
              <label className="text-xs text-zinc-500 mb-2 block">Features</label>
              <div className="flex gap-2 mb-2">
                <input
                  placeholder="Add feature (press Enter)"
                  value={featureInput}
                  onChange={(e) => setFeatureInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && featureInput.trim()) {
                      setPackageForm({
                        ...packageForm,
                        features: [...packageForm.features, featureInput.trim()],
                      });
                      setFeatureInput("");
                    }
                  }}
                  className="flex-1 bg-black border border-zinc-800 p-3 rounded-xl text-sm focus:border-red-600 outline-none"
                />
                <button
                  onClick={() => {
                    if (featureInput.trim()) {
                      setPackageForm({
                        ...packageForm,
                        features: [...packageForm.features, featureInput.trim()],
                      });
                      setFeatureInput("");
                    }
                  }}
                  className="px-4 py-3 bg-red-600 rounded-xl text-sm hover:bg-red-700 transition-colors"
                >
                  Add
                </button>
              </div>

              <div className="space-y-2 max-h-32 overflow-y-auto">
                {packageForm.features.map((f, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-zinc-900 rounded-lg text-sm group hover:bg-zinc-800 transition-colors">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 size={12} className="text-green-500 flex-shrink-0" />
                      <span className="truncate">{f}</span>
                    </span>
                    <button
                      onClick={() => {
                        const newFeatures = [...packageForm.features];
                        newFeatures.splice(i, 1);
                        setPackageForm({ ...packageForm, features: newFeatures });
                      }}
                      className="text-red-600 hover:text-red-400 text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={handleSavePackage} disabled={loading} className="flex-1 py-3 bg-red-600 rounded-xl font-black hover:bg-red-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? (
                  <Loader2 className="animate-spin mx-auto" size={20} />
                ) : editingPackage ? (
                  "Update Package"
                ) : (
                  <>
                    <Plus size={18} className="inline mr-2" />
                    Create Package
                  </>
                )}
              </button>

              {editingPackage && (
                <button
                  onClick={() => {
                    setPackageForm({
                      package_code: "",
                      name: "",
                      description: "",
                      price: 0,
                      features: [],
                      duration_days: 3,
                      active: true,
                      is_popular: false,
                    });
                    setEditingPackage(null);
                    setFeatureInput("");
                  }}
                  className="px-4 py-3 bg-zinc-800 rounded-xl font-black hover:bg-zinc-700 transition-colors text-sm"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Packages List */}
      <div className="lg:col-span-8">
        <div className="bg-[#0c0c0c] rounded-3xl border border-zinc-900 overflow-hidden">
          {/* Header with Filters */}
          <div className="p-4 md:p-6 border-b border-zinc-900">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="text-lg font-black">Packages List</h3>
                <div className="flex items-center gap-2 mt-1">
                  <div className="text-xs px-2 py-1 bg-red-600/20 text-red-500 rounded">{localPackages.filter((p) => p.is_popular).length} Popular</div>
                  <div className="text-xs px-2 py-1 bg-green-600/20 text-green-500 rounded">{localPackages.filter((p) => p.active).length} Active</div>
                  {/* TAMBAH COUNTER REAL-TIME */}
                  <div className="text-xs px-2 py-1 bg-blue-600/20 text-blue-500 rounded flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                    {localPackages.length} Total
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                  <input
                    type="text"
                    placeholder="Search packages..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-black border border-zinc-800 rounded-lg text-sm w-full md:w-64 focus:border-red-600 outline-none"
                  />
                </div>

                <select value={packageFilter} onChange={(e) => setPackageFilter(e.target.value)} className="bg-black border border-zinc-800 px-3 py-2 rounded-lg text-sm focus:border-red-600 outline-none">
                  <option value="all">All Packages</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive</option>
                  <option value="popular">Popular Only</option>
                </select>
              </div>
            </div>
          </div>

          {/* Packages Grid - gunakan filteredPackages */}
          {filteredPackages.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 md:p-6">
                {pagination.currentItems.map((pkg) => (
                  <PackageCard
                    key={pkg.id}
                    pkg={pkg}
                    onEdit={() => {
                      setPackageForm({
                        package_code: pkg.package_code || "",
                        name: pkg.name || "",
                        description: pkg.description || "",
                        price: pkg.price || 0,
                        features: pkg.features || [],
                        duration_days: pkg.duration_days || 3,
                        active: pkg.active || true,
                        is_popular: pkg.is_popular || false,
                      });
                      setEditingPackage(pkg);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    onDelete={() => handleDeletePackage(pkg.id)}
                    onToggleActive={() => handleToggleActive(pkg)}
                    onTogglePopular={() => handleTogglePopular(pkg)}
                  />
                ))}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="p-4 border-t border-zinc-900">
                  <PaginationControls pagination={pagination} />
                </div>
              )}
            </>
          ) : (
            <div className="py-12 text-center">
              <PackageIcon size={48} className="text-zinc-700 mx-auto mb-4" />
              <p className="text-zinc-600 text-sm">No packages found</p>
              {(debouncedSearch || packageFilter !== "all") && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setPackageFilter("all");
                  }}
                  className="mt-2 text-red-600 hover:text-red-500 text-sm"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Subcomponent: Package Card - MODIFIED
const PackageCard = ({
  pkg,
  onEdit,
  onDelete,
  onToggleActive,
  onTogglePopular, // TAMBAH PROPS
}: {
  pkg: any;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  onTogglePopular: () => void; // TAMBAH PROPS
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`bg-zinc-900/50 border rounded-2xl p-4 transition-all hover:border-red-600/30 group ${pkg.is_popular ? "border-yellow-600/30 hover:border-yellow-500/50" : "border-zinc-800"}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <h4 className="font-black text-red-600">{pkg.name}</h4>
            {pkg.is_popular && (
              <div className="absolute -top-2 -left-2">
                <Star size={16} className="text-yellow-500 fill-yellow-500" />
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            <span className={`px-2 py-1 text-xs rounded ${pkg.active ? "bg-green-600/20 text-green-500" : "bg-red-600/20 text-red-500"}`}>{pkg.active ? "ACTIVE" : "INACTIVE"}</span>
            {pkg.is_popular && (
              <span className="px-2 py-1 text-xs rounded bg-yellow-600/20 text-yellow-500 flex items-center gap-1">
                <Star size={10} />
                POPULAR
              </span>
            )}
          </div>
        </div>

        <div className="text-right">
          <p className="text-2xl font-black">Rp {pkg.price.toLocaleString()}</p>
          <p className="text-xs text-zinc-600 mt-1">
            {pkg.duration_days} days • {pkg.package_code}
          </p>
        </div>
      </div>

      <p className="text-sm text-zinc-400 mb-4 line-clamp-2">{pkg.description}</p>

      {pkg.features && pkg.features.length > 0 && (
        <ul className="space-y-1 mb-4">
          {pkg.features.slice(0, 3).map((f: string, i: number) => (
            <li key={i} className="text-sm text-zinc-500 flex items-center gap-2">
              <CheckCircle2 size={12} className="text-red-600 flex-shrink-0" />
              <span className="truncate">{f}</span>
            </li>
          ))}
          {pkg.features.length > 3 && <li className="text-xs text-zinc-600">+{pkg.features.length - 3} more features</li>}
        </ul>
      )}

      <div className="flex gap-2">
        <button onClick={onEdit} className="flex-1 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs font-black transition-colors flex items-center justify-center gap-1">
          Edit
        </button>
        <button onClick={onToggleActive} className={`px-3 py-2 rounded-lg text-xs font-black transition-colors ${pkg.active ? "bg-red-600/20 text-red-500 hover:bg-red-600/30" : "bg-green-600/20 text-green-500 hover:bg-green-600/30"}`}>
          {pkg.active ? "Deactivate" : "Activate"}
        </button>
        <button
          onClick={onTogglePopular}
          className={`px-3 py-2 rounded-lg text-xs font-black transition-colors flex items-center gap-1 ${pkg.is_popular ? "bg-yellow-600/20 text-yellow-500 hover:bg-yellow-600/30" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}
          title={pkg.is_popular ? "Unmark as popular" : "Mark as popular"}
        >
          <Star size={12} className={pkg.is_popular ? "fill-yellow-500" : ""} />
        </button>
        <button onClick={onDelete} className="px-3 py-2 bg-red-600/20 text-red-600 hover:bg-red-600/30 rounded-lg text-xs font-black">
          Delete
        </button>
      </div>
    </motion.div>
  );
};

// Subcomponent: Pagination Controls
const PaginationControls = ({ pagination }: { pagination: any }) => {
  return (
    <div className="flex items-center justify-center gap-2">
      <button onClick={pagination.prevPage} disabled={!pagination.hasPrevPage} className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm disabled:opacity-30 disabled:cursor-not-allowed">
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
              className={`w-8 h-8 rounded-lg text-sm font-black ${pagination.currentPage === pageNum ? "bg-red-600 text-white" : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"}`}
            >
              {pageNum}
            </button>
          );
        })}

        {pagination.totalPages > 5 && pagination.currentPage < pagination.totalPages - 2 && (
          <>
            <span className="text-zinc-600">...</span>
            <button onClick={() => pagination.goToPage(pagination.totalPages)} className="w-8 h-8 rounded-lg bg-zinc-900 text-zinc-400 hover:bg-zinc-800 text-sm">
              {pagination.totalPages}
            </button>
          </>
        )}
      </div>

      <button onClick={pagination.nextPage} disabled={!pagination.hasNextPage} className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm disabled:opacity-30 disabled:cursor-not-allowed">
        Next
      </button>
    </div>
  );
};
