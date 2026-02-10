"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { MessageCircle, X, Send, User, Shield, Loader2, Trash2, Bell } from "lucide-react";
import { dbHelpers, supabase } from "@/lib/supabase";
import { useSharedChat } from "@/hooks/useSharedChat";

export default function ChatWidget({ user }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [isMountedRef, setIsMountedRef] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const { 
    messages, 
    loading, 
    error: chatError,
    sendMessage: sendChatMessage,
    loadMessages: loadChatMessages 
  } = useSharedChat(user?.id || null);

  // Deteksi device
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: { [key: string]: any[] } = {};

    const sortedMessages = [...messages].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    sortedMessages.forEach((msg) => {
      const date = new Date(msg.created_at).toDateString();
      if (!groups[date]) groups[date] = [];
      groups[date].push(msg);
    });

    return Object.entries(groups);
  }, [messages]);

  // Cek unread count saat component mount
  useEffect(() => {
    if (user && isMountedRef) {
      dbHelpers.getUnreadCount(user.id).then((count) => {
        if (isMountedRef) {
          setUnreadCount(count);
        }
      });
    }

    return () => {
      setIsMountedRef(false);
    };
  }, [user]);

  // Mark messages as read
  const markMessagesAsRead = useCallback(async () => {
    if (!user || unreadCount === 0) return;

    try {
      const unreadIds = messages
        .filter((m: any) => m.is_admin && !m.read)
        .map((m: any) => m.id);

      if (unreadIds.length > 0) {
        await dbHelpers.markMessagesAsRead(user.id, unreadIds);
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Mark as read error:", error);
    }
  }, [user, messages, unreadCount]);

  // Load messages saat chat dibuka
  useEffect(() => {
    if (user && isOpen && isMountedRef) {
      loadChatMessages();
      markMessagesAsRead();
    }
  }, [user, isOpen, loadChatMessages, markMessagesAsRead]);

  // Fungsi scroll ke bawah dengan optimasi
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current && isMountedRef) {
      // Gunakan requestAnimationFrame untuk smooth scroll
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "end",
        });
      });
    }
  }, [isMountedRef]);

  // Auto scroll ketika messages berubah (pesan baru ditambahkan)
  useEffect(() => {
    if (messages.length > 0) {
      // Delay sedikit untuk memastikan DOM sudah terupdate
      const timer = setTimeout(() => {
        scrollToBottom();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [messages, scrollToBottom]);

  // Auto scroll ke bawah saat chat pertama kali dibuka
  useEffect(() => {
    if (isOpen && messages.length > 0) {
      const timer = setTimeout(() => {
        scrollToBottom();
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen, messages.length, scrollToBottom]);

  const sendMessage = async () => {
    if (!message.trim() || !user || loading) return;

    try {
      // Kirim pesan
      await sendChatMessage(message.trim(), false);
      
      // Reset input
      setMessage("");
      
      // Scroll ke bawah setelah pesan dikirim
      setTimeout(() => {
        scrollToBottom();
      }, 50);
    } catch (error) {
      console.error("Send message error:", error);
      alert("Failed to send message. Please try again.");
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!confirm("Delete this message?")) return;

    try {
      await dbHelpers.deleteMessage(messageId, user.id);
    } catch (error) {
      console.error("Delete message error:", error);
      alert("Failed to delete message");
      loadChatMessages();
    }
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Handle infinite scroll
  const handleScroll = useCallback(() => {
    if (!chatContainerRef.current || loading) return;

    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;

    // Load lebih banyak pesan jika scroll di atas 20%
    if (scrollTop < 100 && scrollHeight > clientHeight) {
      loadChatMessages();
    }
  }, [loading, loadChatMessages]);

  // Cleanup
  useEffect(() => {
    return () => {
      setIsMountedRef(false);
    };
  }, []);

  // JSX tetap sama seperti sebelumnya
  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-red-600 text-white rounded-full flex items-center justify-center shadow-2xl hover:bg-red-700 transition-all hover:scale-110 active:scale-95"
        aria-label="Open chat"
      >
        <MessageCircle size={24} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-6 h-6 bg-white text-red-600 text-xs font-black rounded-full flex items-center justify-center animate-pulse border-2 border-red-600">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Chat Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-end justify-end p-2 md:p-4">
          <div className={`${isMobile ? "w-full h-[90vh]" : "w-full max-w-sm md:max-w-md h-[80vh] md:h-[70vh]"} bg-[#0c0c0c] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col`}>
            {/* Header */}
            <div className="p-4 border-b border-zinc-800 bg-black/50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-600/20 rounded-xl flex items-center justify-center">
                  <Shield className="text-red-600" size={20} />
                </div>
                <div>
                  <h3 className="font-black text-sm md:text-base">Admin Support</h3>
                  <p className="text-[10px] md:text-xs text-zinc-600 font-mono">
                    {unreadCount > 0 ? `${unreadCount} new messages` : "Online 24/7"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-zinc-900 rounded-lg transition-colors"
                aria-label="Close chat"
              >
                <X size={20} />
              </button>
            </div>

            {/* Messages Container */}
            <div
              ref={chatContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto bg-[#050505] scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent"
            >
              {loading && messages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="animate-spin text-red-600" size={32} />
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-8">
                  <MessageCircle size={48} className="text-zinc-800 mb-4" />
                  <p className="text-zinc-600 text-center mb-2">No messages yet</p>
                  <p className="text-zinc-700 text-sm text-center">
                    Start a conversation with our admin team
                  </p>
                </div>
              ) : (
                <div className="p-4 space-y-4">
                  {groupedMessages.map(([date, dateMessages]) => {
                    const groupKey = `group-${date}`;

                    return (
                      <div key={groupKey}>
                        {/* Date Separator */}
                        <div className="sticky top-2 z-10 flex justify-center mb-4">
                          <div className="px-3 py-1 bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 text-zinc-500 text-xs rounded-full">
                            {new Date(date).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                            })}
                          </div>
                        </div>

                        {/* Messages dengan key yang unik */}
                        {dateMessages.map((msg, index) => {
                          const messageKey = `${msg.id}-${msg.created_at}-${index}`;

                          return (
                            <div
                              key={messageKey}
                              className={`flex ${
                                msg.is_admin ? "justify-start" : "justify-end"
                              } group`}
                            >
                              <div
                                className={`max-w-[85%] rounded-2xl p-3 md:p-4 relative ${
                                  msg.is_admin
                                    ? "bg-zinc-900 border border-zinc-800 rounded-bl-none"
                                    : "bg-red-600/20 border border-red-600/30 rounded-br-none"
                                } ${!msg.read && msg.is_admin ? "ring-1 ring-red-500/30" : ""}`}
                              >
                                {/* Message Header */}
                                <div className="flex items-center gap-2 mb-2">
                                  {msg.is_admin ? (
                                    <Shield size={12} className="text-red-600" />
                                  ) : (
                                    <User size={12} className="text-red-600" />
                                  )}
                                  <span className="text-[10px] font-mono text-zinc-600">
                                    {msg.is_admin ? "Admin" : "You"} • {formatTime(msg.created_at)}
                                  </span>
                                </div>

                                {/* Message Content */}
                                <p className="text-sm whitespace-pre-wrap break-words">
                                  {msg.message}
                                </p>

                                {/* Message Footer */}
                                <div className="flex items-center justify-between mt-2">
                                  <span className="text-[10px] text-zinc-600">
                                    {new Date(msg.created_at).toLocaleTimeString("id-ID", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>

                                  {/* Delete button for user messages */}
                                  {!msg.is_admin && (
                                    <button
                                      onClick={() => deleteMessage(msg.id)}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-red-600 hover:text-red-400"
                                    >
                                      Delete
                                    </button>
                                  )}

                                  {/* Read indicator */}
                                  {!msg.is_admin && (
                                    <span className="text-[10px] text-zinc-600 ml-2">
                                      {msg.read ? "✓✓" : "✓"}
                                    </span>
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

                  {/* Ini adalah anchor untuk scroll ke bawah */}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-zinc-800 bg-black/30 shrink-0">
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
                    placeholder="Type your message..."
                    className="flex-1 bg-zinc-900 border border-zinc-800 px-4 py-3 rounded-xl outline-none focus:border-red-600 text-sm placeholder:text-zinc-600"
                    disabled={loading}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={loading || !message.trim()}
                    className="px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[44px]"
                  >
                    {loading ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <Send size={20} />
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-zinc-600 text-center">
                  Press Enter to send • Shift+Enter for new line • Response time: ~5 minutes
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}