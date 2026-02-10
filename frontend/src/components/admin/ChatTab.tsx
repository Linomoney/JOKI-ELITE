"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { MessageCircle, Users, Send, Loader2, Search, Shield, Clock, Trash2, RefreshCcw, X } from "lucide-react";
import { supabase, dbHelpers } from "@/lib/supabase";
import { motion } from "framer-motion";
import { useDebounce } from "@/hooks/useDebounce";

interface ChatTabProps {
  currentAdmin: any;
}

export default function ChatTab({ currentAdmin }: ChatTabProps) {
  const [chatUsers, setChatUsers] = useState<any[]>([]);
  const [selectedChatUser, setSelectedChatUser] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingMessage, setDeletingMessage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingMessageIds, setPendingMessageIds] = useState<Set<string>>(new Set());
  
  const debouncedSearch = useDebounce(searchTerm, 300);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isMounted = useRef(true);
  
  // Filter users by search
  const filteredUsers = useMemo(() => {
    return chatUsers.filter(user => 
      debouncedSearch === "" ||
      user.full_name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      user.email?.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  }, [chatUsers, debouncedSearch]);
  
  // Load chat users dengan optimasi
  const loadChatUsers = useCallback(async () => {
    try {
      setLoading(true);
      const users = await dbHelpers.getAllChatUsers();
      setChatUsers(users);
    } catch (error: any) {
      console.error("Load chat users error:", error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);
  
  // Load messages for selected user dengan deduplication
  const loadMessages = useCallback(async (userId: string, forceRefresh = false) => {
    if (!userId || !isMounted.current) return;
    
    try {
      const messages = await dbHelpers.getChatsByUser(userId);
      
      if (!isMounted.current) return;
      
      // Filter out messages that are pending (temporary)
      const filteredMessages = messages.filter(msg => 
        !msg.id.startsWith('temp-') && !pendingMessageIds.has(msg.id)
      );
      
      setChatMessages(filteredMessages);
      
      // Mark messages as read
      await supabase
        .from("chats")
        .update({ read: true })
        .eq("user_id", userId)
        .eq("is_admin", false)
        .eq("read", false);
      
      // Update unread count
      setChatUsers(prev => prev.map(user => 
        user.user_id === userId 
          ? { ...user, unread_count: 0 }
          : user
      ));
      
      scrollToBottom();
    } catch (error: any) {
      console.error("Load messages error:", error);
    }
  }, [pendingMessageIds]);
  
  // Send message dengan optimasi untuk menghindari duplikat
  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || !selectedChatUser || sendingMessage) return;
    
    setSendingMessage(true);
    
    // Generate temporary ID untuk optimistic update
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Optimistic update dengan temporary message
      const tempMsg = {
        id: tempId,
        user_id: selectedChatUser.user_id,
        message: newMessage.trim(),
        is_admin: true,
        read: true,
        admin_id: currentAdmin?.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      // Tambahkan temporary message ke local state
      setChatMessages(prev => [...prev, tempMsg]);
      setPendingMessageIds(prev => new Set([...prev, tempId]));
      setNewMessage("");
      scrollToBottom();
      
      // Kirim ke server
      const sentMessage = await dbHelpers.sendMessage({
        user_id: selectedChatUser.user_id,
        message: newMessage.trim(),
        is_admin: true,
        read: true,
        admin_id: currentAdmin?.id,
      });
      
      // Update local state dengan message yang sesungguhnya
      setChatMessages(prev => 
        prev.map(msg => msg.id === tempId ? sentMessage : msg)
      );
      setPendingMessageIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(tempId);
        return newSet;
      });
      
      // Update user's latest message
      setChatUsers(prev => prev.map(user => 
        user.user_id === selectedChatUser.user_id
          ? { 
              ...user, 
              latest_message: newMessage.trim(),
              latest_time: new Date().toISOString(),
              is_admin_reply: true,
            }
          : user
      ));
      
    } catch (error: any) {
      console.error("Send message error:", error);
      alert("Failed to send message");
      
      // Remove optimistic update jika gagal
      setChatMessages(prev => prev.filter(msg => msg.id !== tempId));
      setPendingMessageIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(tempId);
        return newSet;
      });
    } finally {
      setSendingMessage(false);
    }
  }, [newMessage, selectedChatUser, sendingMessage, currentAdmin]);
  
  // Delete message
  const deleteMessage = async (messageId: string) => {
    setDeletingMessage(messageId);
    try {
      await dbHelpers.deleteMessage(messageId);
      setChatMessages(prev => prev.filter(msg => msg.id !== messageId));
    } catch (error: any) {
      console.error("Delete message error:", error);
      alert("Failed to delete message");
    } finally {
      setDeletingMessage(null);
    }
  };
  
  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, []);
  
  // Format time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
    });
  };
  
  // Format chat time
  const formatChatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  
  // Setup real-time subscription untuk mencegah duplikat
  useEffect(() => {
    if (!selectedChatUser) return;
    
    let channel: any;
    const processedIds = new Set<string>();
    
    const setupRealtime = () => {
      channel = supabase
        .channel(`admin-chat-tab-${selectedChatUser.user_id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "chats",
            filter: `user_id=eq.${selectedChatUser.user_id}`,
          },
          (payload) => {
            const newMessage = payload.new;
            
            // Skip jika ini adalah pesan yang kita sendiri kirim (optimistic update)
            if (newMessage.admin_id === currentAdmin?.id || processedIds.has(newMessage.id)) {
              return;
            }
            
            // Tambahkan ke processed IDs
            processedIds.add(newMessage.id);
            
            // Update messages dengan cek duplikat
            setChatMessages(prev => {
              const exists = prev.some(msg => msg.id === newMessage.id);
              if (exists) return prev;
              
              // Jika ini pesan dari user, tambahkan
              if (!newMessage.is_admin) {
                return [...prev, newMessage];
              }
              
              return prev;
            });
            
            // Update user list jika pesan dari user
            if (!newMessage.is_admin) {
              setChatUsers(prev => prev.map(user => 
                user.user_id === selectedChatUser.user_id
                  ? { 
                      ...user, 
                      latest_message: newMessage.message,
                      latest_time: newMessage.created_at,
                      is_admin_reply: false,
                      unread_count: (user.unread_count || 0) + 1,
                    }
                  : user
              ));
            }
            
            scrollToBottom();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "chats",
            filter: `user_id=eq.${selectedChatUser.user_id}`,
          },
          (payload) => {
            setChatMessages(prev => prev.filter(msg => msg.id !== payload.old.id));
          }
        )
        .subscribe((status) => {
          console.log('Chat tab subscription status:', status);
        });
      
      return () => {
        if (channel) {
          supabase.removeChannel(channel);
        }
        processedIds.clear();
      };
    };
    
    const cleanup = setupRealtime();
    
    return cleanup;
  }, [selectedChatUser, currentAdmin, scrollToBottom]);
  
  // Global subscription untuk update user list
  useEffect(() => {
    let channel: any;
    
    const setupGlobalSubscription = () => {
      channel = supabase
        .channel('admin-chat-global-updates')
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "chats",
            filter: `is_admin=eq.false`,
          },
          async (payload) => {
            // Refresh user list
            loadChatUsers();
            
            // Jika ini pesan untuk user yang sedang dipilih, load messages
            if (selectedChatUser && selectedChatUser.user_id === payload.new.user_id) {
              await loadMessages(selectedChatUser.user_id, true);
            }
          }
        )
        .subscribe();
      
      return () => {
        if (channel) {
          supabase.removeChannel(channel);
        }
      };
    };
    
    const cleanup = setupGlobalSubscription();
    
    return cleanup;
  }, [selectedChatUser, loadChatUsers, loadMessages]);
  
  // Initial load
  useEffect(() => {
    isMounted.current = true;
    
    loadChatUsers();
    
    // Auto refresh user list setiap 30 detik
    const interval = setInterval(() => {
      if (isMounted.current) {
        loadChatUsers();
      }
    }, 30000);
    
    return () => {
      isMounted.current = false;
      clearInterval(interval);
    };
  }, [loadChatUsers]);
  
  // Load messages when user is selected
  useEffect(() => {
    if (selectedChatUser && isMounted.current) {
      loadMessages(selectedChatUser.user_id, true);
    }
  }, [selectedChatUser, loadMessages]);
  
  // Handle manual refresh
  const handleManualRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadChatUsers();
    if (selectedChatUser) {
      await loadMessages(selectedChatUser.user_id, true);
    }
  }, [loadChatUsers, loadMessages, selectedChatUser]);
  
  // Cleanup
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6"
    >
      {/* Users List */}
      <div className="lg:col-span-1">
        <div className="bg-[#0c0c0c] rounded-3xl border border-zinc-900 overflow-hidden flex flex-col h-[calc(100vh-300px)] md:h-[calc(100vh-400px)]">
          {/* Header */}
          <div className="p-4 border-b border-zinc-900">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-sm flex items-center gap-2">
                <Users size={16} className="text-red-600" />
                Conversations
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleManualRefresh}
                  disabled={isRefreshing}
                  className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
                  title="Refresh"
                >
                  <RefreshCcw size={14} className={isRefreshing ? "animate-spin" : ""} />
                </button>
              </div>
            </div>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={14} />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-black border border-zinc-800 rounded-lg text-sm focus:border-red-600 outline-none"
              />
            </div>
          </div>
          
          {/* Users List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center">
                <Loader2 className="animate-spin text-red-600 mx-auto mb-2" size={20} />
                <p className="text-sm text-zinc-600">Loading conversations...</p>
              </div>
            ) : filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <UserListItem
                  key={user.user_id}
                  user={user}
                  isSelected={selectedChatUser?.user_id === user.user_id}
                  onClick={() => setSelectedChatUser(user)}
                />
              ))
            ) : (
              <div className="p-8 text-center">
                <MessageCircle size={40} className="text-zinc-700 mx-auto mb-4" />
                <p className="text-sm text-zinc-600">No conversations yet</p>
                {debouncedSearch && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="mt-2 text-red-600 hover:text-red-500 text-sm"
                  >
                    Clear search
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Chat Area */}
      <div className="lg:col-span-3">
        <div className="bg-[#0c0c0c] rounded-3xl border border-zinc-900 overflow-hidden flex flex-col h-[calc(100vh-300px)] md:h-[calc(100vh-400px)]">
          {selectedChatUser ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-zinc-900 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedChatUser(null)}
                    className="md:hidden p-1.5 hover:bg-zinc-800 rounded-lg"
                  >
                    <X size={16} />
                  </button>
                  <div className="w-10 h-10 bg-red-600/20 rounded-full flex items-center justify-center">
                    <span className="font-black">
                      {selectedChatUser.full_name?.charAt(0)?.toUpperCase() || "U"}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-black text-sm">{selectedChatUser.full_name}</h3>
                    <p className="text-xs text-zinc-600 truncate">{selectedChatUser.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {selectedChatUser.unread_count > 0 && (
                    <span className="px-2 py-0.5 bg-red-600 text-white text-xs rounded-full">
                      {selectedChatUser.unread_count}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Messages Area */}
              <div
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#050505]"
              >
                {chatMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center p-8">
                    <MessageCircle size={48} className="text-zinc-800 mb-4" />
                    <p className="text-zinc-600 text-center mb-2">No messages yet</p>
                    <p className="text-zinc-700 text-sm text-center">
                      Start a conversation with {selectedChatUser.full_name}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="text-center">
                      <span className="px-3 py-1 bg-zinc-900 text-zinc-500 text-xs rounded-full">
                        {new Date().toLocaleDateString('id-ID', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </span>
                    </div>
                    
                    {chatMessages.map((msg) => (
                      <MessageBubble
                        key={msg.id}
                        message={msg}
                        onDelete={() => deleteMessage(msg.id)}
                        isDeleting={deletingMessage === msg.id}
                        formatTime={formatChatTime}
                        isTemporary={msg.id.startsWith('temp-')}
                      />
                    ))}
                    
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>
              
              {/* Input Area */}
              <div className="p-4 border-t border-zinc-900">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Type your message..."
                    className="flex-1 bg-zinc-900 border border-zinc-800 px-4 py-3 rounded-xl outline-none focus:border-red-600 text-sm"
                    disabled={sendingMessage}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={sendingMessage || !newMessage.trim()}
                    className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {sendingMessage ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <>
                        <Send size={18} />
                        <span className="hidden md:inline">Send</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-zinc-600 mt-2 text-center">
                  Press Enter to send • Messages are saved permanently
                </p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center max-w-md">
                <MessageCircle size={64} className="text-zinc-800 mx-auto mb-6" />
                <h3 className="text-xl font-black mb-2">Admin Chat Support</h3>
                <p className="text-zinc-600 mb-6">
                  Select a conversation from the list to start chatting with users.
                  You can reply to their inquiries and provide support.
                </p>
                <div className="space-y-3 text-sm text-zinc-500 text-left">
                  <div className="flex items-center gap-2">
                    <Shield size={14} className="text-red-600" />
                    <span>All messages are saved for reference</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-red-600" />
                    <span>Typical response time: 1-2 hours</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Subcomponent: User List Item
const UserListItem = ({ 
  user, 
  isSelected, 
  onClick 
}: { 
  user: any;
  isSelected: boolean;
  onClick: () => void;
}) => {
  return (
    <button
      onClick={onClick}
      className={`w-full p-4 border-b border-zinc-900 hover:bg-zinc-900/50 transition-colors text-left ${
        isSelected ? "bg-zinc-900/50" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 bg-red-600/20 rounded-full flex items-center justify-center">
            <span className="font-black text-sm">
              {user.full_name?.charAt(0)?.toUpperCase() || "U"}
            </span>
          </div>
          {user.unread_count > 0 && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center">
              <span className="text-[10px] text-white font-black">
                {user.unread_count}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-black text-sm truncate">{user.full_name}</h4>
            <span className="text-[10px] text-zinc-600">
              {user.latest_time ? formatRelativeTime(user.latest_time) : ""}
            </span>
          </div>
          
          <p className="text-xs text-zinc-600 truncate mb-1">{user.email}</p>
          
          {user.latest_message && (
            <div className="flex items-center gap-1">
              {user.is_admin_reply ? (
                <Shield size={10} className="text-red-600 flex-shrink-0" />
              ) : (
                <span className="w-2 h-2 bg-red-600 rounded-full flex-shrink-0"></span>
              )}
              <p className="text-xs text-zinc-500 truncate">
                {user.latest_message}
              </p>
            </div>
          )}
        </div>
      </div>
    </button>
  );
};

// Helper: Format relative time
const formatRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  
  return date.toLocaleDateString("id-ID", { month: "short", day: "numeric" });
};

// Subcomponent: Message Bubble
const MessageBubble = ({ 
  message, 
  onDelete, 
  isDeleting, 
  formatTime,
  isTemporary = false
}: { 
  message: any;
  onDelete: () => void;
  isDeleting: boolean;
  formatTime: (date: string) => string;
  isTemporary?: boolean;
}) => {
  const isAdmin = message.is_admin;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}
    >
      <div className={`group relative max-w-[85%] ${isTemporary ? 'opacity-70' : ''}`}>
        <div
          className={`rounded-2xl p-3 ${
            isAdmin
              ? "bg-red-600/20 border border-red-600/30 rounded-br-none"
              : "bg-zinc-900 border border-zinc-800 rounded-bl-none"
          } ${isTemporary ? 'border-dashed' : ''}`}
        >
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            {isAdmin ? (
              <Shield size={12} className="text-red-600" />
            ) : (
              <div className="w-2 h-2 bg-red-600 rounded-full"></div>
            )}
            <span className="text-[10px] font-mono text-zinc-600">
              {isAdmin ? "You (Admin)" : "User"} • {formatTime(message.created_at)}
              {isTemporary && <span className="text-yellow-500 ml-1">• Sending...</span>}
            </span>
          </div>
          
          {/* Message */}
          <p className="text-sm whitespace-pre-wrap break-words">{message.message}</p>
          
          {/* Time */}
          <div className="mt-1 text-right">
            <span className="text-[10px] text-zinc-600">
              {new Date(message.created_at).toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>
        
        {/* Delete button (for admin messages only) */}
        {isAdmin && !isTemporary && (
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="absolute -top-2 -right-2 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 disabled:opacity-50"
            title="Delete message"
          >
            {isDeleting ? (
              <Loader2 size={10} className="animate-spin text-white" />
            ) : (
              <Trash2 size={10} className="text-white" />
            )}
          </button>
        )}
      </div>
    </motion.div>
  );
};