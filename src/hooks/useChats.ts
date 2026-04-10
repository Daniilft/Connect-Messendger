import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { Chat, ChatWithMembers } from "../types";

export function useChats() {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchChats = useCallback(async () => {
    if (!user) return;

    setLoading(true);

    // Сначала получаем ID чатов пользователя
    const { data: memberData, error: memberError } = await supabase
      .from("chat_members")
      .select("chat_id")
      .eq("user_id", user.id);

    if (memberError) {
      setError(memberError);
      setLoading(false);
      return;
    }

    const chatIds = memberData?.map((m) => m.chat_id) || [];

    if (chatIds.length === 0) {
      setChats([]);
      setLoading(false);
      return;
    }

    // Получаем чаты (без вложенного join)
    const { data: chatsData, error: chatsError } = await supabase
      .from("chats")
      .select("*")
      .in("id", chatIds)
      .order("updated_at", { ascending: false });

    if (chatsError) {
      setError(chatsError);
    } else {
      // Получаем всех участников этих чатов (только свои поля)
      const { data: membersData } = await supabase
        .from("chat_members")
        .select("chat_id, user_id")
        .in("chat_id", chatIds);

      // Получаем уникальные ID пользователей (кроме себя)
      const userIdsArray = (membersData || [])
        .filter((m: any) => m.user_id !== user.id)
        .map((m: any) => m.user_id);
      const otherUserIds: string[] = [];
      const seen = new Set<string>();
      userIdsArray.forEach((id: string) => {
        if (!seen.has(id)) {
          seen.add(id);
          otherUserIds.push(id);
        }
      });

      // Получаем профили других пользователей
      let profilesMap: Record<string, any> = {};
      if (otherUserIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, email, display_name, username")
          .in("id", otherUserIds);

        (profilesData || []).forEach((p: any) => {
          profilesMap[p.id] = p;
        });
      }

      // Привязываем участников к чатам
      const chatsWithMembers = (chatsData || []).map((chat: any) => {
        const otherMember = (membersData || []).find(
          (m: any) => m.chat_id === chat.id && m.user_id !== user.id,
        );
        return {
          ...chat,
          other_member: otherMember
            ? profilesMap[otherMember.user_id] || null
            : null,
        };
      });

      setChats(chatsWithMembers);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchChats();

    // Подписка на изменения чатов через realtime
    if (!user) return;

    const channel = supabase
      .channel("chats-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_members",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchChats();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchChats]);

  // Создать диалог с пользователем
  const createDirectChat = async (otherUserId: string) => {
    if (!user) return { error: new Error("Not authenticated") };

    // Проверяем, есть ли уже диалог между этими пользователями
    // Ищем чаты типа direct, где оба пользователя являются участниками
    const { data: myChats } = await supabase
      .from("chat_members")
      .select("chat_id")
      .eq("user_id", user.id);

    const myChatIds = myChats?.map((m) => m.chat_id) || [];

    if (myChatIds.length > 0) {
      const { data: existingChats } = await supabase
        .from("chats")
        .select(
          `
          id,
          chat_members!inner(user_id)
        `,
        )
        .eq("type", "direct")
        .in("id", myChatIds);

      // Ищем чат где есть оба пользователя
      const existingChat = existingChats?.find((chat: any) =>
        chat.chat_members?.some((m: any) => m.user_id === otherUserId),
      );

      if (existingChat) {
        return { chatId: existingChat.id, error: null };
      }
    }

    // Создаём новый диалог
    const { data: chat, error } = await supabase
      .from("chats")
      .insert({
        type: "direct",
        created_by: user.id,
      })
      .select()
      .single();

    if (error) return { error };

    // Добавляем участников
    const { error: membersError } = await supabase.from("chat_members").insert([
      { chat_id: chat.id, user_id: user.id, role: "admin" },
      { chat_id: chat.id, user_id: otherUserId, role: "member" },
    ]);

    if (membersError) return { error: membersError };

    return { chatId: chat.id, error: null };
  };

  // Создать группу
  const createGroupChat = async (name: string, memberIds: string[]) => {
    if (!user) return { error: new Error("Not authenticated") };

    const { data: chat, error } = await supabase
      .from("chats")
      .insert({
        type: "group",
        name,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) return { error };

    // Добавляем участников
    const members = [
      { chat_id: chat.id, user_id: user.id, role: "admin" as const },
      ...memberIds.map((id) => ({
        chat_id: chat.id,
        user_id: id,
        role: "member" as const,
      })),
    ];

    const { error: membersError } = await supabase
      .from("chat_members")
      .insert(members);

    if (membersError) return { error: membersError };

    return { chatId: chat.id, error: null };
  };

  // Получить информацию о чате с участниками
  const getChatWithMembers = async (
    chatId: string,
  ): Promise<ChatWithMembers | null> => {
    const { data, error } = await supabase
      .from("chats")
      .select(
        `
        *,
        members(
          id, chat_id, user_id, role, joined_at,
          profile:profiles(id, email, display_name, created_at)
        )
      `,
      )
      .eq("id", chatId)
      .single();

    if (error) return null;
    return data;
  };

  // Добавить участника в группу
  const addMember = async (chatId: string, userId: string) => {
    const { error } = await supabase.from("chat_members").insert({
      chat_id: chatId,
      user_id: userId,
      role: "member",
    });

    return { error };
  };

  // Удалить участника из группы
  const removeMember = async (chatId: string, userId: string) => {
    const { error } = await supabase
      .from("chat_members")
      .delete()
      .eq("chat_id", chatId)
      .eq("user_id", userId);

    return { error };
  };

  // Переименовать группу
  const renameChat = async (chatId: string, name: string) => {
    const { error } = await supabase
      .from("chats")
      .update({ name })
      .eq("id", chatId);

    return { error };
  };

  // Покинуть чат
  const leaveChat = async (chatId: string) => {
    if (!user) return { error: new Error("Not authenticated") };

    const { error } = await supabase
      .from("chat_members")
      .delete()
      .eq("chat_id", chatId)
      .eq("user_id", user.id);

    return { error };
  };

  return {
    chats,
    loading,
    error,
    createDirectChat,
    createGroupChat,
    getChatWithMembers,
    addMember,
    removeMember,
    renameChat,
    leaveChat,
    refetch: fetchChats,
  };
}
