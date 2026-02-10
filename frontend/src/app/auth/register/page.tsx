"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authHelpers } from '@/lib/supabase';
import { Skull, Mail, Lock, User, Phone, Eye, EyeOff, Loader2, ArrowRight, LogIn, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  // Check if user is already logged in
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
        // User not logged in, stay on register page
      }
    };

    checkAuth();
  }, [router]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (formData.password !== formData.confirmPassword) {
      setError('Password tidak cocok!');
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password minimal 6 karakter!');
      setIsLoading(false);
      return;
    }

    try {
      await authHelpers.signUp(
        formData.email,
        formData.password,
        formData.fullName,
        formData.phone
      );

      const { data, error: loginError } = await authHelpers.signInWithPersistence(
        formData.email,
        formData.password,
        true
      );

      if (loginError) throw loginError;

      setSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
      
    } catch (err: any) {
      setError(err.message || 'Registrasi gagal. Coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden pt-24 md:pt-4 pb-8">
      {/* Enhanced Background dengan partikel */}
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
        
        {/* Floating Particles - Small Dots */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(35)].map((_, i) => (
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
          {[...Array(7)].map((_, i) => (
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
            className="absolute top-[15%] left-[10%] w-[400px] h-[400px] bg-red-600/10 blur-[100px] rounded-full"
            style={{ animation: "float 10s ease-in-out infinite" }}
          />
          <div 
            className="absolute top-[70%] right-[15%] w-[450px] h-[450px] bg-red-600/8 blur-[120px] rounded-full"
            style={{ animation: "floatReverse 14s ease-in-out infinite", animationDelay: "2s" }}
          />
          <div 
            className="absolute bottom-[20%] left-[20%] w-[300px] h-[300px] bg-red-600/12 blur-[90px] rounded-full"
            style={{ animation: "pulse-slow 8s ease-in-out infinite", animationDelay: "1s" }}
          />
          <div 
            className="absolute top-[40%] right-[25%] w-[350px] h-[350px] bg-red-600/7 blur-[110px] rounded-full"
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
          {[...Array(10)].map((_, i) => (
            <div
              key={`line-${i}`}
              className="absolute h-[1px] bg-gradient-to-r from-transparent via-red-600 to-transparent"
              style={{
                width: "200%",
                left: "-50%",
                top: `${i * 10}%`,
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

      {/* Register Card */}
      <div className="relative z-10 w-full max-w-md">
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
            JOIN <span className="text-red-600">BANDIT</span>
          </h1>
          <p className="text-zinc-600 text-sm font-mono tracking-widest uppercase">Agent Registration</p>
        </div>

        {/* Form with glass morphism */}
        <div className="bg-zinc-900/50 backdrop-blur-xl p-8 rounded-[2.5rem] border border-zinc-800/50 shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in fade-in slide-in-from-bottom duration-1000 delay-200">
          {error && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="mb-6 p-4 bg-red-600/10 border border-red-600/30 rounded-xl"
            >
              <p className="text-red-500 text-sm font-mono">{error}</p>
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-4 bg-green-600/10 border border-green-600/30 rounded-xl"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-600/20 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="text-green-600" size={20} />
                </div>
                <div>
                  <p className="text-green-500 text-sm font-mono font-bold">✓ Registrasi berhasil!</p>
                  <p className="text-green-500/80 text-xs">Redirecting to dashboard...</p>
                </div>
              </div>
            </motion.div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            {/* Full Name */}
            <div className="animate-in fade-in slide-in-from-left duration-700 delay-300">
              <label className="block text-[10px] font-mono tracking-widest uppercase text-zinc-500 mb-2">
                Full Name
              </label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-red-600 transition-colors z-10" size={18} />
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full bg-black/60 border border-zinc-800 p-4 pl-12 rounded-xl outline-none focus:border-red-600 focus:shadow-[0_0_20px_rgba(220,38,38,0.2)] text-white transition-all"
                  placeholder="John Doe"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="animate-in fade-in slide-in-from-left duration-700 delay-400">
              <label className="block text-[10px] font-mono tracking-widest uppercase text-zinc-500 mb-2">
                Email Address
              </label>
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

            {/* Phone */}
            <div className="animate-in fade-in slide-in-from-left duration-700 delay-500">
              <label className="block text-[10px] font-mono tracking-widest uppercase text-zinc-500 mb-2">
                Phone Number (Optional)
              </label>
              <div className="relative group">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-red-600 transition-colors z-10" size={18} />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-black/60 border border-zinc-800 p-4 pl-12 rounded-xl outline-none focus:border-red-600 focus:shadow-[0_0_20px_rgba(220,38,38,0.2)] text-white transition-all"
                  placeholder="+62 812 3456 7890"
                />
              </div>
            </div>

            {/* Password */}
            <div className="animate-in fade-in slide-in-from-left duration-700 delay-600">
              <label className="block text-[10px] font-mono tracking-widest uppercase text-zinc-500 mb-2">
                Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-red-600 transition-colors z-10" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
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

            {/* Confirm Password */}
            <div className="animate-in fade-in slide-in-from-left duration-700 delay-700">
              <label className="block text-[10px] font-mono tracking-widest uppercase text-zinc-500 mb-2">
                Confirm Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-red-600 transition-colors z-10" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full bg-black/60 border border-zinc-800 p-4 pl-12 rounded-xl outline-none focus:border-red-600 focus:shadow-[0_0_20px_rgba(220,38,38,0.2)] text-white transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {/* Terms */}
            <div className="bg-red-600/10 border border-red-600/20 p-4 rounded-xl animate-in fade-in duration-700 delay-800">
              <p className="text-[10px] text-zinc-400 leading-relaxed">
                Dengan mendaftar, Anda akan langsung login dan diarahkan ke dashboard. Anda setuju dengan{' '}
                <Link href="/terms" className="text-red-600 hover:underline">
                  Terms of Service
                </Link>{' '}
                dan{' '}
                <Link href="/privacy" className="text-red-600 hover:underline">
                  Privacy Policy
                </Link>{' '}
                kami.
              </p>
            </div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-red-600 text-white font-black py-4 rounded-xl hover:bg-red-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-tighter shadow-[0_0_30px_rgba(220,38,38,0.4)] hover:shadow-[0_0_50px_rgba(220,38,38,0.6)] animate-in fade-in zoom-in duration-700 delay-900"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Deploying Agent...
                </>
              ) : (
                <>
                  <span>Deploy Agent & Auto Login</span>
                  <ArrowRight size={20} />
                </>
              )}
            </motion.button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-4 animate-in fade-in duration-700 delay-1000">
            <div className="flex-1 h-[1px] bg-zinc-800" />
            <span className="text-[10px] text-zinc-600 font-mono tracking-widest uppercase">Existing Agent?</span>
            <div className="flex-1 h-[1px] bg-zinc-800" />
          </div>

          {/* Login Link */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="animate-in fade-in slide-in-from-bottom duration-700 delay-1100"
          >
            <Link
              href="/auth/login"
              className="w-full bg-zinc-800 text-white font-black py-4 rounded-xl hover:bg-zinc-700 hover:border-red-600 transition-all flex items-center justify-center gap-3 uppercase tracking-tighter border border-zinc-700"
            >
              <LogIn size={20} />
              Back to Login
            </Link>
          </motion.div>
        </div>

        {/* Footer */}
        <p className="text-center mt-6 text-zinc-700 text-[9px] font-mono tracking-[0.3em] uppercase animate-in fade-in duration-1000 delay-1200">
          Secured by BANDIT Protocol v2.0
        </p>
      </div>
    </div>
  );
}