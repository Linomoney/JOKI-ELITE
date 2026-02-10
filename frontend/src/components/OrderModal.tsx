"use client";
import { useState, useEffect } from "react";
import { X, Package, CheckCircle2, Loader2, AlertCircle, Shield, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { dbHelpers, supabase } from "@/lib/supabase";

interface OrderModalProps {
  user: any;
  packages: any[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function OrderModal({ user, packages, onClose, onSuccess }: OrderModalProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [form, setForm] = useState({
    project_name: "",
    details: "",
  });

  // Inisialisasi packages dengan array kosong jika undefined
  const safePackages = packages || [];

  // Load user profile saat modal terbuka - DIPERBAIKI
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user?.id) {
        console.error("❌ User ID tidak ditemukan");
        setError("User tidak valid. Silakan login ulang.");
        return;
      }

      try {
        console.log("🔍 Loading user profile for:", user.id);
        
        const { data: profile, error: profileError } = await supabase
          .from("user_profiles")
          .select("balance, full_name, phone, email")
          .eq("id", user.id)
          .single();

        if (profileError) {
          console.error("❌ Error loading profile:", profileError);
          
          // Coba ambil dari auth jika profile tidak ada
          const { data: authData } = await supabase.auth.getUser();
          if (authData.user) {
            setUserProfile({
              balance: 0,
              full_name: authData.user.user_metadata?.full_name || user.full_name || "User",
              phone: authData.user.user_metadata?.phone || user.phone || "",
              email: authData.user.email || user.email,
            });
          }
        } else if (profile) {
          console.log("✅ Profile loaded:", profile);
          setUserProfile(profile);
        }
      } catch (error) {
        console.error("🔥 Error loading profile:", error);
        setError("Gagal memuat profil user");
      }
    };

    loadUserProfile();
  }, [user?.id]);

  // Cek apakah balance cukup untuk paket yang dipilih
  const userBalance = userProfile?.balance || 0;
  const hasSufficientBalance = selectedPackage ? userBalance >= selectedPackage.price : false;

  const handleSelectPackage = (pkg: any) => {
    // Validasi paket
    if (!pkg || !pkg.price) {
      setError("Paket tidak valid");
      return;
    }

    setSelectedPackage(pkg);
    setError(""); // Clear error saat pilih paket

    // Cek balance saat memilih paket
    if (userBalance < pkg.price) {
      setError(`Saldo tidak cukup. Saldo Anda: Rp ${userBalance.toLocaleString()}. Dibutuhkan: Rp ${pkg.price.toLocaleString()}`);
    }

    setStep(2);
  };

  const handleConfirmOrder = () => {
    // Validasi sebelum konfirmasi
    if (!form.project_name.trim()) {
      setError("Nama project wajib diisi");
      return;
    }

    if (!selectedPackage) {
      setError("Silakan pilih paket terlebih dahulu");
      return;
    }

    if (!hasSufficientBalance) {
      setError("Saldo tidak cukup untuk paket ini");
      return;
    }

    setStep(2.5); // Step konfirmasi
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError("");

      // Validasi lengkap
      if (!user?.id) {
        throw new Error("User tidak valid");
      }

      if (!selectedPackage) {
        throw new Error("Pilih paket terlebih dahulu");
      }

      if (!form.project_name.trim()) {
        throw new Error("Nama project wajib diisi");
      }

      // Double check balance
      const { data: currentProfile, error: profileError } = await supabase
        .from("user_profiles")
        .select("balance")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("Profile error:", profileError);
        throw new Error("Gagal memeriksa saldo: " + profileError.message);
      }

      const currentBalance = currentProfile?.balance || 0;
      if (currentBalance < selectedPackage.price) {
        throw new Error(`Saldo tidak cukup. Saldo Anda: Rp ${currentBalance.toLocaleString()}. Dibutuhkan: Rp ${selectedPackage.price.toLocaleString()}`);
      }

      // Prepare order data
      const orderData = {
        user_id: user.id,
        package_id: selectedPackage.id,
        project_name: form.project_name.trim(),
        details: form.details?.trim() || null,
        package_name: selectedPackage.name,
        package_price: Number(selectedPackage.price),
        client_name: userProfile?.full_name || user.full_name || null,
        client_contact: userProfile?.phone || user.phone || null,
        client_email: userProfile?.email || user.email || null,
        status: "processing",
        progress: 10,
      };

      console.log("📦 Sending order data:", orderData);

      const order = await dbHelpers.createOrder(orderData);

      setStep(3);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (error: any) {
      console.error("Submit error:", error);
      setError(error.message || "Gagal membuat order");
      setStep(2); // Kembali ke step 2 jika error
    } finally {
      setLoading(false);
    }
  };

  const fadeIn = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1 },
  };

  const slideUp = {
    hidden: { y: 50, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        className="bg-[#0c0c0c] border border-zinc-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="text-red-600" size={24} />
            <h2 className="text-xl font-black uppercase">Create New Order</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center">
              <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center ${step >= 1 ? "bg-red-600" : "bg-zinc-800"}`}>
                <span className="font-black text-sm md:text-base">1</span>
              </div>
              <div className={`w-16 md:w-24 h-1 ${step >= 2 ? "bg-red-600" : "bg-zinc-800"}`} />
              <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center ${step >= 2 ? "bg-red-600" : "bg-zinc-800"}`}>
                <span className="font-black text-sm md:text-base">2</span>
              </div>
              <div className={`w-16 md:w-24 h-1 ${step >= 2.5 ? "bg-red-600" : "bg-zinc-800"}`} />
              <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center ${step >= 2.5 ? "bg-red-600" : "bg-zinc-800"}`}>
                <span className="font-black text-sm md:text-base">3</span>
              </div>
              <div className={`w-16 md:w-24 h-1 ${step >= 3 ? "bg-red-600" : "bg-zinc-800"}`} />
              <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center ${step >= 3 ? "bg-red-600" : "bg-zinc-800"}`}>
                <span className="font-black text-sm md:text-base">4</span>
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {/* Step 1: Select Package */}
            {step === 1 && (
              <motion.div key="step1" variants={fadeIn} initial="hidden" animate="visible" exit="hidden" className="space-y-6">
                <div className="bg-zinc-900/50 p-4 rounded-xl mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-zinc-400">Your Balance</p>
                      <p className="text-2xl font-black text-green-500">
                        {userProfile ? `Rp ${userBalance.toLocaleString()}` : "Loading..."}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-zinc-400">Minimal Order</p>
                      <p className="text-lg font-black">Rp 25,000</p>
                    </div>
                  </div>
                </div>

                <h3 className="text-lg font-black text-center mb-6">Select Package</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {safePackages.length === 0 ? (
                    <div className="col-span-2 text-center py-8">
                      <Package className="text-zinc-800 mx-auto mb-4" size={48} />
                      <p className="text-zinc-600">No packages available</p>
                      <p className="text-zinc-500 text-sm mt-2">Please contact support to add packages</p>
                    </div>
                  ) : (
                    safePackages
                      .filter((pkg) => pkg && pkg.active !== false)
                      .map((pkg) => {
                        const canAfford = userBalance >= pkg.price;
                        return (
                          <motion.button
                            key={pkg.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleSelectPackage(pkg)}
                            disabled={!canAfford}
                            className={`p-6 rounded-2xl text-left transition-all ${
                              canAfford
                                ? "bg-zinc-900/50 border border-zinc-800 hover:border-red-600"
                                : "bg-zinc-900/20 border border-zinc-700 opacity-60 cursor-not-allowed"
                            }`}
                          >
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h4 className="font-black text-lg text-red-600">{pkg.name}</h4>
                                <p className="text-sm text-zinc-400">{pkg.description}</p>
                              </div>
                              <div className="text-right">
                                <p className={`text-2xl font-black ${canAfford ? "text-white" : "text-red-500"}`}>
                                  Rp {pkg.price?.toLocaleString() || "0"}
                                </p>
                                <p className="text-[10px] text-zinc-600">{pkg.duration_days || 1} days</p>
                              </div>
                            </div>

                            <div className="mb-4">
                              {canAfford ? (
                                <div className="flex items-center gap-2 text-green-500 text-sm">
                                  <CheckCircle2 size={14} />
                                  <span>Balance sufficient</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 text-red-500 text-sm">
                                  <AlertCircle size={14} />
                                  <span>Need Rp {((pkg.price || 0) - userBalance).toLocaleString()} more</span>
                                </div>
                              )}
                            </div>

                            <ul className="space-y-2">
                              {pkg.features?.map((feature: string, i: number) => (
                                <li key={i} className="text-sm flex items-center gap-2">
                                  <CheckCircle2 size={14} className="text-green-500" />
                                  <span>{feature}</span>
                                </li>
                              ))}
                            </ul>
                          </motion.button>
                        );
                      })
                  )}
                </div>
              </motion.div>
            )}

            {/* Step 2: Order Details */}
            {step === 2 && (
              <motion.div key="step2" variants={slideUp} initial="hidden" animate="visible" exit="hidden" className="space-y-6">
                {/* Package Summary */}
                {selectedPackage && (
                  <div className="bg-red-600/10 border border-red-600/30 p-4 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-black text-red-600">{selectedPackage.name}</h4>
                        <p className="text-sm text-zinc-400">Rp {selectedPackage.price?.toLocaleString() || "0"}</p>
                      </div>
                      <button onClick={() => setStep(1)} className="text-sm text-zinc-400 hover:text-white">
                        Change Package
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-400">Your balance:</span>
                      <span className="font-black text-green-500">Rp {userBalance.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-2">
                      <span className="text-zinc-400">After purchase:</span>
                      <span className={`font-black ${hasSufficientBalance ? "text-green-500" : "text-red-500"}`}>
                        Rp {(userBalance - (selectedPackage.price || 0)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                {/* Client Info */}
                <div className="bg-zinc-900/50 p-4 rounded-xl">
                  <h4 className="font-black text-sm mb-3">Client Information</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-400">Name:</span>
                      <span className="font-black">{userProfile?.full_name || user?.full_name || "-"}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-400">Phone:</span>
                      <span className="font-black">{userProfile?.phone || user?.phone || "-"}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-400">Email:</span>
                      <span className="font-black">{userProfile?.email || user?.email || "-"}</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-zinc-600 mt-3">
                    Data diambil dari database. Untuk mengubah, update di Settings.
                  </p>
                </div>

                <h3 className="text-lg font-black">Order Details</h3>

                {error && (
                  <div className="bg-red-600/10 border border-red-600/30 p-4 rounded-xl">
                    <p className="text-red-500 text-sm">{error}</p>
                  </div>
                )}

                {selectedPackage && !hasSufficientBalance && (
                  <div className="bg-yellow-600/10 border border-yellow-600/30 p-4 rounded-xl">
                    <div className="flex items-center gap-2">
                      <AlertCircle size={16} className="text-yellow-500" />
                      <p className="text-yellow-500 text-sm">
                        Balance insufficient! Need Rp {((selectedPackage.price || 0) - userBalance).toLocaleString()} more.
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-black text-zinc-400 mb-2 block">Project Name *</label>
                    <input
                      type="text"
                      value={form.project_name}
                      onChange={(e) => setForm({ ...form, project_name: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 px-4 py-3 rounded-xl outline-none focus:border-red-600"
                      placeholder="e.g., Website E-commerce"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-black text-zinc-400 mb-2 block">Project Details</label>
                    <textarea
                      value={form.details}
                      onChange={(e) => setForm({ ...form, details: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 px-4 py-3 rounded-xl outline-none focus:border-red-600 h-32"
                      placeholder="Describe your project requirements..."
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-6">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 py-3 bg-zinc-800 border border-zinc-700 rounded-xl font-black hover:bg-zinc-700 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleConfirmOrder}
                    disabled={!form.project_name.trim() || !hasSufficientBalance || !selectedPackage}
                    className="flex-1 py-3 bg-red-600 text-white rounded-xl font-black hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Shield size={20} />
                    Continue to Confirm
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 2.5: Confirmation */}
            {step === 2.5 && selectedPackage && (
              <motion.div
                key="step2.5"
                variants={slideUp}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className="space-y-6"
              >
                {/* Warning Banner */}
                <div className="bg-yellow-600/10 border border-yellow-600/30 p-6 rounded-xl">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="text-yellow-500 mt-1" size={24} />
                    <div>
                      <h3 className="font-black text-lg text-yellow-500 mb-2">⚠️ Please Confirm Your Order</h3>
                      <p className="text-yellow-500/80 text-sm">
                        Pastikan semua data sudah benar. Setelah order dibuat, saldo akan langsung dipotong dan order tidak dapat dibatalkan.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Order Summary */}
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                  <h4 className="font-black text-lg mb-4 text-center">Order Summary</h4>
                  
                  <div className="space-y-4">
                    {/* Package Info */}
                    <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                      <div>
                        <p className="font-black text-red-600">{selectedPackage.name}</p>
                        <p className="text-sm text-zinc-400">{selectedPackage.description}</p>
                      </div>
                      <p className="text-xl font-black">Rp {selectedPackage.price?.toLocaleString() || "0"}</p>
                    </div>

                    {/* Project Details */}
                    <div className="space-y-2">
                      <p className="text-sm text-zinc-400">Project Name:</p>
                      <p className="font-black p-2 bg-zinc-800/30 rounded-lg">{form.project_name}</p>
                    </div>

                    {form.details && (
                      <div className="space-y-2">
                        <p className="text-sm text-zinc-400">Project Details:</p>
                        <p className="text-sm p-2 bg-zinc-800/30 rounded-lg whitespace-pre-line">{form.details}</p>
                      </div>
                    )}

                    {/* Client Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4 border-t border-zinc-800">
                      <div>
                        <p className="text-xs text-zinc-400">Client Name</p>
                        <p className="font-black text-sm">{userProfile?.full_name || user?.full_name || "-"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-400">Contact</p>
                        <p className="font-black text-sm">{userProfile?.phone || user?.phone || "-"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-400">Email</p>
                        <p className="font-black text-sm truncate">{userProfile?.email || user?.email || "-"}</p>
                      </div>
                    </div>

                    {/* Balance Info */}
                    <div className="space-y-2 p-3 bg-gradient-to-r from-red-600/10 to-red-600/5 border border-red-600/30 rounded-lg">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-zinc-400">Current Balance:</p>
                        <p className="font-black text-green-500">Rp {userBalance.toLocaleString()}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-zinc-400">Order Amount:</p>
                        <p className="font-black text-red-600">- Rp {selectedPackage.price?.toLocaleString() || "0"}</p>
                      </div>
                      <div className="flex items-center justify-between border-t border-red-600/30 pt-2 mt-2">
                        <p className="text-sm text-zinc-400">New Balance:</p>
                        <p className="font-black text-green-500">Rp {(userBalance - (selectedPackage.price || 0)).toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Terms & Conditions */}
                    <div className="bg-zinc-800/30 p-4 rounded-lg">
                      <div className="flex items-start gap-2 mb-2">
                        <Info size={16} className="text-zinc-400 mt-0.5" />
                        <p className="text-xs text-zinc-400">
                          Dengan menekan "Confirm & Pay", Anda menyetujui bahwa:
                        </p>
                      </div>
                      <ul className="text-xs text-zinc-500 space-y-1 ml-6">
                        <li>• Saldo akan langsung dipotong</li>
                        <li>• Order tidak dapat dibatalkan setelah dibuat</li>
                        <li>• Proses pengerjaan akan dimulai dalam 1x24 jam</li>
                        <li>• Perubahan detail project dikenakan biaya tambahan</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    onClick={() => setStep(2)}
                    className="flex-1 py-3 bg-zinc-800 border border-zinc-700 rounded-xl font-black hover:bg-zinc-700 transition-colors"
                  >
                    Back to Edit
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-1 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-black hover:from-red-700 hover:to-red-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="animate-spin" size={20} />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Shield size={20} />
                        Confirm & Pay
                      </>
                    )}
                  </button>
                </div>

                {error && (
                  <div className="bg-red-600/10 border border-red-600/30 p-4 rounded-xl">
                    <div className="flex items-center gap-2">
                      <AlertCircle size={16} className="text-red-600" />
                      <p className="text-red-500 text-sm">{error}</p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 3: Success */}
            {step === 3 && selectedPackage && (
              <motion.div key="step3" variants={fadeIn} initial="hidden" animate="visible" exit="hidden" className="text-center py-12">
                <div className="w-20 h-20 bg-green-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="text-green-500" size={40} />
                </div>
                <h3 className="text-2xl font-black mb-4">Order Created Successfully!</h3>
                <p className="text-zinc-400 mb-8">
                  Your order has been submitted. Our team will contact you soon.
                </p>
                <div className="bg-zinc-900/50 p-6 rounded-xl max-w-md mx-auto">
                  <div className="text-left space-y-2">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Package:</span>
                      <span className="font-black">{selectedPackage.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Amount:</span>
                      <span className="font-black text-red-600">Rp {selectedPackage.price?.toLocaleString() || "0"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Project:</span>
                      <span className="font-black">{form.project_name}</span>
                    </div>
                    <div className="flex justify-between border-t border-zinc-800 pt-2 mt-2">
                      <span className="text-zinc-400">New Balance:</span>
                      <span className="font-black text-green-500">
                        Rp {(userBalance - (selectedPackage.price || 0)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-8 space-y-3">
                  <p className="text-sm text-zinc-600">What's next?</p>
                  <div className="flex flex-col md:flex-row gap-2 justify-center">
                    <button
                      onClick={onClose}
                      className="px-6 py-3 bg-red-600 text-white font-black rounded-xl hover:bg-red-700 transition-colors"
                    >
                      Back to Dashboard
                    </button>
                    <a
                      href="https://wa.me/6285710821547"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-6 py-3 bg-green-600 text-white font-black rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Package size={18} />
                      Contact Support
                    </a>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}