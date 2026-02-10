"use client";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  FileText,
  Star,
  Plus,
  Loader2,
  Search,
  Filter,
  Image as ImageIcon,
  Trash2,
  Edit,
  CheckCircle2,
  X,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Upload,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

interface TestimonialsTabProps {
  testimonials: any[];
  onRefresh: () => void;
}

export default function TestimonialsTab({ testimonials: initialTestimonials, onRefresh }: TestimonialsTabProps) {
  // State untuk data testimonials (akan diupdate secara realtime)
  const [testimonials, setTestimonials] = useState<any[]>(initialTestimonials);
  
  // State untuk form
  const [testimonialForm, setTestimonialForm] = useState({
    id: "",
    name: "",
    role: "",
    company: "",
    content: "",
    rating: 5,
    image_url: "",
    is_active: true,
  });
  
  const [editingTestimonial, setEditingTestimonial] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const itemsPerPage = 6;
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Setup realtime subscription untuk testimonials
  useEffect(() => {
    console.log("🔔 Setting up realtime subscription for testimonials...");
    
    const channel = supabase
      .channel('realtime-testimonials-tab')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'testimonials',
        },
        (payload) => {
          console.log('🎯 Real-time testimonial update received:', payload);
          
          setTestimonials((prev) => {
            let newTestimonials = [...prev];
            
            switch (payload.eventType) {
              case 'INSERT':
                // Tambah testimonial baru di urutan paling atas
                newTestimonials = [payload.new, ...prev];
                break;
                
              case 'UPDATE':
                // Update testimonial yang ada
                newTestimonials = prev.map((item) => 
                  item.id === payload.new.id ? payload.new : item
                );
                
                // Jika sedang edit testimonial yang diupdate, update juga form
                if (editingTestimonial && payload.new.id === editingTestimonial.id) {
                  setTestimonialForm({
                    id: payload.new.id,
                    name: payload.new.name || "",
                    role: payload.new.role || "",
                    company: payload.new.company || "",
                    content: payload.new.content || "",
                    rating: payload.new.rating || 5,
                    image_url: payload.new.image_url || "",
                    is_active: payload.new.is_active || true,
                  });
                }
                break;
                
              case 'DELETE':
                // Hapus testimonial
                newTestimonials = prev.filter((item) => item.id !== payload.old.id);
                
                // Jika testimonial yang dihapus sedang diedit, reset form
                if (editingTestimonial && editingTestimonial.id === payload.old.id) {
                  resetForm();
                }
                break;
            }
            
            return newTestimonials;
          });
        }
      )
      .subscribe((status) => {
        console.log('📡 Testimonials realtime subscription status:', status);
      });
    
    // Cleanup subscription
    return () => {
      console.log("🧹 Cleaning up testimonials realtime subscription");
      supabase.removeChannel(channel);
    };
  }, [editingTestimonial]);
  
  // Sync dengan data parent ketika berubah
  useEffect(() => {
    setTestimonials(initialTestimonials);
  }, [initialTestimonials]);

  // Filter testimonials
  const filteredTestimonials = useMemo(() => {
    return testimonials.filter(testimonial => {
      if (statusFilter !== "all") {
        const shouldBeActive = statusFilter === "active";
        if (testimonial.is_active !== shouldBeActive) return false;
      }
      
      if (ratingFilter !== "all") {
        const minRating = parseInt(ratingFilter);
        if (testimonial.rating < minRating) return false;
      }
      
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          testimonial.name.toLowerCase().includes(searchLower) ||
          (testimonial.role?.toLowerCase() || "").includes(searchLower) ||
          (testimonial.company?.toLowerCase() || "").includes(searchLower) ||
          testimonial.content.toLowerCase().includes(searchLower)
        );
      }
      
      return true;
    });
  }, [testimonials, statusFilter, ratingFilter, searchTerm]);
  
  // Pagination
  const totalPages = Math.ceil(filteredTestimonials.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTestimonials = filteredTestimonials.slice(startIndex, endIndex);
  
  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, ratingFilter, searchTerm]);
  
  // Handle manual refresh
  const handleManualRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
      // Tambahkan feedback visual
      setTimeout(() => setIsRefreshing(false), 1000);
    } catch (error) {
      console.error("Refresh error:", error);
      setIsRefreshing(false);
    }
  }, [onRefresh]);
  
  // Handle image selection
  const handleImageSelect = (file: File | null) => {
    if (!file) {
      setSelectedImageFile(null);
      setImagePreview("");
      setTestimonialForm({ ...testimonialForm, image_url: "" });
      return;
    }
    
    // Validasi tipe file
    if (!file.type.startsWith('image/')) {
      alert("Hanya file gambar yang diperbolehkan (JPG, PNG, GIF, dll)");
      return;
    }
    
    // Validasi ukuran file (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Ukuran file maksimal 5MB");
      return;
    }
    
    // Set file untuk nanti diupload saat save
    setSelectedImageFile(file);
    
    // Buat preview lokal
    const reader = new FileReader();
    reader.onloadend = () => {
      const previewUrl = reader.result as string;
      setImagePreview(previewUrl);
      setTestimonialForm({ ...testimonialForm, image_url: previewUrl });
    };
    reader.readAsDataURL(file);
  };
  
  // Upload gambar ke storage
  const uploadImageToStorage = async (file: File): Promise<string> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `${fileName}`;
      
      console.log("Uploading image to storage...");
      
      // Upload ke storage
      const { error: uploadError } = await supabase.storage
        .from('testimonial-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (uploadError) {
        console.error("Upload error:", uploadError);
        
        // Jika bucket tidak ada, gunakan base64 sebagai fallback
        if (uploadError.message?.includes("bucket") || uploadError.message?.includes("not found")) {
          console.warn("Bucket not found, using base64 as fallback");
          const reader = new FileReader();
          return new Promise((resolve) => {
            reader.onloadend = () => {
              resolve(reader.result as string);
            };
            reader.readAsDataURL(file);
          });
        }
        
        throw uploadError;
      }
      
      // Dapatkan URL public
      const { data: { publicUrl } } = supabase.storage
        .from('testimonial-images')
        .getPublicUrl(filePath);
      
      console.log("Image uploaded successfully:", publicUrl);
      return publicUrl;
      
    } catch (error: any) {
      console.error("Image upload error:", error);
      
      // Fallback ke base64 jika upload gagal
      const reader = new FileReader();
      return new Promise((resolve) => {
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.readAsDataURL(file);
      });
    }
  };
  
  // Handle save testimonial
  const handleSaveTestimonial = async () => {
    if (!testimonialForm.name.trim() || !testimonialForm.content.trim()) {
      alert("Nama dan testimoni harus diisi!");
      return;
    }
    
    setLoading(true);
    try {
      let finalImageUrl = testimonialForm.image_url;
      
      // 1. Upload gambar JIKA ada file baru yang dipilih
      if (selectedImageFile) {
        setUploadingImage(true);
        try {
          finalImageUrl = await uploadImageToStorage(selectedImageFile);
          console.log("Image uploaded, URL:", finalImageUrl);
        } catch (uploadError) {
          console.error("Failed to upload image:", uploadError);
          // Lanjut tanpa gambar
        } finally {
          setUploadingImage(false);
        }
      }
      
      // 2. Simpan testimonial ke database
      const testimonialData = {
        name: testimonialForm.name.trim(),
        role: testimonialForm.role.trim(),
        company: testimonialForm.company.trim(),
        content: testimonialForm.content.trim(),
        rating: testimonialForm.rating,
        image_url: finalImageUrl.trim(),
        is_active: testimonialForm.is_active,
        updated_at: new Date().toISOString(),
      };
      
      if (editingTestimonial) {
        // UPDATE - realtime subscription akan menangani update UI
        const { error } = await supabase
          .from("testimonials")
          .update(testimonialData)
          .eq("id", testimonialForm.id);
        
        if (error) throw error;
        
        // Tidak perlu panggil onRefresh() karena realtime akan update otomatis
        alert("Testimoni berhasil diperbarui!");
      } else {
        // INSERT BARU - realtime subscription akan menangani insert UI
        const { error } = await supabase
          .from("testimonials")
          .insert({
            ...testimonialData,
            created_at: new Date().toISOString(),
          });
        
        if (error) throw error;
        
        // Tidak perlu panggil onRefresh() karena realtime akan update otomatis
        alert("Testimoni berhasil ditambahkan!");
      }
      
      // 3. Reset form dan state
      resetForm();
      
    } catch (error: any) {
      console.error("Save testimonial error:", error);
      alert("Gagal menyimpan testimoni: " + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteTestimonial = async (id: string) => {
    try {
      // DELETE - realtime subscription akan menangani delete UI
      const { error } = await supabase
        .from("testimonials")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      
      setDeleteConfirm(null);
      // Tidak perlu panggil onRefresh() karena realtime akan update otomatis
      
    } catch (error: any) {
      console.error("Delete testimonial error:", error);
      alert("Gagal menghapus testimoni: " + error.message);
    }
  };
  
  const handleToggleActive = async (testimonial: any) => {
    // OPTIMISTIC UPDATE: Langsung update UI tanpa menunggu response
    const newStatus = !testimonial.is_active;
    
    // Update UI langsung
    setTestimonials(prev =>
      prev.map(item =>
        item.id === testimonial.id
          ? { ...item, is_active: newStatus, updated_at: new Date().toISOString() }
          : item
      )
    );
    
    // Juga update form jika sedang diedit
    if (editingTestimonial && editingTestimonial.id === testimonial.id) {
      setTestimonialForm(prev => ({ ...prev, is_active: newStatus }));
    }
    
    try {
      // Kirim update ke database di background
      const { error } = await supabase
        .from("testimonials")
        .update({
          is_active: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", testimonial.id);
      
      if (error) {
        // Jika error, rollback ke state sebelumnya
        console.error("Toggle active error:", error);
        setTestimonials(prev =>
          prev.map(item =>
            item.id === testimonial.id
              ? { ...item, is_active: testimonial.is_active } // Kembalikan ke state lama
              : item
          )
        );
        alert("Gagal mengubah status: " + error.message);
      }
      // Jika sukses, realtime subscription akan menerima update dan memperbarui UI
      // Tapi UI sudah diupdate secara optimistic
      
    } catch (error: any) {
      console.error("Toggle active error:", error);
      // Rollback jika ada error
      setTestimonials(prev =>
        prev.map(item =>
          item.id === testimonial.id
            ? { ...item, is_active: testimonial.is_active }
            : item
        )
      );
      alert("Gagal mengubah status: " + error.message);
    }
  };
  
  // Reset form
  const resetForm = () => {
    setTestimonialForm({
      id: "",
      name: "",
      role: "",
      company: "",
      content: "",
      rating: 5,
      image_url: "",
      is_active: true,
    });
    setSelectedImageFile(null);
    setImagePreview("");
    setEditingTestimonial(null);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  
  // Handle cancel edit
  const handleCancelEdit = () => {
    resetForm();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="grid grid-cols-1 lg:grid-cols-12 gap-6"
    >
      {/* Form Section */}
      <div className="lg:col-span-4">
        <div className="bg-[#0c0c0c] p-6 rounded-3xl border border-zinc-900 sticky top-24">
          <div className="flex items-center justify-between mb-6 border-b border-zinc-900 pb-4">
            <div className="flex items-center gap-3">
              <FileText size={18} className="text-red-600" />
              <h2 className="text-sm font-black uppercase tracking-wider">
                {editingTestimonial ? "Edit Testimoni" : "Tambah Testimoni"}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
                title="Refresh data"
              >
                <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
              </button>
              {editingTestimonial && (
                <button
                  onClick={handleCancelEdit}
                  className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
          
          <div className="space-y-4">
            <input
              placeholder="Nama Klien *"
              value={testimonialForm.name}
              onChange={(e) => setTestimonialForm({ ...testimonialForm, name: e.target.value })}
              className="w-full bg-black border border-zinc-800 p-3 rounded-xl text-sm focus:border-red-600 outline-none"
            />
            
            <div className="grid grid-cols-2 gap-3">
              <input
                placeholder="Posisi/Role"
                value={testimonialForm.role}
                onChange={(e) => setTestimonialForm({ ...testimonialForm, role: e.target.value })}
                className="w-full bg-black border border-zinc-800 p-3 rounded-xl text-sm focus:border-red-600 outline-none"
              />
              
              <input
                placeholder="Perusahaan"
                value={testimonialForm.company}
                onChange={(e) => setTestimonialForm({ ...testimonialForm, company: e.target.value })}
                className="w-full bg-black border border-zinc-800 p-3 rounded-xl text-sm focus:border-red-600 outline-none"
              />
            </div>
            
            <textarea
              placeholder="Testimoni *"
              value={testimonialForm.content}
              onChange={(e) => setTestimonialForm({ ...testimonialForm, content: e.target.value })}
              className="w-full bg-black border border-zinc-800 p-3 rounded-xl text-sm h-32 resize-none focus:border-red-600 outline-none"
              rows={4}
            />
            
            {/* Rating */}
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">Rating</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setTestimonialForm({ ...testimonialForm, rating: star })}
                    className={`text-2xl transition-transform hover:scale-110 ${
                      star <= testimonialForm.rating ? "text-yellow-500" : "text-zinc-700"
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
            
            {/* Image Upload */}
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">Foto Klien (Opsional)</label>
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="block text-xs text-zinc-500">Pilih file dari komputer:</label>
                  <div className="flex gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        handleImageSelect(file);
                      }}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Upload size={14} />
                      Pilih File
                    </button>
                    
                    {selectedImageFile && (
                      <button
                        onClick={() => handleImageSelect(null)}
                        className="px-3 py-2 bg-red-600/20 border border-red-600/30 rounded-lg text-sm hover:bg-red-600/30 transition-colors"
                        type="button"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  
                  {selectedImageFile && (
                    <div className="text-xs text-zinc-400">
                      File terpilih: <span className="text-zinc-300">{selectedImageFile.name}</span>
                      <br />
                      Ukuran: {(selectedImageFile.size / 1024).toFixed(1)} KB
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <label className="block text-xs text-zinc-500">Atau masukkan URL gambar:</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="https://example.com/image.jpg"
                      value={testimonialForm.image_url && !imagePreview ? testimonialForm.image_url : ""}
                      onChange={(e) => {
                        setTestimonialForm({ ...testimonialForm, image_url: e.target.value });
                        setSelectedImageFile(null);
                        setImagePreview("");
                      }}
                      className="w-full bg-black border border-zinc-800 p-3 rounded-xl text-sm pl-10 focus:border-red-600 outline-none"
                    />
                    <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Image Preview */}
            {(imagePreview || (testimonialForm.image_url && !selectedImageFile)) && (
              <div className="mt-2">
                <div className="text-xs text-zinc-500 mb-2">Preview:</div>
                <div className="relative w-full max-w-[200px] aspect-square rounded-lg overflow-hidden border border-zinc-800 group">
                  <img
                    src={imagePreview || testimonialForm.image_url}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(testimonialForm.name)}&background=dc2626&color=fff&size=400`;
                    }}
                  />
                  <button
                    onClick={() => {
                      setTestimonialForm({ ...testimonialForm, image_url: "" });
                      setSelectedImageFile(null);
                      setImagePreview("");
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}
                    className="absolute inset-0 bg-black/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={20} className="text-white" />
                  </button>
                </div>
                <p className="text-xs text-zinc-600 mt-1">
                  {selectedImageFile 
                    ? "Gambar akan diupload saat disimpan" 
                    : "URL gambar eksternal"}
                </p>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={testimonialForm.is_active}
                onChange={(e) => setTestimonialForm({ ...testimonialForm, is_active: e.target.checked })}
                className="w-4 h-4 accent-red-600"
              />
              <label htmlFor="is_active" className="text-sm text-zinc-400">
                Tampilkan di website
              </label>
            </div>
            
            <div className="flex gap-2 pt-4">
              <button
                onClick={handleSaveTestimonial}
                disabled={loading || uploadingImage}
                className="flex-1 py-3 bg-red-600 rounded-xl font-black hover:bg-red-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="animate-spin mx-auto" size={20} />
                ) : uploadingImage ? (
                  <>
                    <Loader2 className="animate-spin inline mr-2" size={16} />
                    Mengupload gambar...
                  </>
                ) : editingTestimonial ? (
                  "Update Testimoni"
                ) : (
                  <>
                    <Plus size={18} className="inline mr-2" />
                    Tambah Testimoni
                  </>
                )}
              </button>
            </div>
            
            {/* Real-time Indicator */}
            <div className="pt-4 border-t border-zinc-900">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-green-500 font-mono">REAL-TIME</span>
                </div>
                <span className="text-zinc-600">
                  {testimonials.length} testimoni
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Testimonials List */}
      <div className="lg:col-span-8">
        <div className="bg-[#0c0c0c] rounded-3xl border border-zinc-900 overflow-hidden">
          {/* Header with Filters */}
          <div className="p-4 md:p-6 border-b border-zinc-900">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="text-lg font-black">Daftar Testimoni</h3>
                <p className="text-sm text-zinc-500">
                  {filteredTestimonials.length} testimoni ditemukan
                  {testimonials.length !== initialTestimonials.length && (
                    <span className="ml-2 text-green-500">
                      • {testimonials.length - initialTestimonials.length > 0 ? '+' : ''}{testimonials.length - initialTestimonials.length} realtime
                    </span>
                  )}
                </p>
              </div>
              
              <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:flex-initial">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                  <input
                    type="text"
                    placeholder="Search testimonials..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-black border border-zinc-800 rounded-lg text-sm w-full md:w-64 focus:border-red-600 outline-none"
                  />
                </div>
                
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-black border border-zinc-800 px-3 py-2 rounded-lg text-sm focus:border-red-600 outline-none"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>
                
                <select
                  value={ratingFilter}
                  onChange={(e) => setRatingFilter(e.target.value)}
                  className="bg-black border border-zinc-800 px-3 py-2 rounded-lg text-sm focus:border-red-600 outline-none"
                >
                  <option value="all">All Ratings</option>
                  <option value="5">5 Stars</option>
                  <option value="4">4+ Stars</option>
                  <option value="3">3+ Stars</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Testimonials Grid */}
          {paginatedTestimonials.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 md:p-6">
                <AnimatePresence>
                  {paginatedTestimonials.map((testimonial) => (
                    <TestimonialCard
                      key={testimonial.id}
                      testimonial={testimonial}
                      onEdit={() => {
                        setTestimonialForm({
                          id: testimonial.id,
                          name: testimonial.name || "",
                          role: testimonial.role || "",
                          company: testimonial.company || "",
                          content: testimonial.content || "",
                          rating: testimonial.rating || 5,
                          image_url: testimonial.image_url || "",
                          is_active: testimonial.is_active || true,
                        });
                        setSelectedImageFile(null);
                        setImagePreview("");
                        setEditingTestimonial(testimonial);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      onDelete={() => setDeleteConfirm(testimonial.id)}
                      onToggleActive={() => handleToggleActive(testimonial)}
                    />
                  ))}
                </AnimatePresence>
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="p-4 border-t border-zinc-900 flex items-center justify-between">
                  <div className="text-sm text-zinc-500">
                    Showing {startIndex + 1}-{Math.min(endIndex, filteredTestimonials.length)} of {filteredTestimonials.length}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-800"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    
                    <span className="text-sm font-mono px-3">
                      {currentPage} / {totalPages}
                    </span>
                    
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
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
              <FileText size={48} className="text-zinc-700 mx-auto mb-4" />
              <p className="text-zinc-600 text-sm">No testimonials found</p>
              {(searchTerm || statusFilter !== "all" || ratingFilter !== "all") && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                    setRatingFilter("all");
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
      
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0c0c0c] border border-red-600/30 rounded-2xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={24} className="text-red-600" />
                </div>
                <h3 className="text-lg font-black mb-2">Hapus Testimoni</h3>
                <p className="text-zinc-400 text-sm mb-6">
                  Apakah Anda yakin ingin menghapus testimoni ini? Tindakan ini tidak dapat dibatalkan.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 py-2.5 bg-zinc-800 rounded-xl text-sm font-black hover:bg-zinc-700 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    onClick={() => handleDeleteTestimonial(deleteConfirm)}
                    className="flex-1 py-2.5 bg-red-600 rounded-xl text-sm font-black hover:bg-red-700 transition-colors"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Subcomponent: Testimonial Card
const TestimonialCard = ({
  testimonial,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  testimonial: any;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 hover:border-red-600/30 transition-colors group"
    >
      <div className="flex items-start gap-4 mb-4">
        {/* Avatar */}
        <div className="relative">
          {testimonial.image_url ? (
            <img
              src={testimonial.image_url}
              alt={testimonial.name}
              className="w-16 h-16 rounded-full object-cover flex-shrink-0"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(testimonial.name)}&background=dc2626&color=fff&size=128`;
              }}
            />
          ) : (
            <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-2xl font-black">{testimonial.name.charAt(0)}</span>
            </div>
          )}
          <div className="absolute -bottom-1 -right-1">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${testimonial.is_active ? "bg-green-600/20" : "bg-red-600/20"}`}>
              {testimonial.is_active ? (
                <Eye size={12} className="text-green-500" />
              ) : (
                <EyeOff size={12} className="text-red-500" />
              )}
            </div>
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h4 className="font-black text-lg truncate">{testimonial.name}</h4>
              <p className="text-sm text-zinc-400 truncate">
                {testimonial.role} {testimonial.company && `at ${testimonial.company}`}
              </p>
            </div>
            
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={14}
                  className={i < testimonial.rating ? "text-yellow-500 fill-yellow-500" : "text-zinc-700"}
                />
              ))}
            </div>
          </div>
          
          {/* Content */}
          <div className="mb-3">
            <p className="text-zinc-300 italic line-clamp-2 text-sm">"{testimonial.content}"</p>
          </div>
          
          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={onEdit}
                className="p-1.5 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors"
                title="Edit"
              >
                <Edit size={14} />
              </button>
              <button
                onClick={onDelete}
                className="p-1.5 bg-red-600/20 rounded-lg hover:bg-red-600/30 transition-colors"
                title="Delete"
              >
                <Trash2 size={14} className="text-red-500" />
              </button>
              <button
                onClick={onToggleActive}
                className={`p-1.5 rounded-lg transition-colors ${
                  testimonial.is_active 
                    ? "bg-green-600/20 hover:bg-green-600/30" 
                    : "bg-red-600/20 hover:bg-red-600/30"
                }`}
                title={testimonial.is_active ? "Set inactive" : "Set active"}
              >
                {testimonial.is_active ? (
                  <EyeOff size={14} className="text-green-500" />
                ) : (
                  <Eye size={14} className="text-red-500" />
                )}
              </button>
            </div>
            
            <div className="text-xs text-zinc-600">
              {new Date(testimonial.created_at).toLocaleDateString("id-ID")}
              {testimonial.updated_at !== testimonial.created_at && (
                <span className="ml-1 text-green-500" title="Edited">*</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};