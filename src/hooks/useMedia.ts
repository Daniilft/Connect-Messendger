import { useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100 MB

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export function useMedia() {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const uploadMedia = useCallback(async (
    file: File,
    type: 'image' | 'video' | 'file'
  ): Promise<{ url: string; name: string; size: number } | null> => {
    if (!user) {
      setError(new Error('Not authenticated'));
      return null;
    }

    // Проверка размера
    const maxSize = type === 'image' ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
    if (file.size > maxSize) {
      setError(new Error(`File too large. Max size: ${maxSize / 1024 / 1024}MB`));
      return null;
    }

    setUploading(true);
    setError(null);
    setProgress({ loaded: 0, total: file.size, percentage: 0 });

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    const { data, error: uploadError } = await supabase.storage
      .from('messages-media')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });

    setUploading(false);
    setProgress(null);

    if (uploadError) {
      setError(uploadError);
      return null;
    }

    // Получаем публичный URL
    const { data: { publicUrl } } = supabase.storage
      .from('messages-media')
      .getPublicUrl(filePath);

    return {
      url: publicUrl,
      name: file.name,
      size: file.size,
    };
  }, [user]);

  const uploadImage = (file: File) => uploadMedia(file, 'image');
  const uploadVideo = (file: File) => uploadMedia(file, 'video');
  const uploadFile = (file: File) => uploadMedia(file, 'file');

  const deleteMedia = async (filePath: string) => {
    const { error } = await supabase.storage
      .from('messages-media')
      .remove([filePath]);

    return { error };
  };

  return {
    uploading,
    progress,
    error,
    uploadImage,
    uploadVideo,
    uploadFile,
    deleteMedia,
  };
}