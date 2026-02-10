"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authHelpers } from "@/lib/supabase";
import { Skull, Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, UserPlus } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await authHelpers.getCurrentUser();
        if (user) {
          const profile = await authHelpers.getUserProfile(user.id);
          if (profile.role === "admin") {
            router.push("/admin");
          } else {
            router.push("/dashboard");
          }
        }
      } catch (error) {
        // User not logged in, stay on login page
      }
    };

    checkAuth();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const { data, error } = await authHelpers.signInWithPersistence(
        formData.email, 
        formData.password, 
        rememberMe
      );

      if (error) throw error;

      if (!data.user) {
        throw new Error("Login gagal");
      }

      const profile = await authHelpers.getUserProfile(data.user.id);
      
      if (profile.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Login gagal. Periksa email dan password Anda.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden pt-20 md:pt-24">
      {/* Enhanced Background dengan partikel animasi */}
      <div className="absolute inset-0 z-0">
        {/* Animated Grid Background */}
        <div 
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: "linear-gradient(#dc2626 1px, transparent 1px), linear-gradient(90deg, #dc2626 1px, transparent 1px)",
            backgroundSize: "60px 60px",
            animation: "gridMove 25s linear infinite",
          }}
        />
        
        {/* Floating Particles - Small Dots (30 particles) */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(30)].map((_, i) => (
            <div
              key={`particle-${i}`}
              className="absolute rounded-full animate-float-rise"
              style={{
                width: `${Math.random() * 3 + 1}px`,
                height: `${Math.random() * 3 + 1}px`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                background: `rgba(220, 38, 38, ${Math.random() * 0.5 + 0.2})`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${Math.random() * 8 + 6}s`,
                boxShadow: `0 0 ${Math.random() * 20 + 10}px ${Math.random() * 10 + 5}px rgba(220, 38, 38, 0.4)`,
              }}
            />
          ))}
        </div>

        {/* Larger Floating Orbs */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div
              key={`orb-${i}`}
              className="absolute rounded-full blur-[2px]"
              style={{
                width: `${Math.random() * 6 + 4}px`,
                height: `${Math.random() * 6 + 4}px`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                background: `radial-gradient(circle, rgba(220, 38, 38, ${Math.random() * 0.7 + 0.3}), transparent)`,
                animation: `float ${Math.random() * 12 + 8}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 5}s`,
              }}
            />
          ))}
        </div>

        {/* Animated Glow Spots */}
        <div className="absolute inset-0 z-0">
          <div 
            className="absolute top-[20%] left-[15%] w-[350px] h-[350px] bg-red-600/10 blur-[100px] rounded-full"
            style={{ animation: "float 10s ease-in-out infinite" }}
          />
          <div 
            className="absolute bottom-[25%] right-[20%] w-[400px] h-[400px] bg-red-600/8 blur-[120px] rounded-full"
            style={{ animation: "floatReverse 14s ease-in-out infinite", animationDelay: "2s" }}
          />
          <div 
            className="absolute top-[50%] right-[25%] w-[250px] h-[250px] bg-red-600/12 blur-[90px] rounded-full"
            style={{ animation: "pulse-slow 8s ease-in-out infinite", animationDelay: "1s" }}
          />
          <div 
            className="absolute bottom-[15%] left-[25%] w-[300px] h-[300px] bg-red-600/7 blur-[110px] rounded-full"
            style={{ animation: "float 16s ease-in-out infinite", animationDelay: "3s" }}
          />
        </div>

        {/* Scan Lines */}
        <div className="absolute inset-0 z-0 overflow-hidden opacity-25">
          <div 
            className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-red-600/40 to-transparent"
            style={{ animation: "scan 12s linear infinite" }}
          />
          <div 
            className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-red-600/20 to-transparent"
            style={{ animation: "scan 18s linear infinite", animationDelay: "4s" }}
          />
        </div>

        {/* Diagonal Lines */}
        <div className="absolute inset-0 z-0 overflow-hidden opacity-5">
          {[...Array(8)].map((_, i) => (
            <div
              key={`line-${i}`}
              className="absolute h-[1px] bg-gradient-to-r from-transparent via-red-600 to-transparent"
              style={{
                width: "200%",
                left: "-50%",
                top: `${i * 12.5}%`,
                transform: `rotate(-${20 + Math.random() * 20}deg)`,
                animation: `shimmer ${15 + Math.random() * 10}s linear infinite`,
                animationDelay: `${Math.random() * 5}s`,
              }}
            />
          ))}
        </div>

        {/* Vignette Effect */}
        <div className="absolute inset-0 z-[5] pointer-events-none bg-gradient-radial from-transparent via-transparent to-black/70" />
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md mx-auto">
        {/* Logo with animation */}
        <div className="text-center mb-8 animate-in fade-in slide-in-from-top duration-1000">
          <div className="inline-flex items-center gap-3 mb-4">
            <motion.div 
              whileHover={{ rotate: 360, scale: 1.1 }}
              transition={{ duration: 0.5 }}
              className="p-3 bg-red-600/20 rounded-2xl border border-red-600/30 shadow-[0_0_20px_rgba(220,38,38,0.3)]"
            >
              <Skull className="text-red-600" size={32} />
            </motion.div>
          </div>
          <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase mb-2">
            TEAM<span className="text-red-600">BANDIT</span>
          </h1>
          <p className="text-zinc-600 text-sm font-mono tracking-widest uppercase">Client Access Portal</p>
        </div>

        {/* Form with glass morphism */}
        <div className="bg-zinc-900/50 backdrop-blur-xl p-8 rounded-[2.5rem] border border-zinc-800/50 shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in fade-in slide-in-from-bottom duration-1000 delay-200">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-600/10 border border-red-600/30 rounded-xl"
            >
              <p className="text-red-500 text-sm font-mono">{error}</p>
            </motion.div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email Input */}
            <div className="animate-in fade-in slide-in-from-left duration-700 delay-300">
              <label className="block text-[10px] font-mono tracking-widest uppercase text-zinc-500 mb-2">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-red-600 transition-colors z-10" size={18} />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-black/60 border border-zinc-800 p-4 pl-12 rounded-xl outline-none focus:border-red-600 focus:shadow-[0_0_20px_rgba(220,38,38,0.2)] text-white transition-all"
                  placeholder="agent@bandit.io"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="animate-in fade-in slide-in-from-left duration-700 delay-400">
              <label className="block text-[10px] font-mono tracking-widest uppercase text-zinc-500 mb-2">Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-red-600 transition-colors z-10" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-black/60 border border-zinc-800 p-4 pl-12 pr-12 rounded-xl outline-none focus:border-red-600 focus:shadow-[0_0_20px_rgba(220,38,38,0.2)] text-white transition-all"
                  placeholder="••••••••"
                  required
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)} 
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-red-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between animate-in fade-in slide-in-from-left duration-700 delay-500">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={rememberMe} 
                  onChange={(e) => setRememberMe(e.target.checked)} 
                  className="w-4 h-4 accent-red-600 cursor-pointer" 
                />
                <span className="text-sm text-zinc-400 group-hover:text-white transition-colors">
                  Keep me logged in for 30 days
                </span>
              </label>
              <Link href="/auth/forgot-password" className="text-sm text-red-600 hover:text-red-500 transition-colors">
                Forgot Password?
              </Link>
            </div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-red-600 text-white font-black py-4 rounded-xl hover:bg-red-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-tighter shadow-[0_0_30px_rgba(220,38,38,0.4)] hover:shadow-[0_0_50px_rgba(220,38,38,0.6)] animate-in fade-in zoom-in duration-700 delay-600"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Authenticating...
                </>
              ) : (
                <>
                  <span>Access Mission Control</span>
                  <ArrowRight size={20} />
                </>
              )}
            </motion.button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-4 animate-in fade-in duration-700 delay-700">
            <div className="flex-1 h-[1px] bg-zinc-800" />
            <span className="text-[10px] text-zinc-600 font-mono tracking-widest uppercase">New Agent?</span>
            <div className="flex-1 h-[1px] bg-zinc-800" />
          </div>

          {/* Register Link */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="animate-in fade-in slide-in-from-bottom duration-700 delay-800"
          >
            <Link href="/auth/register" className="w-full bg-zinc-800 text-white font-black py-4 rounded-xl hover:bg-zinc-700 hover:border-red-600 transition-all flex items-center justify-center gap-3 uppercase tracking-tighter border border-zinc-700">
              <UserPlus size={20} />
              Create Account
            </Link>
          </motion.div>
        </div>

        {/* Footer */}
        <p className="text-center mt-6 text-zinc-700 text-[9px] font-mono tracking-[0.3em] uppercase animate-in fade-in duration-1000 delay-1000">
          Secured by BANDIT Protocol v2.0
        </p>
      </div>
    </div>
  );
}