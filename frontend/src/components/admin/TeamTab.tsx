"use client";
import { useState, useMemo, useEffect } from "react";
import { Upload } from "lucide-react";
import { Users, Search, Shield, Mail, Phone, Calendar, Trash2, Edit, UserPlus, X, CheckCircle2, AlertCircle, RefreshCw, Loader2, ChevronLeft, ChevronRight, Instagram, Linkedin, Github, MessageCircle, Crown } from "lucide-react";
import { supabase, dbHelpers } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

interface TeamTabProps {
  teamMembers: any[];
  onRefresh: () => void;
  currentAdmin: any;
}

export default function TeamTab({ teamMembers, onRefresh, currentAdmin }: TeamTabProps) {
  // Hanya tampilkan admin dan admin
  const adminMembers = useMemo(() => {
    return teamMembers.filter((member) => member.role === "admin" || member.role === "admin");
  }, [teamMembers]);

  const [teamForm, setTeamForm] = useState({
    id: "",
    name: "",
    role: "admin",
    team_role: "",
    bio: "",
    image_url: "",
    social_links: {
      instagram: "",
      linkedin: "",
      github: "",
      whatsapp: "",
    },
    is_team_member: true,
    team_order_index: 0,
    phone: "",
    email: "",
    password: "",
    current_image_url: "", // Menyimpan URL gambar lama untuk penghapusan
  });

  const [editingMember, setEditingMember] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [removeFromTeamConfirm, setRemoveFromTeamConfirm] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [addToTeamConfirm, setAddToTeamConfirm] = useState<string | null>(null);
  const [showNewAdminForm, setShowNewAdminForm] = useState(false);
  const [showAddToTeamForm, setShowAddToTeamForm] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const [newAdminForm, setNewAdminForm] = useState({
    email: "",
    full_name: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: "admin",
    team_role: "Team Member",
    bio: "",
  });

  const [addToTeamForm, setAddToTeamForm] = useState({
    team_role: "",
    bio: "",
    image_url: "",
    social_links: {
      instagram: "",
      linkedin: "",
      github: "",
      whatsapp: "",
    },
    team_order_index: 0,
    current_image_url: "",
  });

  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [addingToTeam, setAddingToTeam] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [selectedAddToTeamImageFile, setSelectedAddToTeamImageFile] = useState<File | null>(null);

  const itemsPerPage = 8;

  // Filter admin members
  const filteredMembers = useMemo(() => {
    return adminMembers.filter((member) => {
      // Filter by role
      if (roleFilter !== "all") {
        if (member.role !== roleFilter) return false;
      }

      // Filter by team membership
      if (teamFilter !== "all") {
        const shouldBeInTeam = teamFilter === "in_team";
        if (member.is_team_member !== shouldBeInTeam) return false;
      }

      // Filter by search
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return member.full_name?.toLowerCase().includes(searchLower) || member.email?.toLowerCase().includes(searchLower) || member.team_role?.toLowerCase().includes(searchLower) || member.phone?.toLowerCase().includes(searchLower);
      }

      return true;
    });
  }, [adminMembers, roleFilter, teamFilter, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedMembers = filteredMembers.slice(startIndex, endIndex);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [roleFilter, teamFilter, searchTerm]);

  // Fungsi untuk menghapus gambar lama dari storage
  const deleteOldImage = async (imageUrl: string) => {
    try {
      if (!imageUrl || !imageUrl.includes("supabase.co")) return;

      // Extract filename dari URL
      const urlParts = imageUrl.split("/");
      const fileName = urlParts[urlParts.length - 1];
      const userId = urlParts[urlParts.length - 2]; // Biasanya userId adalah folder

      if (!fileName || !userId) return;

      // Delete dari storage
      const { error } = await supabase.storage.from("team-images").remove([`${userId}/${fileName}`]);

      if (error) {
        console.warn("Failed to delete old image:", error.message);
      }
    } catch (error) {
      console.warn("Error deleting old image:", error);
    }
  };

  const handleSaveMember = async () => {
    if (!teamForm.id) {
      alert("Silakan pilih admin yang akan diupdate");
      return;
    }

    setLoading(true);
    try {
      let finalImageUrl = teamForm.image_url;

      // Upload gambar baru jika ada file yang dipilih
      if (selectedImageFile) {
        // Hapus gambar lama jika ada
        if (teamForm.current_image_url) {
          await deleteOldImage(teamForm.current_image_url);
        }

        // Upload gambar baru
        const imageUrl = await dbHelpers.uploadTeamImage(selectedImageFile, teamForm.id);
        finalImageUrl = imageUrl;
      }

      // Update menggunakan dbHelpers
      await dbHelpers.updateTeamMember(teamForm.id, {
        team_role: teamForm.team_role,
        team_bio: teamForm.bio,
        team_image_url: finalImageUrl,
        social_links: teamForm.social_links,
        team_order_index: teamForm.team_order_index,
        is_team_member: teamForm.is_team_member,
        full_name: teamForm.name,
        phone: teamForm.phone,
        role: teamForm.role,
      } as any);

      // Reset form
      setTeamForm({
        id: "",
        name: "",
        role: "admin",
        team_role: "",
        bio: "",
        image_url: "",
        social_links: {
          instagram: "",
          linkedin: "",
          github: "",
          whatsapp: "",
        },
        is_team_member: true,
        team_order_index: 0,
        phone: "",
        email: "",
        password: "",
        current_image_url: "",
      });
      setEditingMember(null);
      setSelectedImageFile(null);

      // Refresh data
      onRefresh();
      alert("Data member berhasil diperbarui!");
    } catch (error: any) {
      console.error("Save member error:", error);
      alert("Gagal menyimpan data member: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file: File, forForm: "team" | "addToTeam" = "team") => {
    if (!file) return;

    setUploadingImage(true);
    try {
      let userId = teamForm.id;
      if (forForm === "addToTeam" && selectedUserId) {
        userId = selectedUserId;
      }

      if (!userId) {
        throw new Error("User ID tidak ditemukan");
      }

      const imageUrl = await dbHelpers.uploadTeamImage(file, userId);

      if (forForm === "team") {
        setTeamForm({ ...teamForm, image_url: imageUrl });
      } else {
        setAddToTeamForm({ ...addToTeamForm, image_url: imageUrl });
      }

      alert("Gambar berhasil diupload!");
    } catch (error: any) {
      console.error("Image upload error:", error);
      alert("Gagal mengupload gambar: " + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCreateNewAdmin = async () => {
    if (!newAdminForm.email || !newAdminForm.full_name || !newAdminForm.password) {
      alert("Email, nama lengkap, dan password harus diisi!");
      return;
    }

    if (newAdminForm.password !== newAdminForm.confirmPassword) {
      alert("Password dan konfirmasi password tidak cocok!");
      return;
    }

    if (newAdminForm.password.length < 6) {
      alert("Password minimal 6 karakter!");
      return;
    }

    setCreatingAdmin(true);
    try {
      // Gunakan RPC atau langsung insert dengan service role key jika diperlukan
      await dbHelpers.createAdminUser({
        email: newAdminForm.email,
        password: newAdminForm.password,
        full_name: newAdminForm.full_name,
        phone: newAdminForm.phone,
        role: newAdminForm.role as "admin",
        team_role: newAdminForm.team_role,
        team_bio: newAdminForm.bio,
      });

      // Reset form
      setNewAdminForm({
        email: "",
        full_name: "",
        phone: "",
        password: "",
        confirmPassword: "",
        role: "admin",
        team_role: "Team Member",
        bio: "",
      });
      setShowNewAdminForm(false);

      // Refresh data
      onRefresh();
      alert("Admin berhasil dibuat!");
    } catch (error: any) {
      console.error("Create admin error:", error);

      // Error handling untuk RLS
      if (error.message.includes("row-level security policy")) {
        alert("Gagal membuat admin: Pastikan Anda memiliki hak akses yang cukup. Hubungi admin.");
      } else {
        alert("Gagal membuat admin: " + error.message);
      }
    } finally {
      setCreatingAdmin(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === currentAdmin?.id) {
      alert("Tidak dapat menghapus akun sendiri!");
      return;
    }

    try {
      // 1. Hapus gambar profil dari storage jika ada
      const member = adminMembers.find((m) => m.id === userId);
      if (member?.team_image_url) {
        await deleteOldImage(member.team_image_url);
      }

      // 2. Delete profile dengan menggunakan service role jika diperlukan
      // Atau gunakan RPC function yang bypass RLS
      const { error: profileError } = await supabase.from("user_profiles").delete().eq("id", userId);

      if (profileError) {
        // Jika error RLS, coba gunakan RPC
        if (profileError.message.includes("row-level security policy")) {
          // Panggil RPC function yang sudah dibuat untuk delete user
          const { error: rpcError } = await supabase.rpc("delete_user_by_admin", { user_id: userId });

          if (rpcError) throw rpcError;
        } else {
          throw profileError;
        }
      }

      setDeleteConfirm(null);
      onRefresh();
      alert("User berhasil dihapus!");
    } catch (error: any) {
      console.error("Delete user error:", error);

      if (error.message.includes("row-level security policy")) {
        alert("Gagal menghapus user: Anda tidak memiliki izin. Hubungi admin.");
      } else {
        alert("Gagal menghapus user: " + error.message);
      }
    }
  };

  const handleRemoveFromTeam = async (userId: string) => {
    try {
      await dbHelpers.removeFromTeam(userId);

      setRemoveFromTeamConfirm(null);
      onRefresh();
      alert("Berhasil menghapus dari team!");
    } catch (error: any) {
      console.error("Remove from team error:", error);

      if (error.message.includes("row-level security policy")) {
        alert("Gagal menghapus dari team: Anda tidak memiliki izin. Hubungi  admin.");
      } else {
        alert("Gagal menghapus dari team: " + error.message);
      }
    }
  };

  const handleAddToTeam = async () => {
    if (!selectedUserId) {
      alert("Silakan pilih user!");
      return;
    }

    if (!addToTeamForm.team_role) {
      alert("Posisi di team harus diisi!");
      return;
    }

    setAddingToTeam(true);
    try {
      let finalImageUrl = addToTeamForm.image_url;

      // Upload gambar baru jika ada file yang dipilih
      if (selectedAddToTeamImageFile) {
        // Hapus gambar lama jika ada
        if (addToTeamForm.current_image_url) {
          await deleteOldImage(addToTeamForm.current_image_url);
        }

        // Upload gambar baru
        const imageUrl = await dbHelpers.uploadTeamImage(selectedAddToTeamImageFile, selectedUserId);
        finalImageUrl = imageUrl;
      }

      await dbHelpers.addToTeam(selectedUserId, {
        team_role: addToTeamForm.team_role,
        team_bio: addToTeamForm.bio,
        team_image_url: finalImageUrl,
        social_links: addToTeamForm.social_links,
        team_order_index: addToTeamForm.team_order_index,
      });

      // Reset form
      setSelectedUserId("");
      setAddToTeamForm({
        team_role: "",
        bio: "",
        image_url: "",
        social_links: {
          instagram: "",
          linkedin: "",
          github: "",
          whatsapp: "",
        },
        team_order_index: 0,
        current_image_url: "",
      });
      setSelectedAddToTeamImageFile(null);
      setShowAddToTeamForm(false);

      // Refresh data
      onRefresh();
      alert("Berhasil menambahkan ke team!");
    } catch (error: any) {
      console.error("Add to team error:", error);

      if (error.message.includes("row-level security policy")) {
        alert("Gagal menambahkan ke team: Anda tidak memiliki izin. Hubungi admin.");
      } else {
        alert("Gagal menambahkan ke team: " + error.message);
      }
    } finally {
      setAddingToTeam(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    if (userId === currentAdmin?.id && newRole !== "admin") {
      alert("Anda tidak bisa menurunkan role akun sendiri!");
      return;
    }

    try {
      await dbHelpers.updateUserRole(userId, newRole as "client" | "admin");
      onRefresh();
      alert("Role berhasil diupdate!");
    } catch (error: any) {
      console.error("Update role error:", error);

      if (error.message.includes("row-level security policy")) {
        alert("Gagal mengupdate role: Anda tidak memiliki izin. Hubungi admin.");
      } else {
        alert("Gagal mengupdate role: " + error.message);
      }
    }
  };

  const handleImageSelect = (file: File, forForm: "team" | "addToTeam" = "team") => {
    if (!file) return;

    // Validasi tipe file
    if (!file.type.startsWith("image/")) {
      alert("Hanya file gambar yang diperbolehkan!");
      return;
    }

    // Validasi ukuran file (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Ukuran gambar maksimal 5MB!");
      return;
    }

    // Preview image
    const reader = new FileReader();
    reader.onloadend = () => {
      const imageUrl = reader.result as string;

      if (forForm === "team") {
        setTeamForm({ ...teamForm, image_url: imageUrl });
        setSelectedImageFile(file);
      } else {
        setAddToTeamForm({ ...addToTeamForm, image_url: imageUrl });
        setSelectedAddToTeamImageFile(file);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSearchUsers = async (search: string) => {
    if (search.length < 2) {
      setAllUsers([]);
      return;
    }

    setSearchingUsers(true);
    try {
      const users = await dbHelpers.searchUsersForTeam(search);
      setAllUsers(users);
    } catch (error: any) {
      console.error("Search users error:", error);
      alert("Gagal mencari users: " + error.message);
    } finally {
      setSearchingUsers(false);
    }
  };

  const stats = {
    totalAdmins: adminMembers.length,
    inTeam: adminMembers.filter((m) => m.is_team_member).length,
    Admins: adminMembers.filter((m) => m.role === "admin").length,
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Stats Summary */}
      <div className="lg:col-span-12 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-red-600/20 to-red-600/5 border border-red-600/30 p-6 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Total Admins</p>
                <p className="text-3xl font-black mt-2">{stats.totalAdmins}</p>
              </div>
              <Shield className="text-red-600" size={24} />
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-600/20 to-blue-600/5 border border-blue-600/30 p-6 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">In Team</p>
                <p className="text-3xl font-black mt-2">{stats.inTeam}</p>
              </div>
              <Users className="text-blue-600" size={24} />
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-600/5 border border-yellow-600/30 p-6 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400"> Admins</p>
                <p className="text-3xl font-black mt-2">{stats.Admins}</p>
              </div>
              <Crown className="text-yellow-600" size={24} />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-600/20 to-green-600/5 border border-green-600/30 p-6 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Active</p>
                <p className="text-3xl font-black mt-2">{adminMembers.filter((m) => m.is_team_member).length}</p>
              </div>
              <CheckCircle2 className="text-green-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Form Section */}
      <div className="lg:col-span-4">
        <div className="bg-[#0c0c0c] p-6 rounded-3xl border border-zinc-900 sticky top-24">
          <div className="flex items-center justify-between mb-6 border-b border-zinc-900 pb-4">
            <div className="flex items-center gap-3">
              <Users size={18} className="text-red-600" />
              <h2 className="text-sm font-black uppercase tracking-wider">{editingMember ? "Edit Team Member" : "Update Admin/Team"}</h2>
            </div>
            {editingMember && (
              <button
                onClick={() => {
                  setTeamForm({
                    id: "",
                    name: "",
                    role: "admin",
                    team_role: "",
                    bio: "",
                    image_url: "",
                    social_links: {
                      instagram: "",
                      linkedin: "",
                      github: "",
                      whatsapp: "",
                    },
                    is_team_member: true,
                    team_order_index: 0,
                    phone: "",
                    email: "",
                    password: "",
                    current_image_url: "",
                  });
                  setEditingMember(null);
                  setSelectedImageFile(null);
                }}
                className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="space-y-4">
            {/* Pilih Admin */}
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">Pilih Admin</label>
              <select
                value={teamForm.id}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  if (!selectedId) {
                    setTeamForm({
                      id: "",
                      name: "",
                      role: "admin",
                      team_role: "",
                      bio: "",
                      image_url: "",
                      social_links: {
                        instagram: "",
                        linkedin: "",
                        github: "",
                        whatsapp: "",
                      },
                      is_team_member: true,
                      team_order_index: 0,
                      phone: "",
                      email: "",
                      password: "",
                      current_image_url: "",
                    });
                    setEditingMember(null);
                    setSelectedImageFile(null);
                    return;
                  }

                  const selectedMember = adminMembers.find((m) => m.id === selectedId);
                  if (selectedMember) {
                    setTeamForm({
                      id: selectedMember.id,
                      name: selectedMember.full_name || "",
                      role: selectedMember.role || "admin",
                      team_role: selectedMember.team_role || "",
                      bio: selectedMember.team_bio || "",
                      image_url: selectedMember.team_image_url || "",
                      social_links: selectedMember.social_links || {
                        instagram: "",
                        linkedin: "",
                        github: "",
                        whatsapp: "",
                      },
                      is_team_member: selectedMember.is_team_member || true,
                      team_order_index: selectedMember.team_order_index || 0,
                      phone: selectedMember.phone || "",
                      email: selectedMember.email || "",
                      password: "",
                      current_image_url: selectedMember.team_image_url || "",
                    });
                    setEditingMember(selectedMember);
                    setSelectedImageFile(null);
                  }
                }}
                className="w-full bg-black border border-zinc-800 p-3 rounded-xl text-sm focus:border-red-600 outline-none"
              >
                <option value="">-- Pilih Admin --</option>
                {adminMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.full_name} ({member.email})
                  </option>
                ))}
              </select>
            </div>

            {teamForm.id && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      placeholder="Nama Lengkap *"
                      value={teamForm.name}
                      onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                      className="w-full bg-black border border-zinc-800 p-3 rounded-xl text-sm focus:border-red-600 outline-none"
                    />
                  </div>

                  <div>
                    <input
                      placeholder="Posisi di Team"
                      value={teamForm.team_role}
                      onChange={(e) => setTeamForm({ ...teamForm, team_role: e.target.value })}
                      className="w-full bg-black border border-zinc-800 p-3 rounded-xl text-sm focus:border-red-600 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      placeholder="Email"
                      value={teamForm.email}
                      onChange={(e) => setTeamForm({ ...teamForm, email: e.target.value })}
                      className="w-full bg-black border border-zinc-800 p-3 rounded-xl text-sm focus:border-red-600 outline-none"
                      disabled
                    />
                  </div>

                  <div>
                    <input
                      placeholder="No. WhatsApp"
                      value={teamForm.phone}
                      onChange={(e) => setTeamForm({ ...teamForm, phone: e.target.value })}
                      className="w-full bg-black border border-zinc-800 p-3 rounded-xl text-sm focus:border-red-600 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <textarea
                    placeholder="Bio/Deskripsi"
                    value={teamForm.bio}
                    onChange={(e) => setTeamForm({ ...teamForm, bio: e.target.value })}
                    className="w-full bg-black border border-zinc-800 p-3 rounded-xl text-sm h-24 resize-none focus:border-red-600 outline-none"
                    rows={3}
                  />
                </div>

                {/* Social Links */}
                <div className="space-y-3">
                  <label className="text-sm text-zinc-400">Social Links</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                      <input
                        placeholder="Instagram"
                        value={teamForm.social_links.instagram}
                        onChange={(e) =>
                          setTeamForm({
                            ...teamForm,
                            social_links: { ...teamForm.social_links, instagram: e.target.value },
                          })
                        }
                        className="w-full bg-black border border-zinc-800 p-3 rounded-xl text-sm pl-10 focus:border-red-600 outline-none"
                      />
                    </div>

                    <div className="relative">
                      <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                      <input
                        placeholder="LinkedIn"
                        value={teamForm.social_links.linkedin}
                        onChange={(e) =>
                          setTeamForm({
                            ...teamForm,
                            social_links: { ...teamForm.social_links, linkedin: e.target.value },
                          })
                        }
                        className="w-full bg-black border border-zinc-800 p-3 rounded-xl text-sm pl-10 focus:border-red-600 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <Github className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                      <input
                        placeholder="GitHub"
                        value={teamForm.social_links.github}
                        onChange={(e) =>
                          setTeamForm({
                            ...teamForm,
                            social_links: { ...teamForm.social_links, github: e.target.value },
                          })
                        }
                        className="w-full bg-black border border-zinc-800 p-3 rounded-xl text-sm pl-10 focus:border-red-600 outline-none"
                      />
                    </div>

                    <div className="relative">
                      <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                      <input
                        placeholder="WhatsApp"
                        value={teamForm.social_links.whatsapp}
                        onChange={(e) =>
                          setTeamForm({
                            ...teamForm,
                            social_links: { ...teamForm.social_links, whatsapp: e.target.value },
                          })
                        }
                        className="w-full bg-black border border-zinc-800 p-3 rounded-xl text-sm pl-10 focus:border-red-600 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Image Upload */}
                <div>
                  <label className="text-sm text-zinc-400 mb-2 block">Foto Profil</label>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                      <input
                        type="text"
                        placeholder="URL gambar atau pilih file"
                        value={teamForm.image_url}
                        onChange={(e) => setTeamForm({ ...teamForm, image_url: e.target.value })}
                        className="w-full bg-black border border-zinc-800 p-3 rounded-xl text-sm pl-10 focus:border-red-600 outline-none"
                      />
                    </div>

                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageSelect(file, "team");
                        }}
                      />
                      <div className="px-4 py-3 rounded-xl text-sm flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white cursor-pointer transition-colors">
                        <Upload size={16} />
                        <span className="hidden md:inline">Pilih File</span>
                      </div>
                    </label>
                  </div>

                  {selectedImageFile && (
                    <div className="mt-2 text-xs text-green-500 flex items-center gap-1">
                      <CheckCircle2 size={12} />
                      File dipilih: {selectedImageFile.name} ({Math.round(selectedImageFile.size / 1024)} KB)
                    </div>
                  )}
                </div>

                {/* Preview Image */}
                {teamForm.image_url && (
                  <div className="mt-2">
                    <div className="text-xs text-zinc-500 mb-1">Preview:</div>
                    <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-zinc-800 group">
                      <img
                        src={teamForm.image_url}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(teamForm.name)}&background=dc2626&color=fff`;
                        }}
                      />
                      <button
                        onClick={() => {
                          setTeamForm({ ...teamForm, image_url: "" });
                          setSelectedImageFile(null);
                        }}
                        className="absolute inset-0 bg-black/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={16} className="text-white" />
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-zinc-400 mb-2 block">Role</label>
                    <select value={teamForm.role} onChange={(e) => setTeamForm({ ...teamForm, role: e.target.value })} className="w-full bg-black border border-zinc-800 p-3 rounded-xl text-sm focus:border-red-600 outline-none">
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm text-zinc-400 mb-2 block">Urutan</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={teamForm.team_order_index}
                      onChange={(e) =>
                        setTeamForm({
                          ...teamForm,
                          team_order_index: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full bg-black border border-zinc-800 p-3 rounded-xl text-sm focus:border-red-600 outline-none"
                      min="0"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input type="checkbox" id="is_team_member" checked={teamForm.is_team_member} onChange={(e) => setTeamForm({ ...teamForm, is_team_member: e.target.checked })} className="w-4 h-4 accent-red-600" />
                  <label htmlFor="is_team_member" className="text-sm text-zinc-400">
                    Tampilkan di team website
                  </label>
                </div>

                <button onClick={handleSaveMember} disabled={loading} className="w-full py-3 bg-red-600 rounded-xl font-black hover:bg-red-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                  {loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : "Update Team Member"}
                </button>
              </>
            )}

            {!teamForm.id && (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <p className="text-zinc-600 text-sm mb-4">Pilih admin untuk mengedit data team</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setShowNewAdminForm(true)} className="py-3 bg-zinc-800 rounded-xl font-black hover:bg-zinc-700 transition-colors text-sm flex items-center justify-center gap-2">
                    <UserPlus size={16} />
                    Buat Admin
                  </button>

                  <button onClick={() => setShowAddToTeamForm(true)} className="py-3 bg-blue-600/20 border border-blue-600/30 rounded-xl font-black hover:bg-blue-600/30 transition-colors text-sm flex items-center justify-center gap-2">
                    <Users size={16} />
                    Tambah ke Team
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Members List */}
      <div className="lg:col-span-8">
        <div className="bg-[#0c0c0c] rounded-3xl border border-zinc-900 overflow-hidden">
          {/* Header with Filters */}
          <div className="p-4 md:p-6 border-b border-zinc-900">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="text-lg font-black">Admin Team Members</h3>
                <p className="text-sm text-zinc-500">{filteredMembers.length} admin ditemukan</p>
              </div>

              <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:flex-initial">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                  <input
                    type="text"
                    placeholder="Search admins..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-black border border-zinc-800 rounded-lg text-sm w-full md:w-64 focus:border-red-600 outline-none"
                  />
                </div>

                <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="bg-black border border-zinc-800 px-3 py-2 rounded-lg text-sm focus:border-red-600 outline-none">
                  <option value="all">All Roles</option>
                  <option value="admin">Admin</option>
                </select>

                <select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)} className="bg-black border border-zinc-800 px-3 py-2 rounded-lg text-sm focus:border-red-600 outline-none">
                  <option value="all">All</option>
                  <option value="in_team">In Team</option>
                  <option value="not_in_team">Not in Team</option>
                </select>

                <button onClick={onRefresh} className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 transition-colors">
                  <RefreshCw size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Members Grid */}
          {paginatedMembers.length > 0 ? (
            <>
              <div className="divide-y divide-zinc-900">
                {paginatedMembers.map((member) => (
                  <TeamMemberCard
                    key={member.id}
                    member={member}
                    currentAdminId={currentAdmin?.id}
                    onEdit={() => {
                      setTeamForm({
                        id: member.id,
                        name: member.full_name || "",
                        role: member.role || "admin",
                        team_role: member.team_role || "",
                        bio: member.team_bio || "",
                        image_url: member.team_image_url || "",
                        social_links: member.social_links || {
                          instagram: "",
                          linkedin: "",
                          github: "",
                          whatsapp: "",
                        },
                        is_team_member: member.is_team_member || false,
                        team_order_index: member.team_order_index || 0,
                        phone: member.phone || "",
                        email: member.email || "",
                        password: "",
                        current_image_url: member.team_image_url || "",
                      });
                      setEditingMember(member);
                      setSelectedImageFile(null);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    onDelete={() => setDeleteConfirm(member.id)}
                    onRemoveFromTeam={() => setRemoveFromTeamConfirm(member.id)}
                    onUpdateRole={(newRole) => handleUpdateRole(member.id, newRole)}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="p-4 border-t border-zinc-900 flex items-center justify-between">
                  <div className="text-sm text-zinc-500">
                    Showing {startIndex + 1}-{Math.min(endIndex, filteredMembers.length)} of {filteredMembers.length}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-800"
                    >
                      <ChevronLeft size={16} />
                    </button>

                    <span className="text-sm font-mono px-3">
                      {currentPage} / {totalPages}
                    </span>

                    <button
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-800"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-12 text-center">
              <Users size={48} className="text-zinc-700 mx-auto mb-4" />
              <p className="text-zinc-600 text-sm">No admin members found</p>
              {(searchTerm || roleFilter !== "all" || teamFilter !== "all") && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setRoleFilter("all");
                    setTeamFilter("all");
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

      {/* New Admin Form Modal */}
      <AnimatePresence>
        {showNewAdminForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowNewAdminForm(false)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0c0c0c] border border-red-600/30 rounded-2xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <UserPlus size={20} className="text-red-600" />
                  <h3 className="text-lg font-black">Buat Admin Baru</h3>
                </div>
                <button onClick={() => setShowNewAdminForm(false)} className="p-1.5 hover:bg-zinc-800 rounded-lg">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4">
                <input
                  type="email"
                  placeholder="Email *"
                  value={newAdminForm.email}
                  onChange={(e) => setNewAdminForm({ ...newAdminForm, email: e.target.value })}
                  className="w-full bg-black border border-zinc-800 p-3 rounded-xl text-sm focus:border-red-600 outline-none"
                />

                <input
                  placeholder="Nama Lengkap *"
                  value={newAdminForm.full_name}
                  onChange={(e) => setNewAdminForm({ ...newAdminForm, full_name: e.target.value })}
                  className="w-full bg-black border border-zinc-800 p-3 rounded-xl text-sm focus:border-red-600 outline-none"
                />

                <input
                  placeholder="No. WhatsApp (Opsional)"
                  value={newAdminForm.phone}
                  onChange={(e) => setNewAdminForm({ ...newAdminForm, phone: e.target.value })}
                  className="w-full bg-black border border-zinc-800 p-3 rounded-xl text-sm focus:border-red-600 outline-none"
                />

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="password"
                    placeholder="Password *"
                    value={newAdminForm.password}
                    onChange={(e) => setNewAdminForm({ ...newAdminForm, password: e.target.value })}
                    className="w-full bg-black border border-zinc-800 p-3 rounded-xl text-sm focus:border-red-600 outline-none"
                  />

                  <input
                    type="password"
                    placeholder="Confirm Password *"
                    value={newAdminForm.confirmPassword}
                    onChange={(e) => setNewAdminForm({ ...newAdminForm, confirmPassword: e.target.value })}
                    className="w-full bg-black border border-zinc-800 p-3 rounded-xl text-sm focus:border-red-600 outline-none"
                  />
                </div>

                <input
                  placeholder="Posisi di Team"
                  value={newAdminForm.team_role}
                  onChange={(e) => setNewAdminForm({ ...newAdminForm, team_role: e.target.value })}
                  className="w-full bg-black border border-zinc-800 p-3 rounded-xl text-sm focus:border-red-600 outline-none"
                />

                <textarea
                  placeholder="Bio/Deskripsi"
                  value={newAdminForm.bio}
                  onChange={(e) => setNewAdminForm({ ...newAdminForm, bio: e.target.value })}
                  className="w-full bg-black border border-zinc-800 p-3 rounded-xl text-sm h-20 resize-none focus:border-red-600 outline-none"
                />

                <select value={newAdminForm.role} onChange={(e) => setNewAdminForm({ ...newAdminForm, role: e.target.value })} className="w-full bg-black border border-zinc-800 p-3 rounded-xl text-sm focus:border-red-600 outline-none">
                  <option value="admin">Admin</option>
                </select>

                <div className="flex gap-3 pt-4">
                  <button onClick={() => setShowNewAdminForm(false)} className="flex-1 py-2.5 bg-zinc-800 rounded-xl text-sm font-black hover:bg-zinc-700 transition-colors">
                    Batal
                  </button>
                  <button onClick={handleCreateNewAdmin} disabled={creatingAdmin} className="flex-1 py-2.5 bg-red-600 rounded-xl text-sm font-black hover:bg-red-700 transition-colors disabled:opacity-50">
                    {creatingAdmin ? <Loader2 className="animate-spin mx-auto" size={18} /> : "Buat Admin"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add to Team Form Modal */}
      <AnimatePresence>
        {showAddToTeamForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowAddToTeamForm(false)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0c0c0c] border border-blue-600/30 rounded-2xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Users size={20} className="text-blue-600" />
                  <h3 className="text-lg font-black">Tambah ke Team</h3>
                </div>
                <button onClick={() => setShowAddToTeamForm(false)} className="p-1.5 hover:bg-zinc-800 rounded-lg">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4">
                {/* Search User */}
                <div>
                  <label className="text-sm text-zinc-400 mb-2 block">Cari User</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                    <input
                      type="text"
                      placeholder="Cari user berdasarkan nama atau email..."
                      onChange={(e) => handleSearchUsers(e.target.value)}
                      className="w-full bg-black border border-zinc-800 p-3 rounded-xl text-sm pl-10 focus:border-blue-600 outline-none"
                    />
                  </div>

                  {/* User List */}
                  {searchingUsers && (
                    <div className="mt-2 text-center py-2">
                      <Loader2 size={16} className="animate-spin mx-auto text-blue-600" />
                    </div>
                  )}

                  {allUsers.length > 0 && (
                    <div className="mt-2 max-h-40 overflow-y-auto">
                      {allUsers.map((user) => (
                        <div
                          key={user.id}
                          onClick={() => {
                            setSelectedUserId(user.id);
                            setAddToTeamForm({
                              ...addToTeamForm,
                              team_role: user.team_role || "",
                              bio: user.team_bio || "",
                              image_url: user.team_image_url || "",
                              social_links: user.social_links || {
                                instagram: "",
                                linkedin: "",
                                github: "",
                                whatsapp: "",
                              },
                            });
                          }}
                          className={`p-3 rounded-lg cursor-pointer transition-colors ${selectedUserId === user.id ? "bg-blue-600/20 border border-blue-600/30" : "hover:bg-zinc-900"}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center">
                              <span className="text-xs font-bold">{user.full_name?.charAt(0)}</span>
                            </div>
                            <div>
                              <p className="text-sm font-medium">{user.full_name}</p>
                              <p className="text-xs text-zinc-500">{user.email}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {selectedUserId && (
                  <>
                    <input
                      placeholder="Posisi di Team *"
                      value={addToTeamForm.team_role}
                      onChange={(e) => setAddToTeamForm({ ...addToTeamForm, team_role: e.target.value })}
                      className="w-full bg-black border border-zinc-800 p-3 rounded-xl text-sm focus:border-blue-600 outline-none"
                    />

                    <textarea
                      placeholder="Bio/Deskripsi"
                      value={addToTeamForm.bio}
                      onChange={(e) => setAddToTeamForm({ ...addToTeamForm, bio: e.target.value })}
                      className="w-full bg-black border border-zinc-800 p-3 rounded-xl text-sm h-20 resize-none focus:border-blue-600 outline-none"
                    />

                    <div className="flex gap-3">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          placeholder="URL gambar profil"
                          value={addToTeamForm.image_url}
                          onChange={(e) => setAddToTeamForm({ ...addToTeamForm, image_url: e.target.value })}
                          className="w-full bg-black border border-zinc-800 p-3 rounded-xl text-sm focus:border-blue-600 outline-none"
                        />
                      </div>

                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(file, "addToTeam");
                          }}
                          disabled={uploadingImage}
                        />
                        <div className={`px-4 py-3 rounded-xl text-sm flex items-center gap-2 ${uploadingImage ? "bg-zinc-800 text-zinc-500" : "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"}`}>
                          {uploadingImage ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <>
                              <Upload size={16} />
                              <span>Upload</span>
                            </>
                          )}
                        </div>
                      </label>
                    </div>

                    <input
                      type="number"
                      placeholder="Urutan tampilan"
                      value={addToTeamForm.team_order_index}
                      onChange={(e) =>
                        setAddToTeamForm({
                          ...addToTeamForm,
                          team_order_index: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full bg-black border border-zinc-800 p-3 rounded-xl text-sm focus:border-blue-600 outline-none"
                      min="0"
                    />

                    <div className="flex gap-3 pt-4">
                      <button onClick={() => setShowAddToTeamForm(false)} className="flex-1 py-2.5 bg-zinc-800 rounded-xl text-sm font-black hover:bg-zinc-700 transition-colors">
                        Batal
                      </button>
                      <button onClick={handleAddToTeam} disabled={addingToTeam} className="flex-1 py-2.5 bg-blue-600 rounded-xl text-sm font-black hover:bg-blue-700 transition-colors disabled:opacity-50">
                        {addingToTeam ? <Loader2 className="animate-spin mx-auto" size={18} /> : "Tambah ke Team"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <DeleteConfirmationModal
            title="Hapus User"
            message="Apakah Anda yakin ingin menghapus user ini? Semua data termasuk orders dan topups akan dihapus permanen."
            onCancel={() => setDeleteConfirm(null)}
            onConfirm={() => handleDeleteUser(deleteConfirm)}
            confirmText="Hapus"
            confirmColor="red"
          />
        )}
      </AnimatePresence>

      {/* Remove from Team Confirmation Modal */}
      <AnimatePresence>
        {removeFromTeamConfirm && (
          <DeleteConfirmationModal
            title="Hapus dari Team"
            message="Hapus user ini dari daftar team? Data user tetap ada namun tidak akan ditampilkan di website."
            onCancel={() => setRemoveFromTeamConfirm(null)}
            onConfirm={() => handleRemoveFromTeam(removeFromTeamConfirm)}
            confirmText="Hapus dari Team"
            confirmColor="orange"
          />
        )}
      </AnimatePresence>

      {/* Add to Team Confirmation Modal */}
      <AnimatePresence>
        {addToTeamConfirm && (
          <DeleteConfirmationModal
            title="Tambah ke Team"
            message="Tambahkan user ini ke team website?"
            onCancel={() => setAddToTeamConfirm(null)}
            onConfirm={() => {
              // Logic untuk menambahkan ke team
              setAddToTeamConfirm(null);
            }}
            confirmText="Tambah ke Team"
            confirmColor="blue"
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Subcomponent: Team Member Card
const TeamMemberCard = ({
  member,
  currentAdminId,
  onEdit,
  onDelete,
  onRemoveFromTeam,
  onAddToTeam,
  onUpdateRole,
}: {
  member: any;
  currentAdminId: string;
  onEdit: () => void;
  onDelete: () => void;
  onRemoveFromTeam: () => void;
  onAddToTeam?: () => void;
  onUpdateRole: (role: string) => void;
}) => {
  const isCurrentUser = member.id === currentAdminId;

  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="p-4 md:p-6 hover:bg-zinc-900/30 transition-colors group">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="relative">
          {member.team_image_url ? (
            <img
              src={member.team_image_url}
              alt={member.full_name}
              className="w-16 h-16 rounded-full object-cover flex-shrink-0"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.full_name)}&background=dc2626&color=fff&size=128`;
              }}
            />
          ) : (
            <div className="w-16 h-16 bg-gradient-to-br from-red-600 to-red-700 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-2xl font-black text-white">{member.full_name?.charAt(0) || "A"}</span>
            </div>
          )}

          {/* Badges */}
          <div className="absolute -bottom-2 -right-2 flex gap-1">
            {member.role === "admin" && (
              <div className="bg-yellow-600/20 p-1 rounded-full" title=" Admin">
                <Crown size={12} className="text-yellow-500" />
              </div>
            )}
            {member.is_team_member && (
              <div className="bg-green-600/20 p-1 rounded-full" title="In Team">
                <CheckCircle2 size={12} className="text-green-500" />
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-black text-lg truncate">{member.full_name || "No Name"}</h4>
                {isCurrentUser && <span className="text-xs bg-red-600/20 text-red-500 px-2 py-0.5 rounded">Anda</span>}
              </div>

              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={`px-2 py-0.5 text-xs rounded ${member.role === "_admin" ? "bg-yellow-600/20 text-yellow-500" : member.role === "admin" ? "bg-red-600/20 text-red-500" : "bg-zinc-600/20 text-zinc-500"}`}>
                  {member.role?.toUpperCase()}
                </span>

                {member.team_role && <span className="px-2 py-0.5 text-xs bg-blue-600/20 text-blue-500 rounded">{member.team_role}</span>}

                {member.team_order_index !== null && <span className="px-2 py-0.5 text-xs bg-zinc-600/20 text-zinc-500 rounded">Urutan: {member.team_order_index}</span>}
              </div>

              {/* Contact Info */}
              <div className="space-y-1 text-sm text-zinc-500">
                <div className="flex items-center gap-2 truncate">
                  <Mail size={12} />
                  <span className="truncate">{member.email}</span>
                </div>
                {member.phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={12} />
                    <span className="truncate">{member.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar size={12} />
                  <span className="text-xs">Bergabung: {new Date(member.created_at).toLocaleDateString("id-ID")}</span>
                </div>
              </div>

              {/* Bio */}
              {member.team_bio && <p className="text-sm text-zinc-400 mt-2 line-clamp-2">{member.team_bio}</p>}

              {/* Social Links */}
              {member.social_links && Object.values(member.social_links).some(Boolean) && (
                <div className="flex gap-3 mt-3">
                  {member.social_links.instagram && (
                    <a href={member.social_links.instagram} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-pink-500 transition-colors" title="Instagram">
                      <Instagram size={14} />
                    </a>
                  )}
                  {member.social_links.linkedin && (
                    <a href={member.social_links.linkedin} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-blue-500 transition-colors" title="LinkedIn">
                      <Linkedin size={14} />
                    </a>
                  )}
                  {member.social_links.github && (
                    <a href={member.social_links.github} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-gray-300 transition-colors" title="GitHub">
                      <Github size={14} />
                    </a>
                  )}
                  {member.social_links.whatsapp && (
                    <a href={`https://wa.me/${member.social_links.whatsapp}`} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-green-500 transition-colors" title="WhatsApp">
                      <MessageCircle size={14} />
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex gap-2">
                <button onClick={onEdit} className="p-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors" title="Edit">
                  <Edit size={14} />
                </button>

                {!isCurrentUser && (
                  <>
                    {member.is_team_member ? (
                      <button onClick={onRemoveFromTeam} className="p-2 bg-orange-600/20 rounded-lg hover:bg-orange-600/30 transition-colors" title="Remove from Team">
                        <X size={14} className="text-orange-500" />
                      </button>
                    ) : onAddToTeam ? (
                      <button onClick={onAddToTeam} className="p-2 bg-blue-600/20 rounded-lg hover:bg-blue-600/30 transition-colors" title="Add to Team">
                        <UserPlus size={14} className="text-blue-500" />
                      </button>
                    ) : null}

                    <button onClick={onDelete} className="p-2 bg-red-600/20 rounded-lg hover:bg-red-600/30 transition-colors" title="Delete User">
                      <Trash2 size={14} className="text-red-500" />
                    </button>
                  </>
                )}
              </div>

              {/* Role Selector */}
              {!isCurrentUser && (
                <select
                  value={member.role}
                  onChange={(e) => onUpdateRole(e.target.value)}
                  className={`mt-2 sm:mt-0 px-2 py-1 rounded-lg text-xs font-black uppercase ${
                    member.role === "admin"
                      ? "bg-yellow-600/20 text-yellow-500 border border-yellow-600/30"
                      : member.role === "admin"
                        ? "bg-red-600/20 text-red-500 border border-red-600/30"
                        : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                  }`}
                >
                  <option value="admin">Admin</option>
                </select>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Subcomponent: Confirmation Modal
const DeleteConfirmationModal = ({
  title,
  message,
  onCancel,
  onConfirm,
  confirmText = "Konfirmasi",
  confirmColor = "red",
}: {
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmText?: string;
  confirmColor?: "red" | "orange" | "blue";
}) => {
  const colorClasses = {
    red: "bg-red-600 hover:bg-red-700",
    orange: "bg-orange-600 hover:bg-orange-700",
    blue: "bg-blue-600 hover:bg-blue-700",
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onCancel}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-[#0c0c0c] border border-zinc-900 rounded-2xl p-6 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={24} className="text-red-600" />
          </div>
          <h3 className="text-lg font-black mb-2">{title}</h3>
          <p className="text-zinc-400 text-sm mb-6">{message}</p>
          <div className="flex gap-3">
            <button onClick={onCancel} className="flex-1 py-2.5 bg-zinc-800 rounded-xl text-sm font-black hover:bg-zinc-700 transition-colors">
              Batal
            </button>
            <button onClick={onConfirm} className={`flex-1 py-2.5 rounded-xl text-sm font-black transition-colors ${colorClasses[confirmColor]}`}>
              {confirmText}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
