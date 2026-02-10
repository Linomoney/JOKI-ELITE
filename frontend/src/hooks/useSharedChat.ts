// hooks/useSharedChat.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase, dbHelpers } from '@/lib/supabase';

export const useSharedChat = (userId: string | null) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load messages
  const loadMessages = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const chatData = await dbHelpers.getChatsByUser(userId);
      setMessages(chatData);
    } catch (err: any) {
      setError(err.message || 'Failed to load messages');
      console.error('Error loading messages:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Send message
  const sendMessage = useCallback(async (message: string, isAdmin: boolean = false) => {
    if (!userId || !message.trim()) return null;
    
    try {
      const tempId = `temp-${Date.now()}`;
      const tempMsg = {
        id: tempId,
        user_id: userId,
        message: message.trim(),
        is_admin: isAdmin,
        read: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Optimistic update
      setMessages(prev => {
        const newMessages = [...prev, tempMsg];
        return newMessages.sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      });

      // Send to server
      const sentMessage = await dbHelpers.sendMessage({
        user_id: userId,
        message: message.trim(),
        is_admin: isAdmin,
        read: false,
      });

      // Replace temp message
      setMessages(prev => {
        const updated = prev.map(msg => 
          msg.id === tempId ? sentMessage : msg
        );
        return updated.sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      });

      return sentMessage;
    } catch (err: any) {
      console.error('Error sending message:', err);
      
      // Remove optimistic update
      setMessages(prev => prev.filter(msg => !msg.id.startsWith('temp-')));
      
      throw err;
    }
  }, [userId]);

  // Real-time subscription - PERBAIKI TIPE DATA
  useEffect(() => {
    if (!userId) return;

    let channel: any;
    const processedIds = new Set<string>();

    const setupRealtime = () => {
      channel = supabase
        .channel(`shared-chat-${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'chats',
            filter: `user_id=eq.${userId}`,
          },
          (payload: any) => {
            // Skip jika sudah diproses
            if (processedIds.has(payload.new?.id || payload.old?.id)) {
              return;
            }

            switch (payload.eventType) {
              case 'INSERT':
                processedIds.add(payload.new.id);
                setMessages(prev => {
                  const exists = prev.some(msg => msg.id === payload.new.id);
                  if (exists) return prev;
                  
                  const newMessages = [...prev, payload.new];
                  return newMessages.sort(
                    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                  );
                });
                break;
                
              case 'UPDATE':
                processedIds.add(payload.new.id);
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === payload.new.id ? { ...msg, ...payload.new } : msg
                  )
                );
                break;
                
              case 'DELETE':
                processedIds.add(payload.old.id);
                setMessages(prev =>
                  prev.filter(msg => msg.id !== payload.old.id)
                );
                break;
            }

            // Cleanup processed IDs setelah 10 detik
            setTimeout(() => {
              processedIds.delete(payload.new?.id || payload.old?.id);
            }, 10000);
          }
        )
        .subscribe();

      return () => {
        if (channel) {
          supabase.removeChannel(channel);
        }
        processedIds.clear();
      };
    };

    const cleanup = setupRealtime();
    return cleanup;
  }, [userId]);

  // Initial load
  useEffect(() => {
    if (userId) {
      loadMessages();
    }
  }, [userId, loadMessages]);

  return {
    messages,
    loading,
    error,
    loadMessages,
    sendMessage,
  };
};