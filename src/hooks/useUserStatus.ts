import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { UserStatus } from "../types";

export function useUserStatus(userId: string | undefined) {
  const [status, setStatus] = useState<UserStatus>("offline");
  const [lastSeen, setLastSeen] = useState<string | null>(null);

  // Обновить статус при входе/выходе
  const updateOnlineStatus = useCallback(async (isOnline: boolean) => {
    if (!userId) return;

    await supabase
      .from("profiles")
      .update({
        status: isOnline ? "online" : "offline",
        last_seen: isOnline ? null : new Date().toISOString(),
      })
      .eq("id", userId);
  }, [userId]);

  // Слушать изменения статуса других пользователей
  useEffect(() => {
    if (!userId) return;

    // Подписка на изменения профиля
    const channel = supabase
      .channel(`user-status-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          const newStatus = payload.new.status as UserStatus;
          const newLastSeen = payload.new.last_seen as string | null;
          setStatus(newStatus);
          setLastSeen(newLastSeen);
        }
      )
      .subscribe();

    // Получить текущий статус
    const fetchStatus = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("status, last_seen")
        .eq("id", userId)
        .single();

      if (data) {
        setStatus(data.status as UserStatus);
        setLastSeen(data.last_seen);
      }
    };

    fetchStatus();

    // Periodic refresh для статуса
    const interval = setInterval(fetchStatus, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [userId]);

  // Форматировать last_seen
  const formatLastSeen = useCallback(() => {
    if (!lastSeen) return null;

    const diff = Date.now() - new Date(lastSeen).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "был(а) только что";
    if (minutes < 60) return `был(а) ${minutes} мин. назад`;
    if (hours < 24) return `был(а) ${hours} ч. назад`;
    return `был(а) ${days} дн. назад`;
  }, [lastSeen]);

  // Получить текст статуса
  const getStatusText = useCallback(() => {
    switch (status) {
      case "online":
        return "в сети";
      case "typing":
        return "печатает...";
      case "offline":
      default:
        return formatLastSeen() || "не в сети";
    }
  }, [status, formatLastSeen]);

  return {
    status,
    lastSeen,
    getStatusText,
    updateOnlineStatus,
  };
}
