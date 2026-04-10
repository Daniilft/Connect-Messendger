import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { CustomScript, ScriptExecution } from '../types';

export function useCustomScripts() {
  const { user } = useAuth();
  const [scripts, setScripts] = useState<CustomScript[]>([]);
  const [publicScripts, setPublicScripts] = useState<CustomScript[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchScripts = useCallback(async () => {
    if (!user) return;

    setLoading(true);

    // Свои скрипты
    const { data: ownScripts, error: ownError } = await supabase
      .from('custom_scripts')
      .select(`
        *,
        author:profiles(id, display_name)
      `)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    // Публичные скрипты
    const { data: pubScripts, error: pubError } = await supabase
      .from('custom_scripts')
      .select(`
        *,
        author:profiles(id, display_name)
      `)
      .eq('is_public', true)
      .neq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (ownError || pubError) {
      setError(ownError || pubError);
    } else {
      setScripts(ownScripts || []);
      setPublicScripts(pubScripts || []);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchScripts();
  }, [fetchScripts]);

  // Проверить уникальность имени
  const checkNameUnique = async (name: string): Promise<boolean> => {
    const { data } = await supabase
      .from('custom_scripts')
      .select('id')
      .ilike('name', name)
      .limit(1);

    return !data || data.length === 0;
  };

  // Создать скрипт
  const createScript = async (
    name: string,
    code: string,
    description?: string,
    isPublic = false
  ): Promise<{ script: CustomScript | null; error: Error | null }> => {
    if (!user) return { script: null, error: new Error('Not authenticated') };

    // Проверяем уникальность имени
    const isUnique = await checkNameUnique(name);
    if (!isUnique) {
      return { script: null, error: new Error('Script name already exists') };
    }

    const { data, error } = await supabase
      .from('custom_scripts')
      .insert({
        user_id: user.id,
        name,
        code,
        description: description || null,
        is_public: isPublic,
      })
      .select(`
        *,
        author:profiles(id, display_name)
      `)
      .single();

    if (!error && data) {
      setScripts(prev => [data, ...prev]);
    }

    return { script: data, error };
  };

  // Обновить скрипт
  const updateScript = async (
    scriptId: string,
    updates: Partial<Pick<CustomScript, 'name' | 'code' | 'description' | 'is_public'>>
  ): Promise<{ error: Error | null }> => {
    // Если меняем имя, проверяем уникальность
    if (updates.name) {
      const isUnique = await checkNameUnique(updates.name);
      if (!isUnique) {
        return { error: new Error('Script name already exists') };
      }
    }

    const { error } = await supabase
      .from('custom_scripts')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', scriptId)
      .eq('user_id', user?.id);

    if (!error) {
      setScripts(prev =>
        prev.map(s =>
          s.id === scriptId ? { ...s, ...updates } : s
        )
      );
    }

    return { error };
  };

  // Удалить скрипт
  const deleteScript = async (scriptId: string): Promise<{ error: Error | null }> => {
    const { error } = await supabase
      .from('custom_scripts')
      .delete()
      .eq('id', scriptId)
      .eq('user_id', user?.id);

    if (!error) {
      setScripts(prev => prev.filter(s => s.id !== scriptId));
    }

    return { error };
  };

  // Выполнить скрипт (через Edge Function)
  const executeScript = async (
    scriptId: string,
    input: Record<string, unknown> = {}
  ): Promise<ScriptExecution | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('execute-script', {
        body: { script_id: scriptId, input },
      });

      if (error) throw error;
      return data;
    } catch (err) {
      setError(err as Error);
      return null;
    }
  };

  return {
    scripts,
    publicScripts,
    loading,
    error,
    checkNameUnique,
    createScript,
    updateScript,
    deleteScript,
    executeScript,
    refetch: fetchScripts,
  };
}