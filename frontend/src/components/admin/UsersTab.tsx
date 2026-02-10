"use client";
import { useState, useMemo } from "react";
import { 
  Search, Mail, Phone, Calendar, Trash2, 
  DollarSign, Edit, Save, X, User, CreditCard 
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

interface UsersTabProps {
  users: any[];
  searchUser: string;
  setSearchUser: (search: string) => void;
  currentAdmin: any;
  onRefresh: () => void;
}

export default function UsersTab({
  users,
  searchUser,
  setSearchUser,
  currentAdmin,
  onRefresh,
}: UsersTabProps) {
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    balance: 0,
    role: "client",
    is_team_member: false,
    team_role: "",
  });
  const [savingUser, setSavingUser] = useState<string | null>(null);

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus pengguna ini? Aksi ini tidak dapat dibatalkan.")) return;
    
    setDeletingUser(userId);
    try {
      // Delete related data first
      await supabase.from("topups").delete().eq("user_id", userId);
      await supabase.from("orders").delete().eq("user_id", userId);
      await supabase.from("chats").delete().eq("user_id", userId);
      await supabase.from("user_profiles").delete().eq("id", userId);
      onRefresh();
    } catch (e: any) {
      console.error("Delete user error:", e);
      alert("Gagal menghapus user: " + e.message);
    } finally {
      setDeletingUser(null);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      await supabase
        .from("user_profiles")
        .update({
          role: newRole,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);
      onRefresh();
    } catch (e: any) {
      console.error("Update role error:", e);
      alert("Gagal update role: " + e.message);
    }
  };

  const handleEditUser = (user: any) => {
    setEditingUser(user.id);
    setEditForm({
      full_name: user.full_name || "",
      email: user.email || "",
      phone: user.phone || "",
      balance: user.balance || 0,
      role: user.role || "client",
      is_team_member: user.is_team_member || false,
      team_role: user.team_role || "",
    });
  };

  const handleSaveUser = async (userId: string) => {
    setSavingUser(userId);
    try {
      await supabase
        .from("user_profiles")
        .update({
          full_name: editForm.full_name,
          email: editForm.email,
          phone: editForm.phone || null,
          balance: editForm.balance,
          role: editForm.role,
          is_team_member: editForm.is_team_member,
          team_role: editForm.is_team_member ? editForm.team_role : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);
      
      setEditingUser(null);
      onRefresh();
    } catch (e: any) {
      console.error("Save user error:", e);
      alert("Gagal menyimpan perubahan: " + e.message);
    } finally {
      setSavingUser(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setEditForm({
      full_name: "",
      email: "",
      phone: "",
      balance: 0,
      role: "client",
      is_team_member: false,
      team_role: "",
    });
  };

  const handleUpdateBalance = async (userId: string, change: number) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    const newBalance = Math.max(0, (user.balance || 0) + change);
    
    if (newBalance === user.balance) return;

    try {
      await supabase
        .from("user_profiles")
        .update({
          balance: newBalance,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);
      onRefresh();
    } catch (e: any) {
      console.error("Update balance error:", e);
      alert("Gagal update balance: " + e.message);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
        <input
          type="text"
          value={searchUser}
          onChange={(e) => setSearchUser(e.target.value)}
          placeholder="Search users by name, email, or phone..."
          className="w-full bg-[#0c0c0c] border border-zinc-900 p-4 pl-12 rounded-xl outline-none focus:border-red-600 text-white"
        />
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {users.map((user) => (
          <motion.div
            key={user.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="bg-[#0c0c0c] border border-zinc-900 rounded-2xl p-4 hover:border-red-600/30 transition-all group relative"
          >
            {/* Edit Overlay */}
            <AnimatePresence>
              {editingUser === user.id && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/80 backdrop-blur-sm rounded-2xl z-10 p-4"
                >
                  <div className="space-y-3">
                    <h3 className="text-sm font-black uppercase text-white mb-2">Edit User</h3>
                    
                    <input
                      type="text"
                      value={editForm.full_name}
                      onChange={(e) => setEditForm({...editForm, full_name: e.target.value})}
                      placeholder="Full Name"
                      className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded-lg text-sm text-white"
                    />
                    
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                      placeholder="Email"
                      className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded-lg text-sm text-white"
                    />
                    
                    <input
                      type="tel"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                      placeholder="Phone"
                      className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded-lg text-sm text-white"
                    />
                    
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        value={editForm.balance}
                        onChange={(e) => setEditForm({...editForm, balance: parseInt(e.target.value) || 0})}
                        placeholder="Balance"
                        className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded-lg text-sm text-white"
                      />
                      
                      <select
                        value={editForm.role}
                        onChange={(e) => setEditForm({...editForm, role: e.target.value})}
                        className="bg-zinc-900 border border-zinc-800 p-2 rounded-lg text-sm text-white"
                      >
                        <option value="client">Client</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editForm.is_team_member}
                        onChange={(e) => setEditForm({...editForm, is_team_member: e.target.checked})}
                        className="w-4 h-4"
                      />
                      <span className="text-xs text-zinc-400">Team Member</span>
                    </div>

                    {editForm.is_team_member && (
                      <input
                        type="text"
                        value={editForm.team_role}
                        onChange={(e) => setEditForm({...editForm, team_role: e.target.value})}
                        placeholder="Team Role"
                        className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded-lg text-sm text-white"
                      />
                    )}

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => handleSaveUser(user.id)}
                        disabled={savingUser === user.id}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
                      >
                        {savingUser === user.id ? (
                          "Saving..."
                        ) : (
                          <>
                            <Save size={14} />
                            Save
                          </>
                        )}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-3 py-2 bg-zinc-800 text-zinc-400 rounded-lg text-sm font-semibold"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* User Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-full flex items-center justify-center">
                  <span className="text-lg font-black">
                    {user.full_name?.charAt(0) || "U"}
                  </span>
                </div>
                <div>
                  <select
                    value={user.role}
                    onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                    className={`px-2 py-1 rounded-lg text-xs font-black uppercase ${
                      user.role === "admin"
                        ? "bg-red-600/20 text-red-500 border border-red-600/30"
                        : user.role === "super_admin"
                        ? "bg-purple-600/20 text-purple-500 border border-purple-600/30"
                        : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                    }`}
                  >
                    <option value="client">Client</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <button
                onClick={() => handleEditUser(user)}
                className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-red-600 hover:text-red-500 transition-all"
              >
                <Edit size={14} />
              </button>
            </div>

            {/* User Name */}
            <h3 className="text-base font-black uppercase tracking-tighter mb-2 truncate">
              {user.full_name || "No Name"}
            </h3>

            {/* Balance Section */}
            <div className="mb-3 p-3 bg-zinc-900/50 rounded-xl border border-zinc-800">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <CreditCard size={12} className="text-green-500" />
                  <span className="text-xs text-zinc-500">Balance</span>
                </div>
                <span className="text-lg font-black text-green-500">
                  Rp {user.balance?.toLocaleString() || 0}
                </span>
              </div>
              
              {/* Quick Balance Controls */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleUpdateBalance(user.id, 10000)}
                  className="px-2 py-1 bg-green-600/20 text-green-500 text-xs rounded-lg hover:bg-green-600/30 transition-colors"
                >
                  +10K
                </button>
                <button
                  onClick={() => handleUpdateBalance(user.id, 50000)}
                  className="px-2 py-1 bg-green-600/20 text-green-500 text-xs rounded-lg hover:bg-green-600/30 transition-colors"
                >
                  +50K
                </button>
                <button
                  onClick={() => handleUpdateBalance(user.id, 100000)}
                  className="px-2 py-1 bg-green-600/20 text-green-500 text-xs rounded-lg hover:bg-green-600/30 transition-colors"
                >
                  +100K
                </button>
                <button
                  onClick={() => {
                    const amount = prompt("Enter amount to add (Rp):", "10000");
                    if (amount) {
                      handleUpdateBalance(user.id, parseInt(amount) || 0);
                    }
                  }}
                  className="px-2 py-1 bg-blue-600/20 text-blue-500 text-xs rounded-lg hover:bg-blue-600/30 transition-colors"
                >
                  Custom
                </button>
              </div>

              {/* Subtract Balance */}
              <div className="mt-2">
                <button
                  onClick={() => {
                    const amount = prompt("Enter amount to subtract (Rp):", "10000");
                    if (amount) {
                      handleUpdateBalance(user.id, -parseInt(amount) || 0);
                    }
                  }}
                  className="w-full px-2 py-1 bg-red-600/20 text-red-500 text-xs rounded-lg hover:bg-red-600/30 transition-colors"
                >
                  Subtract Balance
                </button>
              </div>
            </div>

            {/* User Info */}
            <div className="space-y-2 text-sm text-zinc-500">
              <div className="flex items-center gap-2 truncate">
                <Mail size={12} />
                <span className="truncate">{user.email}</span>
              </div>
              {user.phone && (
                <div className="flex items-center gap-2">
                  <Phone size={12} />
                  <span className="truncate">{user.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar size={12} />
                <span className="text-xs">
                  {new Date(user.created_at).toLocaleDateString("id-ID")}
                </span>
              </div>
              
              {/* Additional Info */}
              {user.is_team_member && (
                <div className="flex items-center gap-2 mt-2">
                  <User size={12} className="text-blue-500" />
                  <span className="text-xs text-blue-500 font-semibold">
                    Team: {user.team_role || "Member"}
                  </span>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
              <div className="bg-zinc-900/50 p-2 rounded-lg text-center">
                <div className="text-zinc-400">Orders</div>
                <div className="font-bold text-white">0</div>
              </div>
              <div className="bg-zinc-900/50 p-2 rounded-lg text-center">
                <div className="text-zinc-400">Topups</div>
                <div className="font-bold text-white">0</div>
              </div>
            </div>

            {/* Delete Button */}
            <button
              onClick={() => handleDeleteUser(user.id)}
              disabled={user.id === currentAdmin?.id || deletingUser === user.id}
              className="mt-4 w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-xl hover:border-red-600 hover:text-red-500 transition-all flex items-center justify-center gap-2 text-xs font-black uppercase disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Trash2 size={14} />
              {deletingUser === user.id 
                ? "Deleting..." 
                : user.id === currentAdmin?.id 
                ? "Cannot Delete Self" 
                : "Delete User"
              }
            </button>
          </motion.div>
        ))}
      </div>

      {users.length === 0 && (
        <div className="py-12 text-center opacity-20">
          <div className="text-4xl mb-4">👥</div>
          <p className="font-mono text-xs uppercase tracking-widest">No Users Found</p>
        </div>
      )}

      {/* Summary Stats */}
      <div className="bg-[#0c0c0c] border border-zinc-900 rounded-2xl p-4">
        <h3 className="text-sm font-black uppercase mb-3">User Statistics</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3 bg-zinc-900/50 rounded-xl">
            <div className="text-xs text-zinc-500">Total Users</div>
            <div className="text-xl font-black">{users.length}</div>
          </div>
          <div className="p-3 bg-zinc-900/50 rounded-xl">
            <div className="text-xs text-zinc-500">Admins</div>
            <div className="text-xl font-black text-red-500">
              {users.filter(u => u.role === "admin" || u.role === "super_admin").length}
            </div>
          </div>
          <div className="p-3 bg-zinc-900/50 rounded-xl">
            <div className="text-xs text-zinc-500">Team Members</div>
            <div className="text-xl font-black text-blue-500">
              {users.filter(u => u.is_team_member).length}
            </div>
          </div>
          <div className="p-3 bg-zinc-900/50 rounded-xl">
            <div className="text-xs text-zinc-500">Total Balance</div>
            <div className="text-xl font-black text-green-500">
              Rp {users.reduce((sum, u) => sum + (u.balance || 0), 0).toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}