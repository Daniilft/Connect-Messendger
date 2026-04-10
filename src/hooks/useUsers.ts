import { useState, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { Profile } from "../types";

export function useUsers() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const searchUsers = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setUsers([]);
      setChannels([]);
      return;
    }

    setLoading(true);

    // Поиск пользователей по точному username
    const { data: usersData } = await supabase
      .from("profiles")
      .select("*")
      .eq("username", query)
      .limit(10);

    // Поиск каналов по названию
    const { data: channelsData } = await supabase
      .from("chats")
      .select("*")
      .eq("type", "channel")
      .or(`name.ilike.%${query}%`)
      .limit(10);

    setLoading(false);

    setUsers(usersData || []);
    setChannels(channelsData || []);
  }, []);

  const getUserById = async (userId: string): Promise<Profile | null> => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    return data;
  };

  return {
    users,
    channels,
    loading,
    searchUsers,
    getUserById,
  };
}
