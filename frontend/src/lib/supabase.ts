import { createClient } from "@supabase/supabase-js";

// Validasi environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validasi
if (!supabaseUrl) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is required");
}

if (!supabaseAnonKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is required");
}

export const uploadTeamImage = async (file: File, userId: string, oldImageUrl?: string): Promise<string> => {
  try {
    // Hapus gambar lama jika ada
    if (oldImageUrl && oldImageUrl.includes("supabase.co")) {
      try {
        const urlParts = oldImageUrl.split("/");
        const fileName = urlParts[urlParts.length - 1];
        const folderName = urlParts[urlParts.length - 2];

        if (fileName && folderName) {
          await supabase.storage.from("team-images").remove([`${folderName}/${fileName}`]);
        }
      } catch (error) {
        console.warn("Failed to delete old image:", error);
      }
    }

    // Upload gambar baru
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    const { error: uploadError, data } = await supabase.storage.from("team-images").upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
    });

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from("team-images").getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error("Upload image error:", error);
    throw error;
  }
};

// Client untuk user biasa (menggunakan anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  },
  global: {
    headers: {
      "x-application-name": "bandit-joki-frontend",
    },
  },
  db: {
    schema: "public",
  },
});

// Client khusus untuk admin operations (menggunakan service role key)
const adminKey = supabaseServiceKey || supabaseAnonKey;
export const supabaseAdmin = createClient(supabaseUrl, adminKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Enhanced Cache Layer dengan LRU
const cache = {
  memory: new Map<string, { data: any; expiry: number; hits: number }>(),
  maxSize: 50,

  set(key: string, data: any, ttl: number = 60000) {
    if (this.memory.size >= this.maxSize) {
      const entries = Array.from(this.memory.entries());
      const lru = entries.reduce((least, entry) => (entry[1].hits < least[1].hits ? entry : least));
      this.memory.delete(lru[0]);
    }

    this.memory.set(key, {
      data,
      expiry: Date.now() + ttl,
      hits: 0,
    });
  },

  get(key: string) {
    const cached = this.memory.get(key);
    if (!cached) return null;

    cached.hits++;

    if (Date.now() > cached.expiry) {
      this.memory.delete(key);
      return null;
    }

    return cached.data;
  },

  delete(key: string) {
    this.memory.delete(key);
  },

  clear() {
    this.memory.clear();
  },

  cleanup() {
    const now = Date.now();
    for (const [key, cached] of this.memory.entries()) {
      if (now > cached.expiry) {
        this.memory.delete(key);
      }
    }
  },
};

// Run cleanup every 5 minutes
setInterval(() => cache.cleanup(), 300000);

// Rate limiting
const rateLimit = {
  requests: new Map<string, { count: number; resetTime: number }>(),

  check(userId: string, limit: number = 10, windowMs: number = 60000) {
    const now = Date.now();
    const userRecord = this.requests.get(userId);

    if (!userRecord) {
      this.requests.set(userId, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (now > userRecord.resetTime) {
      userRecord.count = 1;
      userRecord.resetTime = now + windowMs;
      return true;
    }

    if (userRecord.count >= limit) {
      return false;
    }

    userRecord.count++;
    return true;
  },

  clearExpired() {
    const now = Date.now();
    for (const [userId, record] of this.requests.entries()) {
      if (now > record.resetTime) {
        this.requests.delete(userId);
      }
    }
  },
};

// Helper functions
export const authHelpers = {
  async sendPasswordResetEmail(email: string) {
    const redirectUrl = `${window.location.origin}/auth/reset-password`;

    console.log("📧 Sending reset email to:", email);
    console.log("🔗 Redirect to:", redirectUrl);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) {
      console.error("❌ Reset email error:", error);
      throw error;
    }

    return { error: null };
  },

  // Update password
  async updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      console.error("❌ Update password error:", error);
      throw error;
    }

    return { error: null };
  },

  signInWithPersistence: async (email: string, password: string, rememberMe: boolean = true) => {
    try {
      const ip = typeof window !== "undefined" ? "client" : "server";
      if (!rateLimit.check(ip, 5, 60000)) {
        throw new Error("Terlalu banyak percobaan. Silakan coba lagi nanti.");
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw new Error(authHelpers.getErrorMessage(error));

      if (rememberMe && data.session) {
        localStorage.setItem(
          "supabase.auth.token",
          JSON.stringify({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            expires_at: Date.now() + 30 * 24 * 60 * 60 * 1000,
          }),
        );
      }

      if (data.user) {
        cache.set(`user-${data.user.id}`, data.user, rememberMe ? 2592000000 : 3600000);
      }

      return { data, error: null };
    } catch (error: any) {
      console.error("Sign in error:", error);
      return { data: null, error: new Error(error.message || "Login failed.") };
    }
  },

  signUp: async (email: string, password: string, fullName: string, phone?: string) => {
    try {
      const ip = typeof window !== "undefined" ? "client" : "server";
      if (!rateLimit.check(ip, 3, 60000)) {
        throw new Error("Terlalu banyak percobaan. Silakan coba lagi nanti.");
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone,
          },
          emailRedirectTo: `${window.location.origin}/auth/login`,
        },
      });

      if (error) throw new Error(authHelpers.getErrorMessage(error));

      if (data.user) {
        await supabaseAdmin.from("user_profiles").insert({
          id: data.user.id,
          email,
          full_name: fullName,
          phone: phone || null,
          role: "client",
          balance: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      cache.delete("users-list");
      return data;
    } catch (error: any) {
      console.error("Sign up error:", error);
      throw new Error(error.message || "Registration failed.");
    }
  },

  signIn: async (email: string, password: string) => {
    try {
      const ip = typeof window !== "undefined" ? "client" : "server";
      if (!rateLimit.check(ip, 5, 60000)) {
        throw new Error("Terlalu banyak percobaan. Silakan coba lagi nanti.");
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw new Error(authHelpers.getErrorMessage(error));

      if (data.user) {
        cache.set(`user-${data.user.id}`, data.user, 300000);
      }

      return data;
    } catch (error: any) {
      console.error("Sign in error:", error);
      throw new Error(error.message || "Login failed.");
    }
  },

  signOut: async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        cache.delete(`user-${user.id}`);
        cache.delete(`profile-${user.id}`);
      }

      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error: any) {
      console.error("Sign out error:", error);
      throw new Error("Logout failed.");
    }
  },

  getCurrentUser: async () => {
    try {
      console.log("🔍 getCurrentUser: checking session...");

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        console.log("🔄 Session error, refreshing...");
        const { data, error: refreshError } = await supabase.auth.refreshSession();

        if (refreshError || !data?.user) {
          throw new Error("Session expired. Please login again.");
        }

        return data.user;
      }

      if (!user) {
        throw new Error("No active session");
      }

      return user;
    } catch (error: any) {
      console.error("❌ getCurrentUser error:", error);

      if (typeof window !== "undefined") {
        try {
          const stored = localStorage.getItem(`sb-${supabaseUrl}-auth-token`);
          if (stored) {
            const session = JSON.parse(stored);
            const {
              data: { user },
            } = await supabase.auth.getUser(session.access_token);
            if (user) return user;
          }
        } catch {}
      }

      throw new Error(error.message || "Failed to get current user");
    }
  },

  createUserProfile: async (userId: string) => {
    try {
      console.log("📝 Creating profile for:", userId);

      const { data: authData, error } = await supabase.auth.getUser();

      if (error || !authData.user) {
        throw new Error("Cannot read auth user");
      }

      if (authData.user.id !== userId) {
        throw new Error("User ID mismatch");
      }

      const newProfile = {
        id: userId,
        email: authData.user.email ?? "",
        full_name: authData.user.user_metadata?.full_name ?? "User",
        phone: authData.user.user_metadata?.phone ?? null,
        role: "client",
        balance: 0,
        is_team_member: false,
        team_role: null,
        team_bio: null,
        team_image_url: null,
        social_links: {},
        team_order_index: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error: insertError } = await supabase.from("user_profiles").insert(newProfile).select().single();

      if (insertError) {
        if (insertError.code === "23505") {
          const { data: existing } = await supabase.from("user_profiles").select("*").eq("id", userId).single();
          if (existing) {
            cache.set(`profile-${userId}`, existing, 300000);
            return existing;
          }
        }
        throw insertError;
      }

      cache.set(`profile-${userId}`, data, 300000);
      return data;
    } catch (error: any) {
      console.error("🔥 createUserProfile error:", error);
      throw new Error(error.message || "Create profile failed");
    }
  },

  getUserProfile: async (userId: string, forceRefresh = false) => {
    if (!userId) throw new Error("Invalid user ID");

    const cacheKey = `profile-${userId}`;

    if (!forceRefresh) {
      const cached = cache.get(cacheKey);
      if (cached) return cached;
    }

    try {
      const { data, error } = await supabase.from("user_profiles").select("*").eq("id", userId).single();

      if (data) {
        cache.set(cacheKey, data, 300000);
        return data;
      }

      if (error?.code === "PGRST116") {
        return await (dbHelpers as any).createUserProfile(userId);
      }

      throw error;
    } catch (error: any) {
      console.error("❌ getUserProfile error:", error);
      throw new Error(error.message || "Failed to get profile");
    }
  },

  getErrorMessage: (error: any): string => {
    const errorMap: Record<string, string> = {
      "Invalid login credentials": "Email atau password salah.",
      "Email not confirmed": "Email belum dikonfirmasi.",
      "User already registered": "Email sudah terdaftar.",
      "Weak password": "Password minimal 6 karakter.",
      "Email rate limit exceeded": "Terlalu banyak percobaan.",
      "Network error": "Koneksi internet bermasalah.",
      "Auth session missing": "Sesi login telah berakhir.",
    };

    return errorMap[error.message] || error.message || "Terjadi kesalahan.";
  },
};

