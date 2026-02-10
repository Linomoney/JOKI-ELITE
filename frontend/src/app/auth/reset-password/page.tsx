"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authHelpers } from "@/lib/supabase";
import { Skull, Lock, Shield, CheckCircle2, Loader2, Eye, EyeOff, AlertCircle } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isValidSession, setIsValidSession] = useState(true);
  const [checkingSession, setCheckingSession] = useState(true);

  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  // Check session saat komponen mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        // Check if user has a valid session for password reset
        const user = await authHelpers.getCurrentUser();
        
        if (!user) {
          setIsValidSession(false);
          setError("Link reset password tidak valid atau telah kadaluarsa. Silakan minta link baru.");
        }
      } catch (err) {
        setIsValidSession(false);
        setError("Sesi tidak valid. Silakan minta link reset password baru.");
      } finally {
        setCheckingSession(false);
      }
    };

    checkSession();
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.newPassword !== formData.confirmPassword) {
      setError("Password baru tidak cocok!");
      return;
    }

    if (formData.newPassword.length < 6) {
      setError("Password minimal 6 karakter!");
      return;
    }

    // Validasi password strength
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{6,}$/;
    if (!passwordRegex.test(formData.newPassword)) {
      setError("Password harus mengandung huruf dan angka!");
      return;
    }

    setIsLoading(true);

    try {
      // Update password menggunakan Supabase
      const { error } = await authHelpers.updatePassword(formData.newPassword);

      if (error) throw error;

      setSuccess("Password berhasil direset! Anda akan dialihkan ke halaman login.");

      // Redirect ke login setelah 3 detik
      setTimeout(() => {
        router.push("/auth/login");
      }, 3000);

    } catch (err: any) {
      setError(err.message || "Gagal mereset password. Coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="animate-spin text-red-600 mx-auto mb-4" size={32} />
          <p className="text-zinc-400">Memvalidasi sesi...</p>
        </div>
      </div>
    );
  }

  if (!isValidSession) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden">
        <div className="relative z-10 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-600/20 rounded-2xl border border-red-600/30">
                <Shield className="text-red-600" size={32} />
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter uppercase mb-2">
              LINK <span className="text-red-600">EXPIRED</span>
            </h1>
          </div>

          <div className="bg-zinc-900/50 backdrop-blur-xl p-8 rounded-[2.5rem] border border-zinc-800">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="text-red-600" size={32} />
              </div>
              <h2 className="text-xl font-black mb-2">Link Tidak Valid</h2>
              <p className="text-zinc-400 mb-6">
                Link reset password tidak valid atau telah kadaluarsa. Silakan minta link reset password baru.
              </p>
              <Link
                href="/auth/forgot-password"
                className="inline-block bg-red-600 text-white px-6 py-3 rounded-xl font-black hover:bg-red-700 transition-colors"
              >
                Minta Link Baru
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

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

      {/* Main Card */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="p-3 bg-red-600/20 rounded-2xl border border-red-600/30">
              <Skull className="text-red-600" size={32} />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase mb-2">
            NEW <span className="text-red-600">PASSWORD</span>
          </h1>
          <p className="text-zinc-600 text-sm font-mono tracking-widest uppercase">Create Secure Access</p>
        </div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900/50 backdrop-blur-xl p-8 rounded-[2.5rem] border border-zinc-800"
        >
          {error && (
            <div className="mb-6 p-4 bg-red-600/10 border border-red-600/30 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-red-600/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <AlertCircle size={12} className="text-red-500" />
                </div>
                <p className="text-red-500 text-sm font-mono leading-tight">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-600/10 border border-green-600/30 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-green-600/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 size={12} className="text-green-500" />
                </div>
                <div>
                  <p className="text-green-500 text-sm font-mono font-bold">✓ Password berhasil direset!</p>
                  <p className="text-green-500/80 text-xs">Redirecting to login...</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleResetPassword} className="space-y-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600/10 rounded-full mb-4">
                <Lock className="text-red-600" size={24} />
              </div>
              <p className="text-zinc-400 text-sm">
                Buat password baru yang kuat untuk akun BANDIT Anda
              </p>
            </div>

            <div>
              <label className="block text-[10px] font-mono tracking-widest uppercase text-zinc-500 mb-2">
                New Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-red-600 transition-colors z-10" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.newPassword}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                  className="w-full bg-black/60 border border-zinc-800 p-4 pl-12 pr-12 rounded-xl outline-none focus:border-red-600 text-white transition-all"
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-red-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="text-[10px] text-zinc-500 mt-2">Minimal 6 karakter, mengandung huruf dan angka</p>
            </div>

            <div>
              <label className="block text-[10px] font-mono tracking-widest uppercase text-zinc-500 mb-2">
                Confirm New Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-red-600 transition-colors z-10" size={18} />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className={`w-full bg-black/60 border p-4 pl-12 pr-12 rounded-xl outline-none transition-all ${
                    formData.confirmPassword && formData.newPassword !== formData.confirmPassword
                      ? "border-red-500"
                      : formData.confirmPassword && formData.newPassword === formData.confirmPassword
                      ? "border-green-500"
                      : "border-zinc-800 focus:border-red-600"
                  }`}
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-12 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-red-600 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
                {formData.confirmPassword && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    {formData.newPassword === formData.confirmPassword ? (
                      <CheckCircle2 className="text-green-500" size={18} />
                    ) : (
                      <AlertCircle className="text-red-500" size={18} />
                    )}
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || formData.newPassword !== formData.confirmPassword || formData.newPassword.length < 6}
              className="w-full bg-red-600 text-white font-black py-4 rounded-xl hover:bg-red-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-tighter shadow-[0_0_30px_rgba(220,38,38,0.3)]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Resetting Password...
                </>
              ) : (
                "Reset Password"
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-zinc-800 text-center">
            <Link
              href="/auth/login"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Back to Login
            </Link>
          </div>
        </motion.div>

        {/* Footer */}
        <p className="text-center mt-6 text-zinc-700 text-[9px] font-mono tracking-[0.3em] uppercase">
          Secured by BANDIT Protocol v2.0
        </p>
      </div>
    </div>
  );
}