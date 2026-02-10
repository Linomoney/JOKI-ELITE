"use client";
import { useEffect, useState } from "react";
import { X, CreditCard, Banknote, QrCode, Loader2, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

interface TopupModalProps {
  user: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TopupModal({ user, onClose, onSuccess }: TopupModalProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [paymentData, setPaymentData] = useState<any>(null);
  const [activeTopups, setActiveTopups] = useState<any[]>([]);
  const [form, setForm] = useState({
    amount: "",
    payment_method: "duitku_qris",
  });

  useEffect(() => {
  fetchActiveTopups();
}, []);

  // DuitKu Payment Methods
  const paymentMethods = [
    {
      id: "duitku_qris",
      name: "QRIS",
      icon: QrCode,
      description: "Scan QR untuk membayar",
      code: "SP",
    },
    {
      id: "duitku_bank",
      name: "Bank Transfer",
      icon: Banknote,
      description: "Transfer ke Virtual Account",
      code: "B1", // BCA VA
    },
    {
      id: "duitku_ewallet",
      name: "E-Wallet",
      icon: CreditCard,
      description: "OVO, Dana, GoPay, etc",
      code: "OV", // OVO
    },
  ];

  // Cek apakah ada pending topup
  const hasPendingTopup = activeTopups.some((t) => t.status === "pending" && new Date(t.expires_at) > new Date());

  // Di TopupModal.tsx - perbaiki handleSubmit
  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError("");

      if (!form.amount || parseFloat(form.amount) < 10000) {
        setError("Minimum topup Rp 10,000");
        setLoading(false);
        return;
      }

      if (parseFloat(form.amount) > 10000000) {
        setError("Maximum topup Rp 10,000,000");
        setLoading(false);
        return;
      }

      // Validasi user
      if (!user?.id) {
        setError("User tidak valid. Silakan login ulang.");
        setLoading(false);
        return;
      }

      // Panggil API DuitKu
      const selectedMethod = paymentMethods.find((m) => m.id === form.payment_method);

      console.log("📤 Sending payment request:", {
        userId: user.id,
        amount: parseFloat(form.amount),
        paymentMethod: selectedMethod?.code,
      });

      const response = await fetch("/api/payment/duitku", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          amount: parseFloat(form.amount),
          email: user.email,
          phone: user.phone || "081234567890",
          paymentMethod: selectedMethod?.code || "SP",
          paymentMethodName: selectedMethod?.name || "QRIS",
        }),
      });

      const responseText = await response.text();
      let data;

      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error("❌ Invalid JSON response:", responseText);
        throw new Error("Respon server tidak valid");
      }

      console.log("📥 Payment response:", data);

      if (!response.ok) {
        throw new Error(data.error || data.message || "Payment failed");
      }

      // Simpan payment data untuk ditampilkan
      setPaymentData({
        ...data,
        amount: parseFloat(form.amount),
        method: selectedMethod?.name || "QRIS",
        expiresAt: data.expiresAt || new Date(Date.now() + 3600000).toISOString(),
      });

      // Redirect ke halaman pembayaran DuitKu
      if (data.redirectUrl) {
        window.open(data.redirectUrl, "_blank");
        setStep(3);
      } else {
        throw new Error("Payment URL tidak tersedia");
      }

      setError(""); // Clear error jika sukses
    } catch (error: any) {
      console.error("🔥 Payment error:", error);
      setError(error.message || "Gagal memproses pembayaran. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveTopups = async () => {
    try {
      const response = await fetch(`/api/topup/active?userId=${user.id}`);
      const data = await response.json();

      if (data.success) {
        setActiveTopups(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch active topups:", error);
    }
  };

  const handleCancelTopup = async (topupId: string) => {
    if (!confirm("Apakah Anda yakin ingin membatalkan topup ini?")) return;

    try {
      const response = await fetch("/api/topup/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topupId,
          userId: user.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Cancel failed");
      }

      // Refresh active topups
      setActiveTopups((prev) => prev.filter((t) => t.id !== topupId));
      setError("");
      setSuccess("Topup berhasil dibatalkan");
    } catch (error: any) {
      setError(error.message || "Gagal membatalkan topup");
    }
  };

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#0c0c0c] border border-zinc-800 rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-[#0c0c0c] z-10">
          <div className="flex items-center gap-3">
            <CreditCard className="text-green-500" size={24} />
            <h2 className="text-xl font-black uppercase">Topup Balance</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {/* Warning jika ada pending topup */}
          {hasPendingTopup && (
            <div className="mb-6 p-4 bg-yellow-600/10 border border-yellow-600/30 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={16} className="text-yellow-500" />
                <p className="text-yellow-500 font-bold">Anda memiliki topup pending</p>
              </div>
              <p className="text-sm text-yellow-600 mb-3">Selesaikan atau batalkan topup yang pending sebelum membuat yang baru.</p>
              <div className="space-y-2">
                {activeTopups
                  .filter((t) => t.status === "pending" && new Date(t.expires_at) > new Date())
                  .map((topup) => (
                    <div key={topup.id} className="flex items-center justify-between p-2 bg-black/30 rounded-lg">
                      <div>
                        <p className="text-sm font-mono">{topup.topup_code}</p>
                        <div className="flex items-center gap-2 text-xs text-yellow-500">
                          <Clock size={12} />
                          <span>Expires in {Math.ceil((new Date(topup.expires_at).getTime() - Date.now()) / 60000)} minutes</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {topup.payment_url && (
                          <a href={topup.payment_url} target="_blank" rel="noopener noreferrer" className="px-2 py-1 bg-green-600/20 text-green-500 text-xs rounded hover:bg-green-600/30">
                            Pay
                          </a>
                        )}
                        <button onClick={() => handleCancelTopup(topup.id)} className="px-2 py-1 bg-red-600/20 text-red-500 text-xs rounded hover:bg-red-600/30">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div key="step1" variants={fadeIn} initial="hidden" animate="visible" exit="hidden" className="space-y-6">
              <div>
                <label className="text-sm font-black text-zinc-400 mb-2 block">Amount (Rp)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600">Rp</span>
                  <input
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 pl-12 pr-4 py-3 rounded-xl outline-none focus:border-green-600"
                    placeholder="10000"
                    min="10000"
                    step="1000"
                  />
                </div>
                <p className="text-[10px] text-zinc-600 mt-2">Minimum topup Rp 10,000</p>
              </div>

              <div>
                <label className="text-sm font-black text-zinc-400 mb-2 block">Payment Method</label>
                <div className="grid grid-cols-1 gap-3">
                  {paymentMethods.map((method) => {
                    const Icon = method.icon;
                    return (
                      <button
                        key={method.id}
                        onClick={() => setForm({ ...form, payment_method: method.id })}
                        className={`p-4 rounded-xl border transition-all ${form.payment_method === method.id ? "border-green-600 bg-green-600/10" : "border-zinc-800 hover:border-green-600/50"}`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon size={24} className={form.payment_method === method.id ? "text-green-500" : "text-zinc-400"} />
                          <div className="text-left">
                            <div className="font-black text-sm">{method.name}</div>
                            <div className="text-xs text-zinc-500">{method.description}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!form.amount || parseFloat(form.amount) < 10000}
                className="w-full py-3 bg-green-600 text-white rounded-xl font-black hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </motion.div>

            {/* Step 2: Payment Details */}
            {step === 2 && (
              <motion.div key="step2" variants={fadeIn} initial="hidden" animate="visible" exit="hidden" className="space-y-6">
                {error && (
                  <div className="bg-red-600/10 border border-red-600/30 p-4 rounded-xl">
                    <p className="text-red-500 text-sm">{error}</p>
                  </div>
                )}

                <div className="bg-green-600/10 border border-green-600/30 p-6 rounded-xl">
                  <h3 className="font-black text-green-500 mb-4">Payment Summary</h3>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">Amount:</span>
                      <span className="text-2xl font-black text-green-500">Rp {parseFloat(form.amount || "0").toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">Method:</span>
                      <span className="font-black">{paymentMethods.find((m) => m.id === form.payment_method)?.name}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">Fee:</span>
                      <span className="text-green-500 font-black">FREE</span>
                    </div>

                    <div className="pt-4 border-t border-green-600/30">
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400">Total:</span>
                        <span className="text-2xl font-black text-green-500">Rp {parseFloat(form.amount || "0").toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-black/50 rounded-xl">
                  <h3 className="text-sm font-black text-zinc-400 mb-2">Payment Process:</h3>
                  <ol className="text-xs text-zinc-500 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-green-500">✓</span>
                      <span>Klik "Pay Now" untuk diarahkan ke DuitKu</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500">✓</span>
                      <span>Selesaikan pembayaran di DuitKu</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500">✓</span>
                      <span>Saldo akan otomatis ditambahkan setelah pembayaran berhasil</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500">✓</span>
                      <span>Tidak perlu upload bukti transfer</span>
                    </li>
                  </ol>
                </div>

                <div className="flex gap-4">
                  <button onClick={() => setStep(1)} className="flex-1 py-3 bg-zinc-800 border border-zinc-700 rounded-xl font-black hover:bg-zinc-700 transition-colors">
                    Back
                  </button>
                  <button onClick={handleSubmit} disabled={loading} className="flex-1 py-3 bg-green-600 text-white rounded-xl font-black hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    {loading ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <>
                        <CreditCard size={20} />
                        Pay Now
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Success */}
            {step === 3 && (
              <motion.div key="step3" variants={fadeIn} initial="hidden" animate="visible" exit="hidden" className="text-center py-8">
                <div className="w-20 h-20 bg-green-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="text-green-500" size={40} />
                </div>
                <h3 className="text-2xl font-black mb-4">Payment Initiated!</h3>
                <p className="text-zinc-400 mb-6">Anda telah diarahkan ke halaman pembayaran DuitKu.</p>

                {paymentData && (
                  <div className="space-y-4 p-4 bg-black/30 rounded-xl mb-6">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Amount:</span>
                      <span className="font-black text-green-500">Rp {paymentData.amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Method:</span>
                      <span className="font-black">{paymentData.method}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">Status:</span>
                      <span className="flex items-center gap-2">
                        <Clock size={14} className="text-yellow-500" />
                        <span className="font-black text-yellow-500">WAITING PAYMENT</span>
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Expires:</span>
                      <span className="font-black text-red-500">
                        {paymentData.expiresAt
                          ? new Date(paymentData.expiresAt).toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "1 hour"}
                      </span>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <button
                    onClick={() => {
                      onSuccess();
                      onClose();
                    }}
                    className="w-full py-3 bg-green-600 text-white rounded-xl font-black hover:bg-green-700 transition-colors"
                  >
                    Back to Dashboard
                  </button>
                  {paymentData?.redirectUrl && (
                    <button
                      onClick={() => {
                        window.open(paymentData.redirectUrl, "_blank");
                      }}
                      className="w-full py-3 bg-zinc-800 border border-zinc-700 rounded-xl font-black hover:bg-zinc-700 transition-colors"
                    >
                      Open Payment Page
                    </button>
                  )}
                  <button
                    onClick={() => {
                      onClose();
                      router.push("/dashboard?tab=transactions");
                    }}
                    className="w-full py-3 bg-red-600/10 border border-red-600/30 text-red-500 rounded-xl font-black hover:bg-red-600/20 transition-colors"
                  >
                    View Transaction History
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
function setSuccess(arg0: string) {
  throw new Error("Function not implemented.");
}
