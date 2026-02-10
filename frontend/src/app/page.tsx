"use client";
import { useEffect, useState, useRef } from "react";
import React from "react";
import { useRouter } from "next/navigation";
import HeroSequence from "@/components/HeroSequence";
import Lenis from "@studio-freight/lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Loader2, Rocket, ShieldCheck, Zap, Skull, Target, User, CheckCircle2, Instagram, Twitter, Github, Award, Users, TrendingUp, Lock, Clock, Star, LogIn, ArrowRight, Linkedin, Mail, Phone, MessageCircle } from "lucide-react";
import { authHelpers, supabase, dbHelpers } from "@/lib/supabase";
import ChatWidget from "@/components/ChatWidget";

gsap.registerPlugin(ScrollTrigger);

// Update PriceCard Component
const PriceCard = ({ title, price, features, popular, onSelect, packageData }: any) => {
  const router = useRouter();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();

    // Cek apakah user sudah login
    authHelpers
      .getCurrentUser()
      .then((user) => {
        if (user) {
          if (onSelect) {
            onSelect(packageData);
          }
          // Jika sudah login, redirect ke dashboard untuk order
          router.push("/dashboard?action=order");
        } else {
          // Jika belum login, redirect ke login dengan redirect ke dashboard
          router.push("/auth/login?redirect=dashboard&action=order");
        }
      })
      .catch(() => {
        router.push("/auth/login?redirect=dashboard&action=order");
      });
  };

  return (
    <div
      className={`group relative p-8 rounded-[2.5rem] transition-all duration-500 overflow-hidden cursor-pointer ${
        popular ? "bg-gradient-to-b from-red-600/20 to-red-600/5 border-2 border-red-600 scale-105 shadow-[0_0_40px_rgba(220,38,38,0.3)]" : "bg-zinc-900/50 border border-zinc-800 hover:border-red-600"
      }`}
      onClick={handleClick}
    >
      {popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-red-600 px-4 py-1 rounded-full">
          <span className="text-[10px] font-black uppercase tracking-widest text-white">PALING POPULER</span>
        </div>
      )}
      <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-20 transition-opacity">
        <Skull size={100} />
      </div>
      <h3 className="text-red-600 font-mono text-[10px] tracking-widest uppercase mb-4 font-bold">{title}</h3>
      <p className="text-4xl font-black italic mb-2 tracking-tighter">{typeof price === "number" ? `Rp ${price.toLocaleString()}` : price}</p>
      {typeof price === "number" && <p className="text-zinc-500 text-[10px] font-mono mb-6">/PER MISI</p>}
      <ul className="space-y-3 mb-8">
        {features.map((f: string, i: number) => (
          <li key={i} className="flex items-center gap-3 text-zinc-400 text-sm">
            <CheckCircle2 size={16} className="text-red-600" /> {f}
          </li>
        ))}
      </ul>
      <button
        className={`w-full text-center py-4 rounded-2xl transition-all uppercase italic text-sm font-black ${
          popular ? "bg-red-600 text-white hover:bg-red-700 shadow-[0_0_20px_rgba(220,38,38,0.4)]" : "bg-zinc-800 text-white group-hover:bg-red-600"
        }`}
      >
        Pilih Misi
      </button>
    </div>
  );
};

const FeatureCard = ({ icon: Icon, title, description }: any) => {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      gsap.fromTo(
        ref.current,
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          scrollTrigger: {
            trigger: ref.current,
            start: "top 80%",
            toggleActions: "play none none none",
          },
        },
      );
    }
  }, []);

  return (
    <div ref={ref} className="group relative p-8 bg-zinc-900/30 border border-zinc-800/50 rounded-3xl hover:border-red-600/50 hover:bg-zinc-900/50 transition-all duration-500 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-red-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative z-10">
        <div className="w-12 h-12 bg-red-600/20 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500">
          <Icon className="text-red-600" size={24} />
        </div>
        <h3 className="text-xl font-black italic uppercase tracking-tighter mb-3">{title}</h3>
        <p className="text-zinc-400 text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  );
};

