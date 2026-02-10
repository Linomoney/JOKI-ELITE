"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { MessageCircle, Users, Send, Loader2, Search, Shield, Clock, Trash2, RefreshCcw, X, User, ChevronLeft, RefreshCw, Bell, Edit, MoreVertical, Ban } from "lucide-react";
import { supabase, dbHelpers } from "@/lib/supabase";
import { motion } from "framer-motion";
import { useDebounce } from "@/hooks/useDebounce";
import { debounce } from "lodash";

// Hapus semua kode duplikat dan tulis ulang AdminChatWidget
interface AdminChatWidgetProps {
  currentAdmin?: any;
}

export default function AdminChatWidget({ currentAdmin }: AdminChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [chatUsers, setChatUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [showUserList, setShowUserList] = useState(true);
  const [lastMessageId, setLastMessageId] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // State untuk long press
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [showMessageMenu, setShowMessageMenu] = useState(false);
  const [showContactMenu, setShowContactMenu] = useState(false);
  const [editingMessage, setEditingMessage] = useState<any>(null);
  const [editText, setEditText] = useState("");
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const pendingUpdatesRef = useRef<Set<string>>(new Set());

  // Refs untuk long press
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const messageRefs = useRef<Map<string, HTMLElement>>(new Map());
  const contactRefs = useRef<Map<string, HTMLElement>>(new Map());

  // Deteksi device
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);

      if (mobile) {
        if (selectedUserId) {
          setShowUserList(false);
        } else {
          setShowUserList(true);
        }
      } else {
        setShowUserList(true);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    setIsMounted(true);

    return () => {
      window.removeEventListener("resize", checkMobile);
      setIsMounted(false);
      clearLongPressTimer();
    };
  }, [selectedUserId]);

  // Debounced search
  const debouncedSearch = useMemo(
    () =>
      debounce((value: string) => {
        setSearchTerm(value);
      }, 300),
    [],
  );

  // Load chat users dengan optimasi
  const loadChatUsers = useCallback(
    async (force = false) => {
      if (!isMounted) return;

      setLoading(true);
      try {
        const users = await dbHelpers.getAllChatUsers(force);
        setChatUsers(users);

        const totalUnread = users.reduce((sum: number, user: any) => sum + (user.unread_count || 0), 0);
        setUnreadCount(totalUnread);
      } catch (error) {
        console.error("Load chat users error:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    },
    [isMounted],
  );

  // Load messages
  const loadMessages = useCallback(
    async (userId: string, refresh = false) => {
      if (!userId || !isMounted) return;

      setLoading(true);
      try {
        const userData = chatUsers.find((u) => u.user_id === userId);
        setSelectedUser(userData);

        const lastId = refresh ? undefined : lastMessageId || undefined;
        const newMessages = await dbHelpers.getChatsByUser(userId, 50, lastId);

        if (!isMounted) return;

        if (refresh) {
          setMessages(newMessages);
        } else {
          setMessages((prev) => [...prev, ...newMessages]);
        }

        if (newMessages.length > 0) {
          setLastMessageId(newMessages[newMessages.length - 1]?.id || null);
        }

        if (userData?.unread_count > 0) {
          await dbHelpers.markMessagesAsRead(userId);
          loadChatUsers(true);
        }

        scrollToBottom();
      } catch (error) {
        console.error("Load user messages error:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    },
    [chatUsers, lastMessageId, loadChatUsers, isMounted],
  );

  // Real-time subscription
  useEffect(() => {
    if (!isOpen || !isMounted) return;

    let channel: any;
    let timeoutId: NodeJS.Timeout;
    const processedIds = new Set<string>();

    const setupRealtime = () => {
      channel = supabase
        .channel(`admin-chat-global`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "chats",
            filter: `is_admin=eq.false`,
          },
          async (payload: any) => {
            // Skip jika pesan dari admin yang sedang aktif
            if (payload.new.admin_id === currentAdmin?.id) {
              return;
            }
            
            const messageId = payload.new.id;

            if (processedIds.has(messageId)) return;
            processedIds.add(messageId);

            if (pendingUpdatesRef.current.has(messageId)) return;
            pendingUpdatesRef.current.add(messageId);

            clearTimeout(timeoutId);
            timeoutId = setTimeout(async () => {
              loadChatUsers(true);

              if (selectedUserId === payload.new.user_id) {
                setMessages((prev) => [...prev, payload.new]);
                scrollToBottom();
                await dbHelpers.markMessagesAsRead(payload.new.user_id, [payload.new.id]);
              }

              pendingUpdatesRef.current.delete(messageId);
              processedIds.delete(messageId);
            }, 100);
          },
        )

        .subscribe();

      return () => {
        if (channel) {
          supabase.removeChannel(channel);
        }
        clearTimeout(timeoutId);
      };
    };

    const cleanup = setupRealtime();

    const intervalId = setInterval(() => {
      if (isMounted) {
        loadChatUsers(true);
      }
    }, 30000);

    return () => {
      cleanup?.();
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, [isOpen, selectedUserId, loadChatUsers, isMounted, currentAdmin]);

  // Initial load
  useEffect(() => {
    if (isOpen && isMounted) {
      loadChatUsers();
    }
  }, [isOpen, loadChatUsers, isMounted]);

  // Auto load messages saat user dipilih
  useEffect(() => {
    if (selectedUserId && isMounted) {
      loadMessages(selectedUserId, true);
      if (isMobile) {
        setShowUserList(false);
      }
    } else if (!selectedUserId && isMobile && isMounted) {
      setShowUserList(true);
    }
  }, [selectedUserId, isMobile, loadMessages, isMounted]);

  // Handle long press untuk messages
  const handleMessageLongPress = (msg: any, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();

    // Hanya untuk pesan admin
    if (!msg.is_admin) return;

    setSelectedMessage(msg);

    // Dapatkan posisi
    let x = 0, y = 0;
    if ("touches" in e) {
      x = e.touches[0].clientX;
      y = e.touches[0].clientY;
    } else {
      x = e.clientX;
      y = e.clientY;
    }

    setMenuPosition({ x, y });
    setShowMessageMenu(true);
    setShowContactMenu(false);
  };

  // Handle long press untuk kontak
  const handleContactLongPress = (user: any, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();

    setSelectedContact(user);

    let x = 0, y = 0;
    if ("touches" in e) {
      x = e.touches[0].clientX;
      y = e.touches[0].clientY;
    } else {
      x = e.clientX;
      y = e.clientY;
    }

    setMenuPosition({ x, y });
    setShowContactMenu(true);
    setShowMessageMenu(false);
  };

  // Clear long press timer
  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Setup event listeners untuk close menu
  useEffect(() => {
    const handleClickOutside = () => {
      setShowMessageMenu(false);
      setShowContactMenu(false);
    };

    document.addEventListener("click", handleClickOutside);
    document.addEventListener("contextmenu", handleClickOutside);

    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("contextmenu", handleClickOutside);
    };
  }, []);

  // Handle back button di mobile
  const handleBackToUserList = () => {
    setSelectedUserId(null);
    setSelectedUser(null);
    setMessages([]);
    setLastMessageId(null);
    setMessage("");

    if (isMobile) {
      setShowUserList(true);
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || !selectedUserId || !isMounted) return;

    setLoading(true);

    // Generate temporary ID untuk optimistic update
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Admin not authenticated");

      // Optimistic update
      const tempMsg = {
        user_id: selectedUserId,
        message: message.trim(),
        is_admin: true,
        read: true,
        admin_id: user.id,
        id: tempId,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, tempMsg]);
      setMessage("");
      scrollToBottom();

      // Kirim ke server - PERBAIKAN DI SINI
      const sentMessage = await dbHelpers.sendMessage({
        user_id: selectedUserId,
        message: message.trim(),
        is_admin: true,
        read: true,
        admin_id: user.id, // Tambahkan admin_id jika diperlukan
      });

      // Replace temporary message dengan yang asli
      setMessages((prev) => prev.map((msg) => (msg.id === tempId ? sentMessage : msg)));

      loadChatUsers(true);
    } catch (error: any) {
      console.error("Send message error:", error);
      alert("Failed to send message");

      // Remove optimistic update jika gagal
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
  };

  // Edit message
  const editMessage = async () => {
    if (!selectedMessage || !editText.trim() || editText === selectedMessage.message) {
      setEditingMessage(null);
      setEditText("");
      return;
    }

    try {
      // Update di database
      const { error } = await supabase
        .from("chats")
        .update({
          message: editText.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedMessage.id);

      if (error) throw error;

      // Update local state
      setMessages((prev) => prev.map((msg) => (msg.id === selectedMessage.id ? { ...msg, message: editText.trim() } : msg)));

      setEditingMessage(null);
      setEditText("");
      setShowMessageMenu(false);
    } catch (error) {
      console.error("Edit message error:", error);
      alert("Failed to edit message");
    }
  };

  // Delete message
  const deleteMessage = async () => {
    if (!selectedMessage) return;

    if (!confirm("Delete this message?")) {
      setShowMessageMenu(false);
      return;
    }

    try {
      await dbHelpers.deleteMessage(selectedMessage.id, selectedUserId || undefined);
      setMessages((prev) => prev.filter((msg) => msg.id !== selectedMessage.id));
      setShowMessageMenu(false);
      setSelectedMessage(null);
    } catch (error) {
      console.error("Delete message error:", error);
      alert("Failed to delete message");
    }
  };

  // Delete contact from list (temporary)
  const deleteContact = async () => {
    if (!selectedContact) return;

    if (!confirm(`Remove ${selectedContact.full_name} from chat list? They can still message you later.`)) {
      setShowContactMenu(false);
      return;
    }

    try {
      // Hapus dari local state saja (temporary)
      setChatUsers((prev) => prev.filter((user) => user.user_id !== selectedContact.user_id));

      // Jika yang dihapus sedang dipilih, clear selection
      if (selectedUserId === selectedContact.user_id) {
        handleBackToUserList();
      }

      setShowContactMenu(false);
      setSelectedContact(null);

      // Show success message
      alert(`${selectedContact.full_name} has been removed from your chat list. They can still message you.`);
    } catch (error) {
      console.error("Delete contact error:", error);
      alert("Failed to remove contact");
    }
  };

  const scrollToBottom = () => {
    if (!isMounted) return;

    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }, 100);
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (date: string) => {
    const msgDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (msgDate.toDateString() === today.toDateString()) {
      return "Today";
    } else if (msgDate.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return msgDate.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
      });
    }
  };

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: { [key: string]: any[] } = {};

    messages.forEach((msg) => {
      const date = new Date(msg.created_at).toDateString();
      if (!groups[date]) groups[date] = [];
      groups[date].push(msg);
    });

    return Object.entries(groups);
  }, [messages]);

  // Filter users by search
  const filteredUsers = useMemo(() => {
    if (!searchTerm) return chatUsers;

    return chatUsers.filter(
      (user) => 
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        user.latest_message?.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [chatUsers, searchTerm]);

  // Handle infinite scroll
  const handleScroll = useCallback(() => {
    if (!chatContainerRef.current || loading || !isMounted) return;

    const { scrollTop } = chatContainerRef.current;

    if (scrollTop < 100 && messages.length > 0 && lastMessageId) {
      loadMessages(selectedUserId!, false);
    }
  }, [loading, messages.length, selectedUserId, lastMessageId, loadMessages, isMounted]);

  // Cleanup
  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
      setIsMounted(false);
      clearLongPressTimer();
    };
  }, [debouncedSearch]);

  const shouldShowUserList = showUserList || (!isMobile && !selectedUserId);
  const shouldShowChatArea = !showUserList || !isMobile || selectedUserId;

  // ... (kode JSX tetap sama seperti sebelumnya, hanya perbaikan struktur)
  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 z-50 w-14 h-14 bg-red-600 text-white rounded-full flex items-center justify-center shadow-2xl hover:bg-red-700 transition-all hover:scale-110 active:scale-95"
        aria-label="Open admin chat"
      >
        <Users size={24} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-6 h-6 bg-white text-red-600 text-xs font-black rounded-full flex items-center justify-center animate-pulse border-2 border-red-600">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Admin Chat Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 md:p-4">
          <div className="relative w-full max-w-6xl h-full md:h-[90vh] bg-[#0c0c0c] border border-zinc-800 rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-zinc-800 bg-black/50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                {isMobile && selectedUserId && !showUserList && (
                  <button onClick={handleBackToUserList} className="p-2 hover:bg-zinc-900 rounded-lg transition-colors" aria-label="Back to user list">
                    <ChevronLeft size={20} />
                  </button>
                )}

                <div className="w-10 h-10 bg-red-600/20 rounded-xl flex items-center justify-center">
                  <Users className="text-red-600" size={20} />
                </div>
                <div>
                  <h3 className="font-black text-sm md:text-base">Admin Chat Panel</h3>
                  <p className="text-[10px] md:text-xs text-zinc-600 font-mono">
                    {chatUsers.length} users • {unreadCount} unread
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isMobile ? (
                  <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-zinc-900 rounded-lg transition-colors" aria-label="Close">
                    <X size={20} />
                  </button>
                ) : (
                  <>
                    <button onClick={() => loadChatUsers(true)} disabled={loading} className="p-2 hover:bg-zinc-900 rounded-lg transition-colors disabled:opacity-50" aria-label="Refresh">
                      <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                    </button>
                    <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-zinc-900 rounded-lg transition-colors" aria-label="Close">
                      <X size={20} />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Main Content */}
            <div className="flex flex-1 overflow-hidden">
              {/* User List Sidebar */}
              {shouldShowUserList && (
                <div className={`${isMobile ? "absolute inset-0 z-10 bg-[#0c0c0c]" : "w-full md:w-1/3"} border-r border-zinc-800 flex flex-col`}>
                  {/* Header */}
                  <div className="p-4 border-b border-zinc-800 shrink-0 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-600/20 rounded-xl flex items-center justify-center">
                        <Users className="text-red-600" size={20} />
                      </div>
                      <div>
                        <h3 className="font-black text-sm md:text-base">Chat Users</h3>
                        <p className="text-[10px] text-zinc-600 font-mono">
                          {chatUsers.length} users • {unreadCount} unread
                        </p>
                      </div>
                    </div>

                    {isMobile && (
                      <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-zinc-900 rounded-lg transition-colors" aria-label="Close chat">
                        <X size={20} />
                      </button>
                    )}
                  </div>

                  {/* Search */}
                  <div className="p-4 border-b border-zinc-800 shrink-0">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => debouncedSearch(e.target.value)}
                        placeholder="Search users..."
                        className="w-full pl-10 pr-3 py-3 bg-zinc-900 border border-zinc-800 rounded-xl outline-none focus:border-red-600 text-sm placeholder:text-zinc-600"
                      />
                    </div>
                  </div>

                  {/* Users List */}
                  <div className="flex-1 overflow-y-auto">
                    {loading && chatUsers.length === 0 ? (
                      <div className="p-8 text-center">
                        <Loader2 className="animate-spin text-red-600 mx-auto mb-2" size={24} />
                        <p className="text-sm text-zinc-600">Loading conversations...</p>
                      </div>
                    ) : filteredUsers.length > 0 ? (
                      <div className="divide-y divide-zinc-800">
                        {filteredUsers.map((user) => (
                          <div
                            key={user.user_id}
                            ref={(el) => {
                              if (el) contactRefs.current.set(user.user_id, el);
                              else contactRefs.current.delete(user.user_id);
                            }}
                            onContextMenu={(e) => handleContactLongPress(user, e)}
                            onTouchStart={(e) => {
                              longPressTimerRef.current = setTimeout(() => {
                                handleContactLongPress(user, e);
                              }, 500);
                            }}
                            onTouchEnd={() => clearLongPressTimer()}
                            onTouchMove={() => clearLongPressTimer()}
                            className="relative"
                          >
                            <button
                              onClick={() => {
                                setSelectedUserId(user.user_id);
                                if (isMobile) {
                                  setShowUserList(false);
                                }
                              }}
                              className={`w-full p-4 text-left hover:bg-zinc-900/50 transition-colors ${selectedUserId === user.user_id ? "bg-zinc-900" : ""}`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="relative">
                                  <div className="w-10 h-10 bg-red-600/20 rounded-full flex items-center justify-center">
                                    <span className="font-black text-sm">{user.full_name?.charAt(0)?.toUpperCase() || "U"}</span>
                                  </div>
                                  {user.unread_count > 0 && (
                                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center border-2 border-[#0c0c0c]">
                                      <span className="text-[10px] text-white font-black">{user.unread_count > 9 ? "9+" : user.unread_count}</span>
                                    </div>
                                  )}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <p className="font-medium text-sm truncate">{user.full_name}</p>
                                    <span className="text-[10px] text-zinc-600 whitespace-nowrap">{user.latest_time ? formatTime(user.latest_time) : ""}</span>
                                  </div>

                                  <p className="text-xs text-zinc-600 truncate mb-2">{user.email}</p>

                                  {user.latest_message && (
                                    <div className="flex items-center gap-2">
                                      <div className={`w-2 h-2 rounded-full ${user.is_admin_reply ? "bg-blue-500" : "bg-green-500"}`} />
                                      <p className="text-xs text-zinc-500 truncate flex-1">{user.latest_message}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center">
                        <MessageCircle size={40} className="text-zinc-700 mx-auto mb-4" />
                        <p className="text-sm text-zinc-600">No conversations found</p>
                        {searchTerm && (
                          <button
                            onClick={() => {
                              setSearchTerm("");
                              debouncedSearch("");
                            }}
                            className="mt-2 text-red-600 hover:text-red-500 text-sm"
                          >
                            Clear search
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Chat Area */}
              {shouldShowChatArea && (
                <div className={`${isMobile && showUserList ? "hidden" : "flex-1"} flex flex-col`}>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-zinc-800 flex items-center justify-between shrink-0">
                    {selectedUser ? (
                      <>
                        <div className="flex items-center gap-3">
                          {isMobile && !showUserList && (
                            <button onClick={handleBackToUserList} className="p-2 hover:bg-zinc-900 rounded-lg transition-colors" aria-label="Back to user list">
                              <ChevronLeft size={20} />
                            </button>
                          )}
                          <div className="w-10 h-10 bg-red-600/20 rounded-full flex items-center justify-center">
                            <span className="font-black text-sm">{selectedUser.full_name?.charAt(0)?.toUpperCase() || "U"}</span>
                          </div>
                          <div>
                            <h4 className="font-black text-sm md:text-base">{selectedUser.full_name}</h4>
                            <p className="text-xs text-zinc-600 truncate max-w-[200px]">{selectedUser.email}</p>
                          </div>
                        </div>

                        {selectedUser.unread_count > 0 && (
                          <div className="flex items-center gap-2">
                            <Bell size={16} className="text-red-600 animate-pulse" />
                            <span className="px-2 py-1 bg-red-600/20 text-red-500 text-xs rounded-full">{selectedUser.unread_count} new</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex-1 text-center py-4">
                        <h4 className="font-black text-sm md:text-base">Select a conversation</h4>
                        <p className="text-xs text-zinc-600">Choose a user from the list to start chatting</p>
                      </div>
                    )}
                  </div>

                  {/* Messages Area */}
                  <div ref={chatContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto bg-[#050505] scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                    {selectedUser ? (
                      <>
                        {loading && messages.length === 0 ? (
                          <div className="h-full flex items-center justify-center">
                            <Loader2 className="animate-spin text-red-600" size={32} />
                          </div>
                        ) : messages.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center p-8">
                            <MessageCircle size={64} className="text-zinc-800 mb-4" />
                            <p className="text-zinc-600 text-center mb-2">No messages yet</p>
                            <p className="text-zinc-700 text-sm text-center max-w-md">Start a conversation with {selectedUser.full_name}</p>
                          </div>
                        ) : (
                          <div className="p-4 space-y-6">
                            {groupedMessages.map(([date, dateMessages]) => {
                              const groupKey = `group-${date}`;
                              return (
                                <div key={groupKey}>
                                  {/* Date Separator */}
                                  <div className="sticky top-2 z-10 flex justify-center mb-4">
                                    <div className="px-3 py-1 bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 text-zinc-500 text-xs rounded-full">{formatDate(date)}</div>
                                  </div>

                                  {/* Messages */}
                                  {dateMessages.map((msg, index) => {
                                    const messageKey = `${msg.id}-${msg.created_at}-${index}`;
                                    return (
                                      <div
                                        key={messageKey}
                                        ref={(el) => {
                                          if (el) messageRefs.current.set(msg.id, el);
                                          else messageRefs.current.delete(msg.id);
                                        }}
                                        onContextMenu={(e) => handleMessageLongPress(msg, e)}
                                        onTouchStart={(e) => {
                                          if (msg.is_admin) {
                                            longPressTimerRef.current = setTimeout(() => {
                                              handleMessageLongPress(msg, e);
                                            }, 500);
                                          }
                                        }}
                                        onTouchEnd={() => clearLongPressTimer()}
                                        onTouchMove={() => clearLongPressTimer()}
                                        className={`flex ${msg.is_admin ? "justify-end" : "justify-start"} mb-3`}
                                      >
                                        <div
                                          className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-3 md:p-4 relative group ${
                                            msg.is_admin ? "bg-red-600/20 border border-red-600/30 rounded-br-none" : "bg-zinc-900 border border-zinc-800 rounded-bl-none"
                                          } ${!msg.read && msg.is_admin ? "ring-1 ring-red-500/30" : ""}`}
                                        >
                                          {/* Message Header */}
                                          <div className="flex items-center gap-2 mb-2">
                                            {msg.is_admin ? <Shield size={12} className="text-red-600" /> : <User size={12} className="text-red-600" />}
                                            <span className="text-[10px] font-mono text-zinc-600">
                                              {msg.is_admin ? "You" : selectedUser.full_name} • {formatTime(msg.created_at)}
                                            </span>
                                          </div>

                                          {/* Message Content - Edit mode atau normal */}
                                          {editingMessage?.id === msg.id ? (
                                            <div className="space-y-2">
                                              <textarea value={editText} onChange={(e) => setEditText(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-sm text-white" rows={3} autoFocus />
                                              <div className="flex gap-2">
                                                <button onClick={editMessage} className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700">
                                                  Save
                                                </button>
                                                <button
                                                  onClick={() => {
                                                    setEditingMessage(null);
                                                    setEditText("");
                                                  }}
                                                  className="px-3 py-1 bg-zinc-700 text-white text-xs rounded hover:bg-zinc-600"
                                                >
                                                  Cancel
                                                </button>
                                              </div>
                                            </div>
                                          ) : (
                                            <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                                          )}

                                          {/* Message Footer */}
                                          <div className="flex items-center justify-between mt-2">
                                            <span className="text-[10px] text-zinc-600">
                                              {new Date(msg.created_at).toLocaleTimeString("id-ID", {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                              })}
                                            </span>

                                            {/* Delete button for admin messages */}
                                            {msg.is_admin && !editingMessage && (
                                              <button
                                                onClick={() => {
                                                  setSelectedMessage(msg);
                                                  deleteMessage();
                                                }}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-red-600 hover:text-red-400"
                                              >
                                                Delete
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })}

                            {loading && messages.length > 0 && (
                              <div className="flex justify-center py-4">
                                <Loader2 className="animate-spin text-red-600" size={20} />
                              </div>
                            )}

                            <div ref={messagesEndRef} />
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center p-8">
                        <Users size={64} className="text-zinc-800 mb-6" />
                        <h3 className="text-lg font-black mb-2">Admin Chat Support</h3>
                        <p className="text-zinc-600 text-center max-w-md mb-6">Select a conversation from the list to view and reply to messages. You can provide support to multiple users simultaneously.</p>
                        <div className="grid grid-cols-2 gap-3 text-sm text-zinc-500">
                          <div className="flex items-center gap-2">
                            <Shield size={14} className="text-red-600" />
                            <span>Admin privileges</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Bell size={14} className="text-red-600" />
                            <span>Real-time updates</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Input Area */}
                  <div className="p-4 border-t border-zinc-800 shrink-0">
                    {selectedUser ? (
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                sendMessage();
                              }
                            }}
                            placeholder={`Reply to ${selectedUser.full_name}...`}
                            className="flex-1 bg-zinc-900 border border-zinc-800 px-4 py-3 rounded-xl outline-none focus:border-red-600 text-sm placeholder:text-zinc-600"
                            disabled={loading}
                          />
                          <button
                            onClick={sendMessage}
                            disabled={loading || !message.trim()}
                            className="px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[80px] justify-center"
                          >
                            {loading ? (
                              <Loader2 className="animate-spin" size={18} />
                            ) : (
                              <>
                                <Send size={18} />
                                <span className="hidden sm:inline">Send</span>
                              </>
                            )}
                          </button>
                        </div>
                        <p className="text-[10px] text-zinc-600 text-center">Press Enter to send • Shift+Enter for new line • Long-press messages to edit/delete</p>
                      </div>
                    ) : (
                      <p className="text-center text-zinc-600 text-sm py-4">Select a user to start chatting</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Context Menu untuk Messages */}
      {showMessageMenu && selectedMessage && (
        <div
          className="fixed z-[10000] bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl min-w-[160px]"
          style={{
            left: `${Math.min(menuPosition.x, window.innerWidth - 180)}px`,
            top: `${Math.min(menuPosition.y, window.innerHeight - 120)}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="py-1">
            <button
              onClick={() => {
                setEditingMessage(selectedMessage);
                setEditText(selectedMessage.message);
                setShowMessageMenu(false);
              }}
              className="w-full px-4 py-3 text-left text-sm hover:bg-zinc-800 flex items-center gap-3"
            >
              <Edit size={14} />
              Edit Message
            </button>
            <button onClick={deleteMessage} className="w-full px-4 py-3 text-left text-sm hover:bg-zinc-800 flex items-center gap-3 text-red-500">
              <Trash2 size={14} />
              Delete Message
            </button>
          </div>
        </div>
      )}

      {/* Context Menu untuk Contacts */}
      {showContactMenu && selectedContact && (
        <div
          className="fixed z-[10000] bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl min-w-[180px]"
          style={{
            left: `${Math.min(menuPosition.x, window.innerWidth - 200)}px`,
            top: `${Math.min(menuPosition.y, window.innerHeight - 160)}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="py-1">
            <button onClick={deleteContact} className="w-full px-4 py-3 text-left text-sm hover:bg-zinc-800 flex items-center gap-3 text-red-500">
              <Trash2 size={14} />
              Remove from List
            </button>
          </div>
        </div>
      )}
    </>
  );
}