// Fungsi helper untuk generate ID dengan format auto-increment
const generateNextId = async (tableName: string, prefix: string): Promise<string> => {
  try {
    const { data: lastItem, error } = await supabase.from(tableName).select("id").order("created_at", { ascending: false }).limit(1).single();

    if (error || !lastItem) {
      return `${prefix}-0001`;
    }

    const lastId = lastItem.id;
    const match = lastId.match(/\d+/);

    if (!match) {
      return `${prefix}-0001`;
    }

    const lastNumber = parseInt(match[0]);
    const nextNumber = lastNumber + 1;
    const paddedNumber = nextNumber.toString().padStart(4, "0");
    return `${prefix}-${paddedNumber}`;
  } catch (error) {
    console.error("Generate ID error:", error);
    return `${prefix}-${Date.now().toString().slice(-6)}`;
  }
};

// Fungsi untuk clean up data lama
const cleanupOldData = async (tableName: string, daysToKeep: number = 30): Promise<number> => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    // Gunakan delete dengan count yang benar
    const { error, count } = await supabaseAdmin.rpc("delete_old_records", {
      table_name: tableName,
      cutoff_date: cutoffDate.toISOString(),
    });

    // Fallback jika RPC tidak ada
    if (error?.code === "42704") {
      const { error: deleteError, count: deleteCount } = await supabaseAdmin.from(tableName).delete({ count: "exact" }).lt("created_at", cutoffDate.toISOString());

      if (deleteError) throw deleteError;
      console.log(`🧹 Cleaned up ${deleteCount || 0} old records from ${tableName}`);
      return deleteCount || 0;
    }

    if (error) throw error;
    console.log(`🧹 Cleaned up ${count || 0} old records from ${tableName}`);
    return count || 0;
  } catch (error: any) {
    console.error("Cleanup old data error:", error);
    // Return 0 instead of throwing error to prevent breaking the app
    return 0;
  }
};

