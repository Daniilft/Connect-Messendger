import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { Message } from "../types";

const MESSAGES_PAGE_SIZE = 50;

export function useMessages(chatId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchMessages = useCallback(
    async (reset = false) => {
      if (!chatId || !user) return;

      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      let query = supabase
        .from("messages")
        .select("*")
        .eq("chat_id", chatId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: true })
        .limit(MESSAGES_PAGE_SIZE);

      if (!reset && messages.length > 0) {
        query = query.lt(
          "created_at",
          messages[messages.length - 1].created_at,
        );
      }

      const { data, error } = await query;

      if (error) {
        console.error("Fetch messages error:", error);
        setError(error);
      } else {
        const senderIds = Array.from(
          new Set((data || []).map((m: any) => m.sender_id)),
        );
        const profiles: Record<string, any> = {};

        if (senderIds.length > 0) {
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("id, email, display_name")
            .in("id", senderIds);

          profilesData?.forEach((p: any) => {
            profiles[p.id] = p;
          });
        }

        // Загрузить reply_messages
        const replyToIds = Array.from(
          new Set((data || []).filter((m: any) => m.reply_to).map((m: any) => m.reply_to)),
        );
        const replyMessages: Record<string, any> = {};
        
        if (replyToIds.length > 0) {
          const { data: replyData } = await supabase
            .from("messages")
            .select("id, content, sender_id")
            .in("id", replyToIds);
          
          // Также загрузить профили авторов reply
          const replySenderIds = Array.from(
            new Set((replyData || []).map((r: any) => r.sender_id)),
          );
          const replyProfiles: Record<string, any> = {};
          
          if (replySenderIds.length > 0) {
            const { data: replyProfilesData } = await supabase
              .from("profiles")
              .select("id, email, display_name")
              .in("id", replySenderIds);
            
            replyProfilesData?.forEach((p: any) => {
              replyProfiles[p.id] = p;
            });
          }
          
          replyData?.forEach((r: any) => {
            replyMessages[r.id] = {
              ...r,
              sender: replyProfiles[r.sender_id] || { id: r.sender_id },
            };
          });
        }

        const messagesWithProfiles = (data || []).map((m: any) => ({
          ...m,
          sender: profiles[m.sender_id] || { id: m.sender_id },
          reply_message: m.reply_to ? replyMessages[m.reply_to] : null,
          reactions: [],
        }));

        if (reset) {
          setMessages(messagesWithProfiles);
        } else {
          setMessages((prev) => [...prev, ...messagesWithProfiles]);
        }

        setHasMore(messagesWithProfiles.length === MESSAGES_PAGE_SIZE);
      }

      setLoading(false);
      setLoadingMore(false);
    },
    [chatId, user, messages],
  );

  useEffect(() => {
    if (chatId) {
      setMessages([]);
      setHasMore(true);
      fetchMessages(true);
    }
  }, [chatId]);

  useEffect(() => {
    if (!chatId || !user) return;

    const channel = supabase
      .channel(`messages-${chatId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${chatId}`,
        },
        async (payload: any) => {
          if (payload.new.sender_id !== user.id) {
            const newMessage: any = {
              ...payload.new,
              reactions: [],
              sender: { id: payload.new.sender_id },
            };
            
            // Загрузить reply_message если есть
            if (payload.new.reply_to) {
              const { data: replyMsg } = await supabase
                .from("messages")
                .select("id, content, sender_id")
                .eq("id", payload.new.reply_to)
                .single();
              
              if (replyMsg) {
                const { data: replyProfile } = await supabase
                  .from("profiles")
                  .select("id, email, display_name")
                  .eq("id", replyMsg.sender_id)
                  .single();
                
                newMessage.reply_message = {
                  ...replyMsg,
                  sender: replyProfile || { id: replyMsg.sender_id },
                };
              }
            }
            
            setMessages((prev) => [...prev, newMessage]);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, user]);

  const sendMessage = async (
    content: string,
    messageType: Message["message_type"] = "text",
    fileUrl?: string,
    fileName?: string,
    replyTo?: string,
  ) => {
    if (!user || !chatId) return { error: new Error("Not authenticated") };

    const { data, error } = await supabase
      .from("messages")
      .insert({
        chat_id: chatId,
        sender_id: user.id,
        content,
        message_type: messageType,
        file_url: fileUrl || null,
        file_name: fileName || null,
        reply_to: replyTo || null,
      })
      .select()
      .single();

    if (!error && data) {
      // Загрузить reply_message если есть reply_to
      let replyMessage: any = null;
      if (data.reply_to) {
        const { data: replyData } = await supabase
          .from("messages")
          .select("id, content, sender_id")
          .eq("id", data.reply_to)
          .single();
        
        if (replyData) {
          const { data: replyProfile } = await supabase
            .from("profiles")
            .select("id, email, display_name")
            .eq("id", replyData.sender_id)
            .single();
          
          replyMessage = {
            ...replyData,
            sender: replyProfile || { id: replyData.sender_id },
          };
        }
      }
      
      setMessages((prev) => [
        ...prev,
        { ...data, reactions: [], sender: { id: user.id }, reply_message: replyMessage },
      ]);
    }

    return { message: data, error };
  };

  const editMessage = async (messageId: string, content: string) => {
    const { data, error } = await supabase
      .from("messages")
      .update({ content, updated_at: new Date().toISOString() })
      .eq("id", messageId)
      .eq("sender_id", user?.id)
      .select()
      .single();

    if (!error && data) {
      // Обновить сообщение в локальном состоянии
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, content, updated_at: data.updated_at }
            : msg,
        ),
      );
    }

    return { error };
  };

  const deleteMessage = async (messageId: string) => {
    const { error } = await supabase
      .from("messages")
      .update({
        is_deleted: true,
        content: "",
        updated_at: new Date().toISOString(),
      })
      .eq("id", messageId)
      .eq("sender_id", user?.id);

    return { error };
  };

  const addReaction = async (messageId: string, emoji: string) => {
    if (!user) return { error: new Error("Not authenticated") };

    const { error } = await supabase.from("message_reactions").insert({
      message_id: messageId,
      user_id: user.id,
      emoji,
    });

    return { error };
  };

  const removeReaction = async (messageId: string, emoji: string) => {
    if (!user) return { error: new Error("Not authenticated") };

    const { error } = await supabase
      .from("message_reactions")
      .delete()
      .eq("message_id", messageId)
      .eq("user_id", user.id)
      .eq("emoji", emoji);

    return { error };
  };

  const searchMessages = async (query: string): Promise<Message[]> => {
    if (!chatId) return [];

    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("chat_id", chatId)
      .eq("is_deleted", false)
      .ilike("content", `%${query}%`)
      .order("created_at", { ascending: false })
      .limit(50);

    return data || [];
  };

  // Глобальный поиск по всем чатам пользователя
  const searchAllMessages = async (
    query: string,
    userId: string,
  ): Promise<any[]> => {
    if (!query || query.length < 2) return [];

    // Получаем ID чатов пользователя
    const { data: memberData } = await supabase
      .from("chat_members")
      .select("chat_id")
      .eq("user_id", userId);

    const chatIds = memberData?.map((m) => m.chat_id) || [];
    if (chatIds.length === 0) return [];

    const { data } = await supabase
      .from("messages")
      .select("*, chats!inner(name, type)")
      .in("chat_id", chatIds)
      .eq("is_deleted", false)
      .ilike("content", `%${query}%`)
      .order("created_at", { ascending: false })
      .limit(50);

    return data || [];
  };

  return {
    messages,
    loading,
    error,
    hasMore,
    loadingMore,
    loadMore: () => fetchMessages(false),
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    searchMessages,
    searchAllMessages,
  };
}