// Update TestimonialCard Component
const TestimonialCard = ({ testimonial }: any) => {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      gsap.fromTo(
        ref.current,
        { opacity: 0, scale: 0.95 },
        {
          opacity: 1,
          scale: 1,
          duration: 0.6,
          scrollTrigger: {
            trigger: ref.current,
            start: "top 85%",
            toggleActions: "play none none none",
          },
        },
      );
    }
  }, []);

  return (
    <div ref={ref} className="p-8 bg-gradient-to-br from-zinc-900/60 to-zinc-950/80 border border-zinc-800/30 rounded-3xl hover:border-red-600/30 transition-all duration-500 h-full">
      <div className="flex items-center gap-4 mb-6">
        {testimonial.image_url ? (
          <img
            src={testimonial.image_url}
            alt={testimonial.name}
            className="w-12 h-12 rounded-full object-cover flex-shrink-0"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(testimonial.name)}&background=dc2626&color=fff&size=128`;
            }}
          />
        ) : (
          <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-red-700 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="font-black text-white text-lg">{testimonial.name?.charAt(0) || "C"}</span>
          </div>
        )}
        <div>
          <p className="font-black text-white uppercase tracking-tighter">{testimonial.name}</p>
          <p className="text-[10px] text-zinc-500 font-mono tracking-widest">
            {testimonial.role} {testimonial.company && `at ${testimonial.company}`}
          </p>
        </div>
      </div>
      <p className="text-zinc-300 leading-relaxed italic">"{testimonial.content}"</p>
      <div className="flex gap-1 mt-4">
        {[...Array(5)].map((_, i) => (
          <Star key={i} size={16} className={i < testimonial.rating ? "fill-red-600 text-red-600" : "text-zinc-700"} />
        ))}
      </div>
    </div>
  );
};

// New TeamMemberCard Component
const TeamMemberCard = ({ member }: any) => {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      gsap.fromTo(
        ref.current,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          scrollTrigger: {
            trigger: ref.current,
            start: "top 85%",
            toggleActions: "play none none none",
          },
        },
      );
    }
  }, []);

  return (
    <div ref={ref} className="group relative p-6 bg-gradient-to-b from-zinc-900/40 to-black/40 border border-zinc-800/30 rounded-3xl hover:border-red-600/50 hover:bg-zinc-900/60 transition-all duration-500 overflow-hidden">
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-red-600/5 rounded-full group-hover:scale-125 transition-transform duration-700" />

      <div className="relative z-10">
        {/* Avatar */}
        <div className="relative mx-auto w-24 h-24 mb-4">
          {member.team_image_url ? (
            <img
              src={member.team_image_url}
              alt={member.full_name}
              className="w-full h-full rounded-full object-cover border-2 border-red-600/30"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.full_name)}&background=dc2626&color=fff&size=192`;
              }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-red-600/20 to-red-600/10 rounded-full flex items-center justify-center border-2 border-red-600/30">
              <span className="text-3xl font-black text-red-600">{member.full_name?.charAt(0) || "A"}</span>
            </div>
          )}
          {member.role === "super_admin" && (
            <div className="absolute -top-1 -right-1 w-8 h-8 bg-yellow-600/20 rounded-full flex items-center justify-center border border-yellow-600/30">
              <span className="text-xs font-black text-yellow-500">⭐</span>
            </div>
          )}
        </div>

        {/* Info */}
        <h3 className="text-xl font-black italic uppercase text-center tracking-tighter mb-1">{member.full_name}</h3>
        <p className="text-red-600 text-sm font-black text-center mb-4">{member.team_role || "Team Member"}</p>

        <p className="text-zinc-400 text-sm text-center mb-6 line-clamp-3">{member.team_bio || "Expert team member ready to assist your academic missions."}</p>

        {/* Social Links */}
        {member.social_links && (
          <div className="flex justify-center gap-3">
            {member.social_links.instagram && (
              <a
                href={member.social_links.instagram}
                target="_blank"
                className="w-8 h-8 bg-zinc-800/50 rounded-full flex items-center justify-center hover:bg-pink-600/20 hover:border-pink-600 transition-colors border border-zinc-700/50"
                title="Instagram"
              >
                <Instagram size={14} className="text-zinc-400 hover:text-pink-400" />
              </a>
            )}
            {member.social_links.linkedin && (
              <a
                href={member.social_links.linkedin}
                target="_blank"
                className="w-8 h-8 bg-zinc-800/50 rounded-full flex items-center justify-center hover:bg-blue-600/20 hover:border-blue-600 transition-colors border border-zinc-700/50"
                title="LinkedIn"
              >
                <Linkedin size={14} className="text-zinc-400 hover:text-blue-400" />
              </a>
            )}
            {member.social_links.github && (
              <a
                href={member.social_links.github}
                target="_blank"
                className="w-8 h-8 bg-zinc-800/50 rounded-full flex items-center justify-center hover:bg-gray-600/20 hover:border-gray-600 transition-colors border border-zinc-700/50"
                title="GitHub"
              >
                <Github size={14} className="text-zinc-400 hover:text-gray-300" />
              </a>
            )}
            {member.social_links.whatsapp && (
              <a
                href={`https://wa.me/${member.social_links.whatsapp}`}
                target="_blank"
                className="w-8 h-8 bg-zinc-800/50 rounded-full flex items-center justify-center hover:bg-green-600/20 hover:border-green-600 transition-colors border border-zinc-700/50"
                title="WhatsApp"
              >
                <Phone size={14} className="text-zinc-400 hover:text-green-400" />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default function Home() {
  const router = useRouter();
  const [trackData, setTrackData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [orderId, setOrderId] = useState("");
  const statsRef = useRef<HTMLDivElement>(null);

  // State untuk data dari database
  const [packages, setPackages] = useState<any[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [loadingTestimonials, setLoadingTestimonials] = useState(true);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(true);

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const currentUser = await authHelpers.getCurrentUser();
        if (currentUser) {
          const profile = await authHelpers.getUserProfile(currentUser.id);
          setUser(profile);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Error getting user:", error);
        setUser(null);
      }
    };

    getCurrentUser();
  }, []);

  // Fetch packages dari database
  useEffect(() => {
    const fetchPackages = async () => {
      try {
        setLoadingPackages(true);
        // Ambil hanya 3 paket active untuk display di landing page
        const { data, error } = await supabase.from("packages").select("*").eq("active", true).order("price", { ascending: true }).limit(3);

        if (error) throw error;
        setPackages(data || []);
      } catch (error) {
        console.error("Error fetching packages:", error);
        // Fallback ke dummy packages jika error
        setPackages([
          {
            id: "1",
            name: "INFILTRATOR",
            price: 25000,
            features: ["Tugas Umum", "Makalah Singkat", "3-5 Hari Kerja", "Revisi 2x", "Support Basic"],
          },
          {
            id: "2",
            name: "COMMANDO",
            price: 60000,
            features: ["Coding/Desain", "24-48 Jam Kerja", "Prioritas Support", "Revisi Unlimited", "Konsultasi Gratis"],
          },
          {
            id: "3",
            name: "OVERLORD",
            price: 0,
            features: ["Skripsi/Final Project", "Full Bimbingan", "Unlimited Revisi", "1-on-1 Mentoring", "Garanti Lulus"],
          },
        ]);
      } finally {
        setLoadingPackages(false);
      }
    };

    fetchPackages();
  }, []);

  // Fetch testimonials dari database
  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        setLoadingTestimonials(true);
        // Gunakan fungsi baru yang public
        const data = await dbHelpers.getPublicTestimonials(6);
        setTestimonials(data);
      } catch (error) {
        console.error("Error fetching testimonials:", error);
        // Fallback ke dummy testimonials jika error
        setTestimonials([
          {
            id: "1",
            name: "Ahmad R.",
            role: "Mahasiswa Teknik",
            content: "Coding project yang super kompleks jadi selesai dalam 2 hari. Dosen bahkan bilang itu karya terbaik di kelas. Recommended banget!",
            rating: 5,
          },
          {
            id: "2",
            name: "Siti M.",
            role: "Mahasiswa Bisnis",
            content: "Makalah saya sebelumnya jelek, tapi setelah revisi tim Bandit, dapat A+. Mereka benar-benar memahami apa yang dosen mau.",
            rating: 5,
          },
          {
            id: "3",
            name: "Budi S.",
            role: "Mahasiswa Hukum",
            content: "Skripsi saya yang stuck akhirnya bisa selesai dengan bantuan mentor mereka. Proses cepat, hasil berkualitas, harga reasonable.",
            rating: 5,
          },
        ]);
      } finally {
        setLoadingTestimonials(false);
      }
    };

    fetchTestimonials();
  }, []);

  // Fetch team members dari database
  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        setLoadingTeam(true);
        // Ambil user dengan role admin dan is_team_member = true
        const { data, error } = await supabase.from("user_profiles").select("*").or("role.eq.admin,role.eq.super_admin").eq("is_team_member", true).order("team_order_index", { ascending: true }).limit(6);

        if (error) throw error;

        // Filter untuk memastikan hanya yang ada team data
        const filteredMembers = (data || []).filter((member) => member.full_name && member.team_role);

        setTeamMembers(
          filteredMembers.length > 0
            ? filteredMembers
            : [
                // Fallback dummy team jika tidak ada data
                {
                  id: "1",
                  full_name: "Ugroseno Dwi P",
                  team_role: "Fullstack Developer",
                  team_bio: "Expert in web development and system architecture",
                  role: "admin",
                  social_links: {
                    instagram: "https://instagram.com",
                    linkedin: "https://linkedin.com",
                    github: "https://github.com",
                  },
                },
                {
                  id: "2",
                  full_name: "Rudilou Tiwon",
                  team_role: "Technical Specialist",
                  team_bio: "Specialized in complex algorithms and data structures",
                  role: "admin",
                  social_links: {
                    instagram: "https://instagram.com",
                    linkedin: "https://linkedin.com",
                    github: "https://github.com",
                  },
                },
                {
                  id: "3",
                  full_name: "Tengku Erlangga",
                  team_role: "Mobile Expert",
                  team_bio: "Professional mobile app developer with years of experience",
                  role: "super_admin",
                  social_links: {
                    instagram: "https://instagram.com",
                    linkedin: "https://linkedin.com",
                    github: "https://github.com",
                  },
                },
              ],
        );
      } catch (error) {
        console.error("Error fetching team members:", error);
        setTeamMembers([]);
      } finally {
        setLoadingTeam(false);
      }
    };

    fetchTeamMembers();
  }, []);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
      infinite: false,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    if (statsRef.current) {
      gsap.fromTo(
        statsRef.current.querySelectorAll("[data-stat]"),
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          stagger: 0.2,
          duration: 0.8,
          scrollTrigger: {
            trigger: statsRef.current,
            start: "top 80%",
            toggleActions: "play none none none",
          },
        },
      );
    }

    return () => lenis.destroy();
  }, []);

  const handleTrack = async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/track?code=${orderId}`);
      const data = await res.json();

      if (data.error) {
        alert("Order tidak ditemukan!");
        setTrackData(null);
      } else {
        setTrackData(data);
      }
    } catch {
      alert("Tracking offline!");
    } finally {
      setLoading(false);
    }
  };

  const handleOrderClick = () => {
    if (user) {
      router.push("/dashboard?action=order");
    } else {
      router.push("/auth/login?redirect=dashboard&action=order");
    }
  };

  const handleSupportClick = () => {
    if (user) {
      router.push("/dashboard?tab=chat");
    } else {
      router.push("/auth/login?redirect=dashboard&tab=chat");
    }
  };

  // Render packages untuk landing page
  const renderPackages = () => {
    const popularPackageIndex = packages.findIndex(pkg => pkg.is_popular);
    if (loadingPackages) {
      return (
        <>
          <div className="col-span-3 text-center py-12">
            <Loader2 className="animate-spin text-red-600 mx-auto mb-4" size={40} />
            <p className="text-zinc-400">Memuat paket...</p>
          </div>
        </>
      );
    }

    return packages.map((pkg, index) => (
      <PriceCard
        key={pkg.id}
        title={pkg.name}
        price={pkg.price}
        features={pkg.features || []}
        popular={pkg.is_popular}
        packageData={pkg}
      />
    ));
  };

  // Render testimonials
  const renderTestimonials = () => {
    if (loadingTestimonials) {
      return (
        <div className="col-span-3 text-center py-12">
          <Loader2 className="animate-spin text-red-600 mx-auto mb-4" size={40} />
          <p className="text-zinc-400">Memuat testimoni...</p>
        </div>
      );
    }

    if (testimonials.length === 0) {
      return (
        <div className="col-span-3 text-center py-12">
          <p className="text-zinc-400">Belum ada testimoni tersedia</p>
        </div>
      );
    }

    return testimonials.map((testimonial) => <TestimonialCard key={testimonial.id} testimonial={testimonial} />);
  };

  // Render team members
  const renderTeamMembers = () => {
    if (loadingTeam) {
      return (
        <div className="col-span-3 text-center py-12">
          <Loader2 className="animate-spin text-red-600 mx-auto mb-4" size={40} />
          <p className="text-zinc-400">Memuat tim...</p>
        </div>
      );
    }

    if (teamMembers.length === 0) {
      return (
        <div className="col-span-3 text-center py-12">
          <p className="text-zinc-400">Belum ada data tim tersedia</p>
        </div>
      );
    }

    return teamMembers.map((member) => <TeamMemberCard key={member.id} member={member} />);
  };

  return (
    <main className="bg-[#050505] text-white font-sans selection:bg-red-600 selection:text-white overflow-x-hidden">
      {/* ENHANCED HERO SECTION WITH PARTICLES */}
      <section id="home" className="relative min-h-[100vh] flex items-center justify-center pt-20 overflow-hidden">
        {/* Animated Grid Background */}
        <div className="absolute inset-0 z-0">
          <div 
            className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage: "linear-gradient(#dc2626 1px, transparent 1px), linear-gradient(90deg, #dc2626 1px, transparent 1px)",
              backgroundSize: "60px 60px",
              animation: "gridMove 25s linear infinite",
            }}
          />
        </div>

        {/* Floating Particles - Small Dots */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          {[...Array(40)].map((_, i) => (
            <div
              key={`particle-${i}`}
              className="absolute rounded-full animate-float-rise"
              style={{
                width: `${Math.random() * 3 + 1}px`,
                height: `${Math.random() * 3 + 1}px`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                background: `rgba(220, 38, 38, ${Math.random() * 0.4 + 0.2})`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${Math.random() * 8 + 6}s`,
                boxShadow: `0 0 ${Math.random() * 20 + 10}px ${Math.random() * 10 + 5}px rgba(220, 38, 38, 0.3)`,
              }}
            />
          ))}
        </div>

        {/* Larger Floating Orbs */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          {[...Array(8)].map((_, i) => (
            <div
              key={`orb-${i}`}
              className="absolute rounded-full blur-[2px]"
              style={{
                width: `${Math.random() * 8 + 4}px`,
                height: `${Math.random() * 8 + 4}px`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                background: `radial-gradient(circle, rgba(220, 38, 38, ${Math.random() * 0.6 + 0.3}), transparent)`,
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
            className="absolute top-[60%] right-[15%] w-[500px] h-[500px] bg-red-600/8 blur-[120px] rounded-full"
            style={{ animation: "floatReverse 14s ease-in-out infinite", animationDelay: "2s" }}
          />
          <div 
            className="absolute bottom-[20%] left-[20%] w-[300px] h-[300px] bg-red-600/12 blur-[90px] rounded-full"
            style={{ animation: "pulse-slow 8s ease-in-out infinite", animationDelay: "1s" }}
          />
          <div 
            className="absolute top-[40%] right-[30%] w-[350px] h-[350px] bg-red-600/6 blur-[110px] rounded-full"
            style={{ animation: "float 16s ease-in-out infinite", animationDelay: "3s" }}
          />
        </div>

        {/* Scan Lines */}
        <div className="absolute inset-0 z-0 overflow-hidden opacity-30">
          <div 
            className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-red-600/40 to-transparent"
            style={{ animation: "scan 12s linear infinite" }}
          />
          <div 
            className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-red-600/20 to-transparent"
            style={{ animation: "scan 18s linear infinite", animationDelay: "4s" }}
          />
          <div 
            className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-red-600/30 to-transparent"
            style={{ animation: "scan 15s linear infinite", animationDelay: "8s" }}
          />
        </div>

        {/* Diagonal Lines Animation */}
        <div className="absolute inset-0 z-0 overflow-hidden opacity-5">
          {[...Array(12)].map((_, i) => (
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

        {/* Hero Sequence (Original) */}
        <div className="absolute inset-0 z-0 opacity-30">
          <HeroSequence />
        </div>

        {/* Content */}
        <div className="relative z-10 text-center px-4 w-full">
          <h1 className="text-6xl md:text-[9rem] font-black italic tracking-tighter leading-[0.85] uppercase mb-8 animate-in fade-in zoom-in duration-1000">
            BANDIT <br className="md:hidden" /> <span className="text-red-600">JOKI.</span>
          </h1>
          <h2 className="max-w-2xl mx-auto text-zinc-400 text-base md:text-xl font-medium mb-12 px-6 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
            Jasa joki tugas kuliah, skripsi, coding profesional terpercaya. Garansi tepat waktu & revisi unlimited.
          </h2>
          <div className="flex flex-col md:flex-row gap-4 justify-center items-center animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500">
            <button
              onClick={handleOrderClick}
              className="w-[80%] md:w-auto bg-red-600 text-white px-10 py-5 rounded-2xl font-black italic uppercase tracking-tighter text-lg shadow-[0_0_30px_rgba(220,38,38,0.3)] hover:bg-red-700 hover:shadow-[0_0_50px_rgba(220,38,38,0.5)] transition-all duration-300 hover:scale-105"
            >
              Mulai Misi
            </button>
            <button
              onClick={handleSupportClick}
              className="w-[80%] md:w-auto bg-zinc-900/50 border border-zinc-800 px-10 py-5 rounded-2xl font-black italic uppercase tracking-tighter text-lg hover:border-red-600 hover:bg-zinc-900/70 transition-all duration-300 flex items-center justify-center gap-2 hover:scale-105"
            >
              <Rocket size={20} />
              Support
            </button>
          </div>
        </div>

        {/* Vignette Effect */}
        <div className="absolute inset-0 z-[5] pointer-events-none bg-gradient-radial from-transparent via-transparent to-black/60" />
      </section>

      <section className="relative z-20 -mt-10 px-6">
        <div ref={statsRef} className="container mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: "MISI SELESAI", val: "1.2K+", color: "text-red-600" },
            { label: "EXTRACTION RATE", val: "100%", color: "text-white" },
            { label: "OPERASIONAL", val: "24/7", color: "text-red-600" },
          ].map((s, i) => (
            <div key={i} data-stat className="bg-zinc-900/90 border border-zinc-800/50 p-10 rounded-[3rem] backdrop-blur-3xl hover:border-red-600/30 transition-all hover:shadow-[0_0_30px_rgba(220,38,38,0.2)]">
              <h4 className="text-zinc-600 text-[10px] uppercase tracking-[0.4em] mb-4 font-mono font-bold">{s.label}</h4>
              <p className={`text-5xl md:text-6xl font-black italic tracking-tighter ${s.color}`}>{s.val}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TEAM SECTION - Diperbarui dengan data dari database */}
      <section id="about" className="py-24 px-6">
        <div className="container mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div>
              <h2 className="text-red-600 font-mono text-[10px] tracking-[0.8em] uppercase mb-8"> // DOKTRIN KAMI</h2>
              <h3 className="text-5xl md:text-8xl font-black uppercase tracking-tighter italic leading-[0.9] mb-10">
                BANDIT <span className="text-red-600 text-outline">TEAM</span>
              </h3>
              <p className="text-zinc-400 text-lg leading-relaxed mb-12">Kami adalah kolektif spesialis akademik. Kami memahami bahwa waktu adalah aset paling berharga lu.</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-6 bg-zinc-900/50 rounded-3xl border border-zinc-800">
                  <ShieldCheck className="text-red-600 mb-2" />
                  <p className="font-bold uppercase text-xs">100% Aman</p>
                </div>
                <div className="p-6 bg-zinc-900/50 rounded-3xl border border-zinc-800">
                  <Zap className="text-red-600 mb-2" />
                  <p className="font-bold uppercase text-xs">Kilat</p>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <h4 className="text-red-600 font-mono text-[10px] font-bold tracking-widest uppercase mb-4">AGENT PROFILES</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{renderTeamMembers()}</div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section className="py-24 px-6 bg-black/40">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-red-600 font-mono text-[10px] tracking-[0.8em] uppercase mb-4">// KEMAMPUAN INTI</h2>
            <h3 className="text-5xl md:text-8xl font-black uppercase tracking-tighter italic leading-[0.9] mb-4">
              Mengapa <span className="text-red-600">Pilih Kami</span>?
            </h3>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto">Kami bukan hanya joki biasa - kami adalah tim elite dengan track record sempurna dan kepuasan client 100%</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard icon={Lock} title="Keamanan Terjamin" description="Data dan privasi klien dijaga dengan enkripsi tingkat militer. Operasi sepenuhnya confidential." />
            <FeatureCard icon={Clock} title="Delivery Kilat" description="Kami memahami deadline kritis. Pengiriman tepat waktu dijamin atau gratis." />
            <FeatureCard icon={Award} title="Kualitas Premium" description="Setiap hasil kerja melalui quality check berlapis. Revisi unlimited sampai puas." />
            <FeatureCard icon={Users} title="Expert Team" description="Dipimpin oleh profesional berpengalaman dengan track record penuh prestasi akademik." />
          </div>
        </div>
      </section>

      {/* PRICING SECTION */}
      <section id="paket" className="py-24 px-6 bg-zinc-950/50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-red-600 font-mono text-[10px] tracking-[0.8em] uppercase mb-4">// TAKTIK PENYERANGAN</h2>
            <h3 className="text-5xl md:text-8xl font-black uppercase tracking-tighter italic leading-[0.9]">
              Pilih <span className="text-red-600">Paket Misi</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end">{renderPackages()}</div>

          <div className="mt-12 p-8 bg-black/40 border border-red-600/20 rounded-3xl text-center">
            <p className="text-zinc-400 mb-4">
              💡 <strong>PRO TIP:</strong> Paket Commando paling value for money. Banyak client memilih ini untuk hasil optimal dengan harga efisien.
            </p>
            <p className="text-[10px] text-zinc-600 font-mono tracking-widest">HARGA BISA NEGOSIASI UNTUK BULK ORDER | GARANSI UANG KEMBALI JIKA TIDAK PUAS</p>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS SECTION - Diperbarui dengan data dari database */}
      <section className="py-24 px-6 bg-black/60">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-red-600 font-mono text-[10px] tracking-[0.8em] uppercase mb-4">// INTEL OPERASIONAL</h2>
            <h3 className="text-5xl md:text-8xl font-black uppercase tracking-tighter italic leading-[0.9] mb-4">
              Cerita <span className="text-red-600">Sukses</span> Mereka
            </h3>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto">Ribuan klien telah merasakan transformasi akademik mereka bersama BANDIT Team</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{renderTestimonials()}</div>

          {testimonials.length > 0 && (
            <div className="text-center mt-12">
              <div className="inline-flex items-center gap-2 bg-red-600/10 border border-red-600/20 px-6 py-3 rounded-full">
                <Star size={14} className="text-red-600" />
                <span className="text-sm text-zinc-300">
                  Rating rata-rata: <span className="text-red-600 font-bold">{(testimonials.reduce((sum, t) => sum + (t.rating || 5), 0) / testimonials.length).toFixed(1)}/5.0</span>
                </span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* TRACKING SECTION */}
      <section className="py-24 px-6">
        <div className="container mx-auto max-w-5xl bg-zinc-900/20 border border-zinc-800 p-8 md:p-20 rounded-[4rem]">
          <h2 className="text-center text-4xl md:text-7xl font-black mb-12 italic uppercase tracking-tighter">
            RADAR <span className="text-red-600">MISI</span>
          </h2>
          <div className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              placeholder="ID (BND-XXXX)"
              className="flex-1 bg-black border border-zinc-800 p-6 rounded-2xl font-mono text-red-600 outline-none focus:border-red-600"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value.toUpperCase())}
            />
            <button onClick={handleTrack} className="bg-red-600 px-10 py-6 rounded-2xl font-black italic flex items-center justify-center gap-3">
              {loading ? <Loader2 className="animate-spin" /> : <Target />} SCAN
            </button>
          </div>
          {trackData && (
            <div className="mt-12 p-8 bg-black/50 border border-red-600/20 rounded-[2.5rem] animate-in fade-in zoom-in duration-500">
              <div className="flex justify-between items-end mb-4">
                <h4 className="text-2xl font-black italic uppercase">{trackData.project_name}</h4>
                <span className="text-5xl font-black text-red-600 italic leading-none">{trackData.progress}%</span>
              </div>
              <div className="w-full bg-zinc-900 h-3 rounded-full overflow-hidden border border-zinc-800">
                <div className="bg-red-600 h-full transition-all duration-1000" style={{ width: `${trackData.progress}%` }}></div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section className="py-24 px-6 bg-zinc-950/30">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-red-600 font-mono text-[10px] tracking-[0.8em] uppercase mb-4">// OPERATIONAL PROTOCOL</h2>
            <h3 className="text-5xl md:text-8xl font-black uppercase tracking-tighter italic leading-[0.9]">
              Cara <span className="text-red-600">Kerja</span>
            </h3>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto mt-4">Proses mudah dari awal hingga hasil selesai dalam 4 langkah</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: "01",
                title: "Konsultasi",
                desc: "Diskusikan kebutuhan Anda dengan tim ahli kami",
                icon: User,
              },
              {
                step: "02",
                title: "Penawaran",
                desc: "Dapatkan estimasi waktu dan harga yang transparan",
                icon: Target,
              },
              {
                step: "03",
                title: "Proses Pengerjaan",
                desc: "Tim ahli kami mengerjakan dengan sistem tracking real-time",
                icon: Zap,
              },
              {
                step: "04",
                title: "Delivery & Revisi",
                desc: "Hasil dikirim dan revisi hingga Anda puas 100%",
                icon: CheckCircle2,
              },
            ].map((item, index) => (
              <div key={index} className="relative group p-8 bg-zinc-900/30 border border-zinc-800 rounded-3xl hover:border-red-600 transition-all duration-500">
                <div className="absolute -top-4 -left-4 w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-xs font-black">{item.step}</div>
                <item.icon className="text-red-600 mb-6" size={32} />
                <h4 className="text-xl font-black mb-3">{item.title}</h4>
                <p className="text-zinc-400 text-sm">{item.desc}</p>
                <div className="mt-6 text-[10px] text-zinc-600 font-mono">{index < 3 && "⮕ Lanjut ke langkah " + (parseInt(item.step) + 1).toString().padStart(2, "0")}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="py-24 px-6 bg-zinc-950/50">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-red-600 font-mono text-[10px] tracking-[0.8em] uppercase mb-4">// INTEL BRIEFING</h2>
            <h3 className="text-5xl md:text-8xl font-black uppercase tracking-tighter italic leading-[0.9]">
              FAQ <span className="text-red-600">Intel</span>
            </h3>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto mt-4">Pertanyaan yang sering diajukan tentang layanan kami</p>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "Apakah aman menggunakan jasa joki?",
                a: "100% aman. Kami menggunakan sistem enkripsi dan tidak menyimpan data pribadi Anda. Semua komunikasi dan transaksi bersifat confidential.",
              },
              {
                q: "Berapa lama waktu pengerjaan?",
                a: "Tergantung kompleksitas. Tugas ringan 1-2 hari, skripsi 7-14 hari. Kami selalu lebih cepat dari deadline yang diberikan.",
              },
              {
                q: "Bagaimana sistem pembayarannya?",
                a: "DP 50% di awal, 50% setelah selesai. Bisa via transfer bank, e-wallet, atau QRIS.",
              },
              {
                q: "Apakah ada garansi?",
                a: "Ya. Garansi revisi unlimited dan garansi uang kembali jika tidak sesuai permintaan.",
              },
              {
                q: "Bagaimana cara track progress?",
                a: "Setiap order dapat dipantau real-time melalui dashboard dengan progress bar dan update langsung dari tim.",
              },
              {
                q: "Apakah bisa konsultasi sebelum order?",
                a: "Tentu! Konsultasi gratis via WhatsApp atau chat dashboard untuk diskusi kebutuhan Anda.",
              },
            ].map((faq, index) => (
              <div key={index} className="group bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6 hover:border-red-600 transition-all">
                <div
                  className="flex justify-between items-center cursor-pointer"
                  onClick={(e) => {
                    const answer = e.currentTarget.nextElementSibling as HTMLElement;
                    if (answer.style.maxHeight) {
                      answer.style.maxHeight = "";
                    } else {
                      answer.style.maxHeight = answer.scrollHeight + "px";
                    }
                  }}
                >
                  <h4 className="font-black text-lg">{faq.q}</h4>
                  <span className="text-red-600 group-hover:rotate-180 transition-transform">+</span>
                </div>
                <div className="mt-4 text-zinc-400 overflow-hidden transition-all duration-300 max-h-0" style={{ maxHeight: "0px" }}>
                  {faq.a}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-zinc-500 mb-6">Masih ada pertanyaan?</p>
            <button
              onClick={() => {
                if (user) {
                  router.push("/dashboard?tab=chat");
                } else {
                  router.push("/auth/login?redirect=dashboard&tab=chat");
                }
              }}
              className="inline-flex items-center gap-3 px-8 py-4 bg-red-600 text-white font-black rounded-2xl hover:bg-red-700 transition-all uppercase tracking-tighter"
            >
              <MessageCircle size={20} />
              Tanya Admin Sekarang
            </button>
          </div>
        </div>
      </section>

      {/* CTA SECTION - PROMOTE LOGIN/REGISTER */}
      <section className="py-24 px-6 bg-gradient-to-b from-black/60 to-black">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-16">
            <h2 className="text-red-600 font-mono text-[10px] tracking-[0.8em] uppercase mb-4">// READY FOR ACTION?</h2>
            <h3 className="text-5xl md:text-8xl font-black mb-6 italic uppercase tracking-tighter leading-none">{user ? "CONTROL CENTER" : "BERGABUNG SEKARANG"}</h3>
            <p className="text-zinc-400 text-lg">{user ? `Welcome back, ${user.full_name || "Agent"}!` : "Daftar sekarang untuk akses penuh ke semua fitur premium kami"}</p>
          </div>

          {user ? (
            // Jika sudah login: Tombol Dashboard
            <div className="text-center">
              <div className="bg-zinc-900/30 border border-red-600/30 p-8 rounded-[3rem] mb-6">
                <div className="w-16 h-16 bg-red-600/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Rocket className="text-red-600" size={32} />
                </div>
                <h3 className="text-2xl font-black mb-4">Mission Control</h3>
                <p className="text-zinc-400 mb-6">Akses dashboard untuk kelola orders, chat support, dan track progress misi Anda</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button onClick={() => router.push("/dashboard")} className="w-full py-4 bg-red-600 text-white font-black rounded-2xl hover:bg-red-700 transition-all flex items-center justify-center gap-3">
                    <Target size={20} />
                    Go to Dashboard
                  </button>
                  <button
                    onClick={() => router.push("/dashboard?action=order")}
                    className="w-full py-4 bg-zinc-800 border border-zinc-700 text-white font-black rounded-2xl hover:bg-zinc-700 hover:border-red-600 transition-all flex items-center justify-center gap-3"
                  >
                    <Rocket size={20} />
                    New Order
                  </button>
                </div>
              </div>
              <div className="text-sm text-zinc-500">
                Balance: <span className="text-green-500 font-black">Rp {user.balance?.toLocaleString() || "0"}</span> • Orders: <span className="text-red-600 font-black">Active</span>
              </div>
            </div>
          ) : (
            // Jika belum login: Tombol Login/Register
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-zinc-900/30 border border-zinc-800 p-8 rounded-[3rem] text-center">
                <div className="w-16 h-16 bg-red-600/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <LogIn className="text-red-600" size={32} />
                </div>
                <h3 className="text-2xl font-black mb-4">Sudah Punya Akun?</h3>
                <p className="text-zinc-400 mb-6">Login untuk mengakses dashboard dan mulai mission Anda</p>
                <button onClick={() => router.push("/auth/login")} className="w-full py-4 bg-red-600 text-white font-black rounded-2xl hover:bg-red-700 transition-all flex items-center justify-center gap-3">
                  <LogIn size={20} />
                  Login Sekarang
                </button>
              </div>

              <div className="bg-zinc-900/30 border border-zinc-800 p-8 rounded-[3rem] text-center">
                <div className="w-16 h-16 bg-red-600/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <User size={32} className="text-red-600" />
                </div>
                <h3 className="text-2xl font-black mb-4">Agent Baru?</h3>
                <p className="text-zinc-400 mb-6">Daftar sekarang untuk bergabung dengan tim elite kami</p>
                <button
                  onClick={() => router.push("/auth/register")}
                  className="w-full py-4 bg-zinc-800 border border-zinc-700 text-white font-black rounded-2xl hover:bg-zinc-700 hover:border-red-600 transition-all flex items-center justify-center gap-3"
                >
                  <ArrowRight size={20} />
                  Daftar Sekarang
                </button>
              </div>
            </div>
          )}

          <div className="mt-12 text-center">
            <p className="text-zinc-500 mb-4">Atau langsung hubungi kami via WhatsApp:</p>
            <a
              href="https://wa.me/6285710821547"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-8 py-4 bg-green-600 text-white font-black rounded-2xl hover:bg-green-700 transition-all uppercase tracking-tighter"
            >
              <Rocket size={20} />
              CHAT LANGSUNG
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 border-t border-red-600/20 text-center bg-black">
        <div className="container mx-auto max-w-7xl mb-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Skull className="text-red-600" size={24} />
                <span className="font-black text-lg tracking-tighter">TEAMBANDIT</span>
              </div>
              <p className="text-zinc-600 text-sm">Elite academic operatives sejak 2024</p>
            </div>
            <div>
              <h4 className="font-black uppercase text-sm mb-4 tracking-tighter">Layanan</h4>
              <ul className="space-y-2 text-sm text-zinc-600">
                <li>
                  <a href="#paket" className="hover:text-red-600 transition-colors">
                    Paket Misi
                  </a>
                </li>
                <li>
                  <a href="#order" className="hover:text-red-600 transition-colors">
                    Order Sekarang
                  </a>
                </li>
                <li>
                  <a href="#about" className="hover:text-red-600 transition-colors">
                    Tentang Kami
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-black uppercase text-sm mb-4 tracking-tighter">Hubungi</h4>
              <ul className="space-y-2 text-sm text-zinc-600">
                <li>
                  <a href="https://wa.me/6285710821547" className="hover:text-red-600 transition-colors">
                    WhatsApp
                  </a>
                </li>
                <li>
                  <a href="mailto:info@teambandit.com" className="hover:text-red-600 transition-colors">
                    Email
                  </a>
                </li>
                <li>24/7 Support Ready</li>
              </ul>
            </div>
            <div>
              <h4 className="font-black uppercase text-sm mb-4 tracking-tighter">Socials</h4>
              <div className="flex justify-center gap-4 text-zinc-600">
                <a href="#" className="hover:text-red-600 transition-colors">
                  <Instagram size={20} />
                </a>
                <a href="#" className="hover:text-red-600 transition-colors">
                  <Twitter size={20} />
                </a>
                <a href="#" className="hover:text-red-600 transition-colors">
                  <Github size={20} />
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-zinc-800 pt-8">
          <p className="text-zinc-700 text-[10px] tracking-[0.3em] font-mono font-bold uppercase mb-2">© 2026 BANDIT JOKI TEAM - ALL RIGHTS RESERVED</p>
          <p className="text-zinc-800 text-[9px] tracking-[0.2em] font-mono">⚡ PROFESSIONAL ACADEMIC SOLUTIONS | PRECISION • SPEED • QUALITY ⚡</p>
        </div>
      </footer>

      {/* ChatWidget - hanya muncul jika user login dan bukan admin */}
      {user && user.role !== "admin" && <ChatWidget user={user} />}
    </main>
  );
}