// Database helpers
export const dbHelpers = {
  // ========== GENERATE ID FUNCTIONS ==========
  generateNextId: async (tableName: string, prefix: string): Promise<string> => {
    return generateNextId(tableName, prefix);
  },

  cleanupOldData: async (tableName: string, daysToKeep: number = 30): Promise<number> => {
    return cleanupOldData(tableName, daysToKeep);
  },

  // ========== TEAM MANAGEMENT ==========
  getTeamMembers: async (forceRefresh = false) => {
    const cacheKey = "team-members";
    if (!forceRefresh) {
      const cached = cache.get(cacheKey);
      if (cached) return cached;
    }

    try {
      const { data, error } = await supabase.from("user_profiles").select("*").eq("is_team_member", true).order("team_order_index", { ascending: true }).order("created_at", { ascending: false });

      if (error) throw error;
      cache.set(cacheKey, data || [], 300000);
      return data || [];
    } catch (error: any) {
      console.error("Get team members error:", error);
      throw new Error("Gagal mengambil data team");
    }
  },

  getAdmins: async (forceRefresh = false) => {
    const cacheKey = "admins-all";
    if (!forceRefresh) {
      const cached = cache.get(cacheKey);
      if (cached) return cached;
    }

    try {
      const { data, error } = await supabase.from("user_profiles").select("*").in("role", ["admin"]).order("created_at", { ascending: false });

      if (error) throw error;
      cache.set(cacheKey, data || [], 300000);
      return data || [];
    } catch (error: any) {
      console.error("Get admins error:", error);
      throw new Error("Gagal mengambil data admin");
    }
  },

  addToTeam: async (
    userId: string,
    teamData: {
      team_role: string;
      team_bio?: string;
      team_image_url?: string;
      social_links?: any;
      team_order_index?: number;
    },
  ) => {
    try {
      const { data, error } = await supabaseAdmin
        .from("user_profiles")
        .update({
          is_team_member: true,
          team_role: teamData.team_role,
          team_bio: teamData.team_bio || null,
          team_image_url: teamData.team_image_url || null,
          social_links: teamData.social_links || {},
          team_order_index: teamData.team_order_index || 0,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId)
        .select()
        .single();

      if (error) throw error;
      cache.delete("team-members");
      cache.delete(`profile-${userId}`);
      return data;
    } catch (error: any) {
      console.error("Add to team error:", error);
      throw new Error("Gagal menambahkan ke team");
    }
  },

  removeFromTeam: async (userId: string) => {
    try {
      const { data, error } = await supabaseAdmin
        .from("user_profiles")
        .update({
          is_team_member: false,
          team_role: null,
          team_bio: null,
          team_image_url: null,
          social_links: null,
          team_order_index: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId)
        .select()
        .single();

      if (error) throw error;
      cache.delete("team-members");
      cache.delete(`profile-${userId}`);
      return data;
    } catch (error: any) {
      console.error("Remove from team error:", error);
      throw new Error("Gagal menghapus dari team");
    }
  },

  updateTeamMember: async (
    userId: string,
    teamData: {
      team_role?: string;
      team_bio?: string;
      team_image_url?: string;
      social_links?: any;
      team_order_index?: number;
      is_team_member?: boolean;
      full_name?: string;
      phone?: string;
      role?: "client" | "admin";
    },
  ) => {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (teamData.team_role !== undefined) updateData.team_role = teamData.team_role;
      if (teamData.team_bio !== undefined) updateData.team_bio = teamData.team_bio;
      if (teamData.team_image_url !== undefined) updateData.team_image_url = teamData.team_image_url;
      if (teamData.social_links !== undefined) updateData.social_links = teamData.social_links;
      if (teamData.team_order_index !== undefined) updateData.team_order_index = teamData.team_order_index;
      if (teamData.is_team_member !== undefined) updateData.is_team_member = teamData.is_team_member;
      if (teamData.full_name !== undefined) updateData.full_name = teamData.full_name;
      if (teamData.phone !== undefined) updateData.phone = teamData.phone;
      if (teamData.role !== undefined) updateData.role = teamData.role;

      const { data, error } = await supabaseAdmin.from("user_profiles").update(updateData).eq("id", userId).select().single();

      if (error) throw error;
      cache.delete("team-members");
      cache.delete(`profile-${userId}`);
      return data;
    } catch (error: any) {
      console.error("Update team member error:", error);
      throw new Error("Gagal mengupdate team member");
    }
  },

  updateTeamOrder: async (teamOrders: Array<{ id: string; team_order_index: number }>) => {
    try {
      const updates = teamOrders.map((item) =>
        supabaseAdmin
          .from("user_profiles")
          .update({
            team_order_index: item.team_order_index,
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.id),
      );

      const results = await Promise.all(updates);
      for (const result of results) {
        if (result.error) throw result.error;
      }

      cache.delete("team-members");
      return true;
    } catch (error: any) {
      console.error("Update team order error:", error);
      throw new Error("Gagal mengupdate urutan team");
    }
  },

  uploadTeamImage: async (file: File, userId: string) => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `team/${fileName}`;

      const { error: uploadError } = await supabaseAdmin.storage.from("team-images").upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabaseAdmin.storage.from("team-images").getPublicUrl(filePath);

      return publicUrl;
    } catch (error: any) {
      console.error("Upload team image error:", error);
      throw new Error("Gagal mengupload gambar team");
    }
  },

  deleteTeamImage: async (imageUrl: string) => {
    try {
      const fileName = imageUrl.split("/").pop();
      if (!fileName) throw new Error("Invalid image URL");

      const { error } = await supabaseAdmin.storage.from("team-images").remove([`team/${fileName}`]);
      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error("Delete team image error:", error);
      throw new Error("Gagal menghapus gambar team");
    }
  },

  getPublicTestimonials: async (limit: number = 6) => {
    try {
      const { data, error } = await supabase.from("testimonials").select("*").eq("is_active", true).order("created_at", { ascending: false }).limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error("Get public testimonials error:", error);
      throw new Error("Gagal mengambil testimoni");
    }
  },

  createAdminUser: async (userData: { email: string; password: string; full_name: string; phone?: string; role?: "admin"; team_role?: string; team_bio?: string; team_image_url?: string; social_links?: any }) => {
    try {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
        user_metadata: {
          full_name: userData.full_name,
          phone: userData.phone,
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create auth user");

      const { data: profileData, error: profileError } = await supabaseAdmin
        .from("user_profiles")
        .insert({
          id: authData.user.id,
          email: userData.email,
          full_name: userData.full_name,
          phone: userData.phone || null,
          role: userData.role || "admin",
          is_team_member: true,
          team_role: userData.team_role || "Team Member",
          team_bio: userData.team_bio || "",
          team_image_url: userData.team_image_url || null,
          social_links: userData.social_links || {},
          team_order_index: 999,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (profileError) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        throw profileError;
      }

      cache.delete("team-members");
      cache.delete("admins-all");
      cache.delete("users-all");
      return profileData;
    } catch (error: any) {
      console.error("Create admin user error:", error);
      throw new Error("Gagal membuat admin user: " + error.message);
    }
  },

  updateUserRole: async (userId: string, role: "client" | "admin") => {
    try {
      const { data, error } = await supabaseAdmin
        .from("user_profiles")
        .update({
          role: role,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId)
        .select()
        .single();

      if (error) throw error;
      cache.delete(`profile-${userId}`);
      cache.delete("users-all");
      cache.delete("admins-all");
      return data;
    } catch (error: any) {
      console.error("Update user role error:", error);
      throw new Error("Gagal mengupdate role user");
    }
  },

  searchUsersForTeam: async (searchTerm: string) => {
    try {
      const { data, error } = await supabaseAdmin.from("user_profiles").select("*").or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`).order("full_name", { ascending: true }).limit(20);

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error("Search users error:", error);
      throw new Error("Gagal mencari users");
    }
  },

  getTeamStats: async () => {
    try {
      const { data: teamCount, error: teamError } = await supabaseAdmin.from("user_profiles").select("id", { count: "exact" }).eq("is_team_member", true);

      const { data: adminCount, error: adminError } = await supabaseAdmin.from("user_profiles").select("id", { count: "exact" }).in("role", ["admin"]);

      if (teamError || adminError) throw teamError || adminError;

      return {
        team_members: teamCount?.length || 0,
        admins: adminCount?.length || 0,
      };
    } catch (error: any) {
      console.error("Get team stats error:", error);
      throw new Error("Gagal mengambil statistik team");
    }
  },

  // ========== PACKAGE MANAGEMENT ==========
  getPackages: async (forceRefresh = false) => {
    const cacheKey = "packages-all";
    if (!forceRefresh) {
      const cached = cache.get(cacheKey);
      if (cached) return cached;
    }

    try {
      const { data, error } = await supabase.from("packages").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      cache.set(cacheKey, data || [], 300000);
      return data || [];
    } catch (error: any) {
      console.error("Get packages error:", error);
      return [];
    }
  },

  createPackage: async (packageData: any) => {
    try {
      const packageCode = await generateNextId("packages", "PKG");

      const { data, error } = await supabaseAdmin
        .from("packages")
        .insert({
          ...packageData,
          package_code: packageCode,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      cache.clear();
      return data;
    } catch (error: any) {
      console.error("Create package error:", error);
      throw new Error("Gagal membuat paket");
    }
  },

  // Di dbHelpers.ts, pastikan updatePackage menerima semua field
  updatePackage: async (id: string, packageData: any) => {
    try {
      const { data, error } = await supabaseAdmin.from("packages").update(packageData).eq("id", id).select().single();

      if (error) throw error;
      cache.clear();
      return data;
    } catch (error: any) {
      console.error("Update package error:", error);
      throw new Error("Gagal mengupdate paket");
    }
  },

  deletePackage: async (id: string) => {
    try {
      const { error } = await supabaseAdmin.from("packages").delete().eq("id", id);
      if (error) throw error;
      cache.clear();
      return true;
    } catch (error: any) {
      console.error("Delete package error:", error);
      throw new Error("Gagal menghapus paket");
    }
  },

  // ========== TOPUP MANAGEMENT ==========
  getTopups: async (forceRefresh = false) => {
    const cacheKey = "topups-all";
    if (!forceRefresh) {
      const cached = cache.get(cacheKey);
      if (cached) return cached;
    }

    try {
      const { data, error } = await supabase
        .from("topups")
        .select(
          `
          *,
          user_profiles!topups_user_id_fkey (
            full_name,
            email
          )
        `,
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Join error, fetching without user profiles:", error);
        const { data: simpleData, error: simpleError } = await supabase.from("topups").select("*").order("created_at", { ascending: false });

        if (simpleError) {
          console.error("Fallback fetch error:", simpleError);
          throw simpleError;
        }

        const fallbackData = simpleData || [];
        cache.set(cacheKey, fallbackData, 60000);
        return fallbackData;
      }

      const result = data || [];
      cache.set(cacheKey, result, 60000);
      return result;
    } catch (error: any) {
      console.error("Get topups error:", error);
      return [];
    }
  },

  createTopup: async (topupData: any) => {
    try {
      const topupCode = await generateNextId("topups", "BNDT");

      // Data untuk insert - HANYA kolom yang ada di tabel
      const insertData = {
        user_id: topupData.user_id,
        amount: topupData.amount,
        topup_code: topupCode,
        status: "pending",
        payment_method: topupData.payment_method || "duitku",
        payment_proof_url: null,
        notes: topupData.notes || `Topup via ${topupData.payment_method || "DuitKu"}`,
        approved_by: null,
        expires_at: topupData.expires_at || new Date(Date.now() + 3600000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log("📦 Inserting topup data:", insertData);

      const { data, error } = await supabaseAdmin.from("topups").insert(insertData).select().single();

      if (error) {
        console.error("❌ Database insert error details:", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        throw new Error(`Database error: ${error.message}`);
      }

      console.log("✅ Topup created successfully:", data);

      // Clear cache
      cache.delete(`topups-${topupData.user_id}`);
      cache.delete("topups-all");

      return data;
    } catch (error: any) {
      console.error("🔥 Create topup error:", error);
      throw new Error("Gagal membuat permintaan topup: " + error.message);
    }
  },

  updateTopupStatus: async (topupCode: string, status: string, amount?: number) => {
    try {
      const updateData: any = {
        status: status,
        updated_at: new Date().toISOString(),
      };

      if (amount) {
        updateData.amount = amount;
      }

      if (status === "approved") {
        updateData.approved_by = "system_duitku";
        updateData.approved_at = new Date().toISOString();
      }

      const { data, error } = await supabaseAdmin.from("topups").update(updateData).eq("topup_code", topupCode).select().single();

      if (error) throw error;

      if (data.user_id) {
        cache.delete(`topups-${data.user_id}`);
        cache.delete(`profile-${data.user_id}`);
      }

      return data;
    } catch (error: any) {
      console.error("Update topup status error:", error);
      throw new Error("Gagal update status topup");
    }
  },

  cancelTopup: async (topupId: string, userId: string) => {
    try {
      const { data: topup, error: fetchError } = await supabase.from("topups").select("*").eq("id", topupId).eq("user_id", userId).single();

      if (fetchError) throw fetchError;

      if (topup.status !== "pending") {
        throw new Error("Hanya topup dengan status pending yang bisa dibatalkan");
      }

      if (new Date(topup.expires_at) < new Date()) {
        throw new Error("Topup sudah expired");
      }

      const { error } = await supabase
        .from("topups")
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", topupId)
        .eq("user_id", userId);

      if (error) throw error;
      cache.delete(`topups-${userId}`);
      return true;
    } catch (error: any) {
      console.error("Cancel topup error:", error);
      throw new Error(error.message || "Gagal membatalkan topup");
    }
  },

  cleanupExpiredTopups: async () => {
    try {
      const now = new Date().toISOString();

      const { data: expiredTopups, error: checkError } = await supabaseAdmin.from("topups").select("id").eq("status", "pending").lt("expires_at", now).limit(10);

      if (checkError) {
        console.warn("⚠️ Check expired topups error:", checkError);
        return false;
      }

      if (!expiredTopups || expiredTopups.length === 0) {
        return true;
      }

      console.log(`🔄 Cleaning up ${expiredTopups.length} expired topups...`);

      const { error: updateError } = await supabaseAdmin
        .from("topups")
        .update({
          status: "expired",
          updated_at: now,
        })
        .eq("status", "pending")
        .lt("expires_at", now);

      if (updateError) {
        console.error("❌ Update expired topups error:", updateError);
        return false;
      }

      console.log("✅ Cleanup expired topups completed");
      return true;
    } catch (error: any) {
      console.error("🔥 Cleanup expired topups error:", error);
      return false;
    }
  },

  // ========== ORDERS MANAGEMENT ==========
  getOrders: async (forceRefresh = false) => {
    const cacheKey = "orders-all";
    if (!forceRefresh) {
      const cached = cache.get(cacheKey);
      if (cached) return cached;
    }

    try {
      const { data: tableExists } = await supabase.from("orders").select("id").limit(1);
      if (!tableExists) {
        console.warn("Orders table doesn't exist or is empty");
        return [];
      }

      try {
        const { data, error } = await supabase
          .from("orders")
          .select(
            `
            *,
            packages!orders_package_id_fkey (
              name,
              description
            ),
            user_profiles!orders_user_id_fkey (
              full_name,
              email
            )
          `,
          )
          .order("created_at", { ascending: false })
          .limit(100);

        if (error) {
          console.warn("Join query failed, trying without joins:", error);
          throw error;
        }

        const result = data || [];
        cache.set(cacheKey, result, 30000);
        return result;
      } catch (joinError) {
        console.log("Using fallback: fetching orders without joins");
        const { data: simpleData, error: simpleError } = await supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(100);

        if (simpleError) {
          console.error("Fallback fetch error:", simpleError);
          return [];
        }

        const fallbackData = simpleData || [];
        cache.set(cacheKey, fallbackData, 30000);
        return fallbackData;
      }
    } catch (error: any) {
      console.error("Get orders error:", error);
      return [];
    }
  },

  createOrder: async (orderData: any) => {
    try {
      console.log("🚀 Starting createOrder process...");

      const orderCode = await generateNextId("orders", "ORDER");

      if (!orderData.user_id) {
        throw new Error("User ID tidak valid");
      }

      // Check balance
      const { data: profile, error: profileError } = await supabase.from("user_profiles").select("balance").eq("id", orderData.user_id).single();

      if (profileError) {
        console.error("❌ Profile error:", profileError);
        throw new Error("Gagal memeriksa saldo: " + profileError.message);
      }

      const currentBalance = profile?.balance || 0;
      console.log("💰 Balance:", currentBalance, "Required:", orderData.package_price);

      if (currentBalance < orderData.package_price) {
        throw new Error(`Saldo tidak cukup. Saldo Anda: Rp ${currentBalance.toLocaleString()}. Dibutuhkan: Rp ${orderData.package_price.toLocaleString()}`);
      }

      // Deduct balance
      const newBalance = currentBalance - orderData.package_price;
      console.log("📉 New balance will be:", newBalance);

      const { error: balanceError } = await supabaseAdmin
        .from("user_profiles")
        .update({
          balance: newBalance,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderData.user_id);

      if (balanceError) {
        console.error("❌ Balance update error:", balanceError);
        throw new Error("Gagal mengurangi saldo: " + balanceError.message);
      }

      console.log("📝 Creating order with code:", orderCode);

      const orderPayload = {
        user_id: orderData.user_id,
        package_id: orderData.package_id,
        order_code: orderCode,
        project_name: orderData.project_name,
        details: orderData.details || null,
        package_name: orderData.package_name,
        package_price: orderData.package_price,
        client_name: orderData.client_name || null,
        client_contact: orderData.client_contact || null,
        client_email: orderData.client_email || null,
        status: "processing",
        progress: 10,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log("📤 Inserting order payload:", orderPayload);

      const { data, error } = await supabase.from("orders").insert(orderPayload).select().single();

      if (error) {
        console.error("❌ Order creation error:", error);
        console.log("🔄 Rolling back balance...");
        await supabaseAdmin
          .from("user_profiles")
          .update({
            balance: currentBalance,
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderData.user_id);

        throw new Error("Gagal membuat order: " + error.message);
      }

      console.log("✅ Order created successfully:", data);
      cache.delete(`orders-${orderData.user_id}`);
      cache.delete(`profile-${orderData.user_id}`);

      return data;
    } catch (error: any) {
      console.error("🔥 Create order final error:", error);
      throw error;
    }
  },

  updateOrderProgress: async (orderId: string, progress: number, adminNotes?: string) => {
    try {
      const { data, error } = await supabaseAdmin
        .from("orders")
        .update({
          progress: Math.min(100, Math.max(0, progress)),
          status: progress === 100 ? "completed" : "processing",
          admin_notes: adminNotes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId)
        .select()
        .single();

      if (error) throw error;

      if (data.user_id) {
        cache.delete(`orders-${data.user_id}`);
      }

      return data;
    } catch (error: any) {
      console.error("Update order error:", error);
      throw new Error(error.message || "Gagal mengupdate order");
    }
  },

  // ========== USERS MANAGEMENT ==========
  getUsers: async (forceRefresh = false) => {
    const cacheKey = "users-all";
    if (!forceRefresh) {
      const cached = cache.get(cacheKey);
      if (cached) return cached;
    }

    try {
      const { data, error } = await supabase.from("user_profiles").select("*").order("created_at", { ascending: false });

      if (error) throw error;
      cache.set(cacheKey, data || [], 120000);
      return data || [];
    } catch (error: any) {
      console.error("Get users error:", error);
      return [];
    }
  },

  // ========== FINANCIAL REPORTS ==========
  getFinancialReports: async (forceRefresh = false) => {
    const cacheKey = "reports-all";
    if (!forceRefresh) {
      const cached = cache.get(cacheKey);
      if (cached) return cached;
    }

    try {
      const { data, error } = await supabase.from("financial_reports").select("*").order("report_date", { ascending: false }).limit(30);

      if (error) throw error;
      cache.set(cacheKey, data || [], 300000);
      return data || [];
    } catch (error: any) {
      console.error("Get financial reports error:", error);
      return [];
    }
  },

  // ========== TESTIMONIALS ==========
  getTestimonials: async (forceRefresh = false) => {
    const cacheKey = "testimonials-all";
    if (!forceRefresh) {
      const cached = cache.get(cacheKey);
      if (cached) return cached;
    }

    try {
      const { data, error } = await supabase.from("testimonials").select("*").order("created_at", { ascending: false });

      if (error) throw error;
      cache.set(cacheKey, data || [], 300000);
      return data || [];
    } catch (error: any) {
      console.error("Get testimonials error:", error);
      return [];
    }
  },

  createTestimonial: async (testimonialData: any) => {
    try {
      const { data, error } = await supabaseAdmin
        .from("testimonials")
        .insert({
          ...testimonialData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error("Create testimonial error:", error);
      throw new Error("Gagal membuat testimoni");
    }
  },

  updateTestimonial: async (id: string, testimonialData: any) => {
    try {
      const { data, error } = await supabaseAdmin
        .from("testimonials")
        .update({
          ...testimonialData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error("Update testimonial error:", error);
      throw new Error("Gagal mengupdate testimoni");
    }
  },

  deleteTestimonial: async (id: string) => {
    try {
      const { error } = await supabaseAdmin.from("testimonials").delete().eq("id", id);
      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error("Delete testimonial error:", error);
      throw new Error("Gagal menghapus testimoni");
    }
  },

  // ========== OPTIMIZED CHAT SYSTEM ==========
  getChatsByUser: async (userId: string, limit: number = 100, lastMessageId?: string | null) => {
    const cacheKey = `chats-${userId}-${limit}-${lastMessageId || "latest"}`;

    try {
      let query = supabase
        .from("chats")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true }) // PASTIKAN ASCENDING
        .limit(limit);

      // Jika ada lastMessageId, fetch hanya pesan baru
      if (lastMessageId) {
        // Cari created_at dari lastMessageId
        const { data: lastMessage } = await supabase.from("chats").select("created_at").eq("id", lastMessageId).single();

        if (lastMessage) {
          query = query.gt("created_at", lastMessage.created_at);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      // Hapus duplikat berdasarkan ID
      const uniqueMessages = data ? [...new Map(data.map((item) => [item.id, item])).values()] : [];

      cache.set(cacheKey, uniqueMessages, 30000);
      return uniqueMessages;
    } catch (error: any) {
      console.error("Get user chats error:", error);
      return [];
    }
  },

  // Fungsi yang lebih ringan untuk real-time updates
  getLatestMessages: async (userId: string, lastMessageId?: string) => {
    try {
      let query = supabase.from("chats").select("id, message, is_admin, read, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(20);

      if (lastMessageId) {
        query = query.gt("id", lastMessageId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ? [...data].reverse() : [];
    } catch (error: any) {
      console.error("Get latest messages error:", error);
      return [];
    }
  },

  getUnreadCount: async (userId: string) => {
    const cacheKey = `unread-${userId}`;

    // Cek cache dulu
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      // Gunakan materialized view jika ada
      const { data, error } = await supabase.from("chat_unread_counts").select("unread_count").eq("user_id", userId).single();

      if (!error && data) {
        cache.set(cacheKey, data.unread_count, 10000); // Cache 10 detik
        return data.unread_count;
      }

      // Fallback ke query biasa
      const { count, error: countError } = await supabase.from("chats").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("is_admin", true).eq("read", false);

      const unreadCount = countError ? 0 : count || 0;
      cache.set(cacheKey, unreadCount, 10000);
      return unreadCount;
    } catch (error) {
      console.error("Get unread count error:", error);
      return 0;
    }
  },

  sendMessage: async (messageData: {
    user_id: string;
    message: string;
    is_admin: boolean;
    read: boolean;
    admin_id?: string; // Tambahkan ini
  }) => {
    try {
      const { data, error } = await supabaseAdmin
        .from("chats")
        .insert({
          ...messageData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Invalidate cache
      cache.delete(`chats-${messageData.user_id}-*`);
      cache.delete(`unread-${messageData.user_id}`);

      // Jika pesan admin, update unread count
      if (messageData.is_admin) {
        cache.delete(`admin-unread-total`);
      }

      return data;
    } catch (error: any) {
      console.error("Send message error:", error);
      throw new Error("Gagal mengirim pesan");
    }
  },

  // Optimized admin functions
  getAllChatUsers: async (forceRefresh = false) => {
    const cacheKey = "admin-all-chat-users";
    if (!forceRefresh) {
      const cached = cache.get(cacheKey);
      if (cached) return cached;
    }

    try {
      // Query yang lebih sederhana tanpa admin_id jika tidak diperlukan
      const { data: chats, error } = await supabase
        .from("chats")
        .select(
          `
        user_id,
        message,
        is_admin,
        read,
        created_at,
        user_profiles!inner (
          id,
          full_name,
          email
        )
      `,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      const userMap = new Map<string, any>();

      chats?.forEach((chat: any) => {
        const userId = chat.user_id;
        const profile = chat.user_profiles;

        if (!userMap.has(userId) || new Date(chat.created_at) > new Date(userMap.get(userId).latest_time)) {
          userMap.set(userId, {
            user_id: userId,
            full_name: profile?.full_name || "Unknown User",
            email: profile?.email || "",
            latest_message: chat.message,
            latest_time: chat.created_at,
            is_admin_reply: chat.is_admin,
            unread_count: 0,
          });
        }
      });

      const users = Array.from(userMap.values());

      // Hitung unread count untuk setiap user
      const userIds = users.map((u) => u.user_id);
      if (userIds.length > 0) {
        const { data: unreadData, error: unreadError } = await supabase.from("chats").select("user_id").in("user_id", userIds).eq("is_admin", false).eq("read", false);

        if (!unreadError && unreadData) {
          const unreadMap = new Map<string, number>();
          unreadData.forEach((item: any) => {
            unreadMap.set(item.user_id, (unreadMap.get(item.user_id) || 0) + 1);
          });

          users.forEach((user: any) => {
            user.unread_count = unreadMap.get(user.user_id) || 0;
          });
        }
      }

      // Urutkan berdasarkan waktu terbaru
      users.sort((a: any, b: any) => new Date(b.latest_time).getTime() - new Date(a.latest_time).getTime());

      cache.set(cacheKey, users, 15000);
      return users;
    } catch (error: any) {
      console.error("Get all chat users error:", error);
      return [];
    }
  },

  // Batch mark as read
  markMessagesAsRead: async (userId: string, messageIds?: string[]) => {
    try {
      let query = supabase
        .from("chats")
        .update({
          read: true,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("is_admin", true)
        .eq("read", false);

      if (messageIds && messageIds.length > 0) {
        query = query.in("id", messageIds);
      }

      const { error } = await query;
      if (error) throw error;

      // Invalidate cache
      cache.delete(`unread-${userId}`);
      cache.delete(`admin-unread-total`);
      cache.delete(`chats-${userId}-*`);

      return true;
    } catch (error: any) {
      console.error("Mark messages as read error:", error);
      throw new Error("Gagal menandai pesan sebagai dibaca");
    }
  },

  // Delete dengan optimasi cache
  deleteMessage: async (messageId: string, userId?: string) => {
    try {
      const { error } = await supabase.from("chats").delete().eq("id", messageId);

      if (error) throw error;

      // Invalidate cache yang relevan
      if (userId) {
        cache.delete(`chats-${userId}-*`);
      }

      cache.delete("admin-all-chat-users");

      return true;
    } catch (error: any) {
      console.error("Delete message error:", error);
      throw new Error("Gagal menghapus pesan");
    }
  },

  getChats: async (userId: string, page = 1, limit = 50, forceRefresh = false) => {
    const cacheKey = `chats-${userId}-${page}-${limit}`;
    if (!forceRefresh) {
      const cached = cache.get(cacheKey);
      if (cached) return cached;
    }

    try {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data, error, count } = await supabase
        .from("chats")
        .select("*", { count: "exact" })
        .eq("user_id", userId)
        .order("created_at", { ascending: true }) // PASTIKAN ASCENDING
        .range(from, to);

      if (error) throw error;

      const result = {
        data: data || [],
        page,
        limit,
        total: count || 0,
        hasMore: (count || 0) > page * limit,
      };

      cache.set(cacheKey, result, 30000);
      return result;
    } catch (error: any) {
      console.error("Get chats error:", error);
      throw new Error("Gagal mengambil chat");
    }
  },

  sendAdminMessage: async (messageData: { user_id: string; message: string }) => {
    try {
      const { data, error } = await supabase
        .from("chats")
        .insert({
          ...messageData,
          is_admin: true,
          read: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      cache.delete(`chats-${messageData.user_id}`);
      return data;
    } catch (error: any) {
      console.error("Send admin message error:", error);
      throw new Error("Gagal mengirim pesan admin");
    }
  },

  markAsRead: async (messageId: string, userId: string) => {
    try {
      const { error } = await supabase
        .from("chats")
        .update({
          read: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", messageId)
        .eq("user_id", userId);

      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error("Mark as read error:", error);
      throw new Error("Gagal menandai pesan");
    }
  },

  // ========== ADMIN CHAT FUNCTIONS ==========

  getUnreadCountForAdmin: async () => {
    try {
      const { count, error } = await supabase.from("chats").select("*", { count: "exact", head: true }).eq("read", false).eq("is_admin", false);

      if (error) throw error;
      return count || 0;
    } catch (error: any) {
      console.error("Get unread count error:", error);
      return 0;
    }
  },

  markAllAsReadForUser: async (userId: string) => {
    try {
      const { error } = await supabase
        .from("chats")
        .update({
          read: true,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("is_admin", false)
        .eq("read", false);

      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error("Mark all as read error:", error);
      throw new Error("Gagal menandai pesan sebagai dibaca");
    }
  },

  sendMessageAsAdmin: async (userId: string, message: string, adminId: string) => {
    try {
      const { data, error } = await supabase
        .from("chats")
        .insert({
          user_id: userId,
          message: message.trim(),
          is_admin: true,
          read: true,
          admin_id: adminId, // Pastikan field ini ada di tabel
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      cache.delete(`chats-${userId}`);
      return data;
    } catch (error: any) {
      console.error("Send admin message error:", error);
      throw new Error("Gagal mengirim pesan sebagai admin");
    }
  },

  generateDailyReport: async () => {
    try {
      console.log("📊 Generating daily report...");

      const today = new Date().toISOString().split("T")[0];
      const tomorrow = new Date(new Date().getTime() + 86400000).toISOString().split("T")[0];

      console.log("📅 Report for date:", today);

      let totalTopup = 0;
      let totalOrder = 0;
      let pendingOrders = 0;
      let completedOrders = 0;
      let activeUsers = 0;

      try {
        const { data: topups, error: topupsError } = await supabase.from("topups").select("amount").eq("status", "approved").gte("created_at", today).lt("created_at", tomorrow);

        if (topupsError) {
          console.warn("⚠️ Topups query error:", topupsError);
        } else {
          totalTopup = topups?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
        }
      } catch (topupError) {
        console.warn("⚠️ Topups calculation error:", topupError);
      }

      try {
        const { data: orders, error: ordersError } = await supabase.from("orders").select("package_price, status").gte("created_at", today).lt("created_at", tomorrow);

        if (ordersError) {
          console.warn("⚠️ Orders query error:", ordersError);
        } else {
          totalOrder = orders?.filter((o) => o.status === "completed").reduce((sum, o) => sum + (o.package_price || 0), 0) || 0;
          pendingOrders = orders?.filter((o) => o.status === "pending").length || 0;
          completedOrders = orders?.filter((o) => o.status === "completed").length || 0;
        }
      } catch (orderError) {
        console.warn("⚠️ Orders calculation error:", orderError);
      }

      try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const { count, error: usersError } = await supabase.from("user_profiles").select("*", { count: "exact", head: true }).gte("created_at", thirtyDaysAgo);

        if (usersError) {
          console.warn("⚠️ Users query error:", usersError);
        } else {
          activeUsers = count || 0;
        }
      } catch (userError) {
        console.warn("⚠️ Users calculation error:", userError);
      }

      console.log("📈 Report calculations:", {
        totalTopup,
        totalOrder,
        pendingOrders,
        completedOrders,
        activeUsers,
        totalIncome: totalTopup + totalOrder,
      });

      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          const { data, error } = await supabase
            .from("financial_reports")
            .upsert(
              {
                report_date: today,
                total_income: totalTopup + totalOrder,
                total_topup: totalTopup,
                total_order: totalOrder,
                pending_orders: pendingOrders,
                completed_orders: completedOrders,
                active_users: activeUsers,
                updated_at: new Date().toISOString(),
              },
              {
                onConflict: "report_date",
                ignoreDuplicates: false,
              },
            )
            .select()
            .single();

          if (error) {
            console.error(`❌ Report upsert error (attempt ${retryCount + 1}):`, error);
            if (error.code === "42P01") {
              throw new Error("Tabel financial_reports belum dibuat. Jalankan SQL di Supabase SQL Editor.");
            }
            retryCount++;
            if (retryCount < maxRetries) {
              console.log(`🔄 Retrying in 2 seconds...`);
              await new Promise((resolve) => setTimeout(resolve, 2000));
              continue;
            }
            throw error;
          }

          console.log("✅ Daily report generated successfully:", data);
          return data;
        } catch (retryError: any) {
          if (retryCount >= maxRetries - 1) {
            throw retryError;
          }
          retryCount++;
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }

      throw new Error("Failed to generate report after retries");
    } catch (error: any) {
      console.error("🔥 Generate report error:", error);
      if (error.message.includes("tabel") || error.message.includes("table") || error.code === "42P01") {
        throw new Error("Tabel laporan keuangan belum tersedia. Hubungi administrator untuk membuat tabel.");
      }
      throw new Error("Gagal generate laporan: " + error.message);
    }
  },

  // ========== FAQ BOT ==========
  getFAQs: async (category?: string) => {
    try {
      let query = supabase.from("faq_bot").select("*").eq("active", true).order("order_index", { ascending: true });
      if (category) {
        query = query.eq("category", category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error("Get FAQs error:", error);
      throw new Error("Gagal mengambil FAQ");
    }
  },

  searchFAQ: async (keyword: string) => {
    try {
      const { data, error } = await supabase.from("faq_bot").select("*").or(`question.ilike.%${keyword}%,answer.ilike.%${keyword}%`).eq("active", true);

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error("Search FAQ error:", error);
      throw new Error("Gagal mencari FAQ");
    }
  },

  // ========== UTILITIES ==========
  clearUserCache: (userId: string) => {
    cache.delete(`profile-${userId}`);
    cache.delete(`orders-${userId}`);
    cache.delete(`topups-${userId}`);
    cache.delete(`chats-${userId}`);
  },

  clearAllCache: () => {
    cache.clear();
    rateLimit.clearExpired();
  },
};
