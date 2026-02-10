"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authHelpers } from "@/lib/supabase";
import { Skull, Mail, Lock, ArrowRight, Loader2, CheckCircle2, Shield, AlertCircle } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [email, setEmail] = useState("");

  // Countdown timer untuk resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      // Kirim email reset password melalui Supabase
      const { error } = await authHelpers.sendPasswordResetEmail(email);
      
      if (error) throw error;

      setCountdown(60); // 60 detik sebelum bisa kirim ulang
      setSuccess(`✅ Link reset password telah dikirim ke ${email}. 
      Periksa email Anda dan klik link untuk melanjutkan.`);
      
    } catch (err: any) {
      setError(err.message || "Gagal mengirim email reset password. Periksa email Anda.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (countdown > 0) return;

    setError("");
    setIsLoading(true);

    try {
      const { error } = await authHelpers.sendPasswordResetEmail(email);
      
      if (error) throw error;

      setCountdown(60);
      setSuccess("✅ Email reset password baru telah dikirim!");
    } catch (err: any) {
      setError(err.message || "Gagal mengirim ulang email.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: "linear-gradient(#ff0000 1px, transparent 1px), linear-gradient(90deg, #ff0000 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />
      </div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-600/10 blur-[120px] rounded-full animate-pulse-slow" />

      {/* Floating Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-red-600/20 rounded-full"
            initial={{
              x: Math.random() * 100 + "vw",
              y: Math.random() * 100 + "vh",
            }}
            animate={{
              x: Math.random() * 100 + "vw",
              y: Math.random() * 100 + "vh",
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}
      </div>

      {/* Main Card */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="inline-flex items-center gap-3 mb-4"
          >
            <div className="p-3 bg-red-600/20 rounded-2xl border border-red-600/30 relative group">
              <Shield className="text-red-600" size={32} />
              <div className="absolute inset-0 bg-red-600/10 rounded-2xl animate-ping opacity-75 group-hover:animate-none" />
            </div>
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase mb-2">
            RECOVER <span className="text-red-600">ACCESS</span>
          </h1>
          <p className="text-zinc-600 text-sm font-mono tracking-widest uppercase">
            Reset Your Password
          </p>
        </div>

        {/* Form Container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900/50 backdrop-blur-xl p-8 rounded-[2.5rem] border border-zinc-800"
        >
          {/* Status Messages */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 p-4 bg-red-600/10 border border-red-600/30 rounded-xl"
              >
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-red-600/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <AlertCircle size={12} className="text-red-500" />
                  </div>
                  <p className="text-red-500 text-sm font-mono leading-tight">{error}</p>
                </div>
              </motion.div>
            )}

            {success && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 p-4 bg-green-600/10 border border-green-600/30 rounded-xl"
              >
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-600/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 size={12} className="text-green-500" />
                  </div>
                  <div>
                    <p className="text-green-500 text-sm font-mono font-bold mb-2">
                      ✅ Link Reset Password Terkirim!
                    </p>
                    <p className="text-green-500/80 text-xs leading-relaxed">
                      1. Buka email Anda di <strong>{email}</strong><br/>
                      2. Klik link "Reset Password"<br/>
                      3. Buat password baru di halaman yang terbuka
                    </p>
                    <div className="mt-3 p-3 bg-black/30 rounded-lg border border-green-600/20">
                      <p className="text-[10px] text-green-400 font-mono">
                        ⚠️ Link hanya aktif 24 jam<br/>
                        ⚠️ Cek folder spam jika tidak ditemukan
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Email Form */}
          <form onSubmit={handleSendResetEmail} className="space-y-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600/10 rounded-full mb-4">
                <Mail className="text-red-600" size={24} />
              </div>
              <p className="text-zinc-400 text-sm">
                Masukkan email terdaftar Anda. Kami akan mengirimkan link reset password ke email Anda.
              </p>
            </div>

            <div>
              <label className="block text-[10px] font-mono tracking-widest uppercase text-zinc-500 mb-2">
                Email Address
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-red-600 transition-colors z-10" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black/60 border border-zinc-800 p-4 pl-12 rounded-xl outline-none focus:border-red-600 text-white transition-all"
                  placeholder="agent@bandit.io"
                  required
                  disabled={isLoading || success !== ""}
                />
              </div>
            </div>

            {!success ? (
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-red-600 text-white font-black py-4 rounded-xl hover:bg-red-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-tighter shadow-[0_0_30px_rgba(220,38,38,0.3)]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Sending Reset Link...
                  </>
                ) : (
                  <>
                    <span>Send Reset Link</span>
                    <ArrowRight size={20} />
                  </>
                )}
              </button>
            ) : (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleResendEmail}
                  disabled={isLoading || countdown > 0}
                  className="w-full bg-zinc-800 text-white font-black py-3 rounded-xl hover:bg-zinc-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : countdown > 0 ? (
                    `Kirim ulang dalam ${countdown}s`
                  ) : (
                    "Kirim ulang link"
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setSuccess("");
                    setError("");
                    setEmail("");
                  }}
                  className="w-full border border-zinc-700 text-zinc-400 py-3 rounded-xl hover:bg-zinc-800 transition-all"
                >
                  Gunakan email lain
                </button>
              </div>
            )}
          </form>

          {/* Navigation Links */}
          <div className="mt-8 pt-6 border-t border-zinc-800">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <Link
                href="/auth/login"
                className="text-sm text-zinc-400 hover:text-white transition-colors flex items-center gap-2"
              >
                <ArrowRight className="rotate-180" size={14} />
                Back to Login
              </Link>
              
              <Link
                href="/auth/register"
                className="text-sm text-red-600 hover:text-red-500 transition-colors"
              >
                Need an account? Register
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Security Notice */}
        <div className="mt-6 text-center">
          <p className="text-[9px] text-zinc-700 font-mono tracking-[0.3em] uppercase">
            Secured by BANDIT Protocol v2.0 • Encrypted Connection
          </p>
        </div>
      </div>
    </div>
  );
}