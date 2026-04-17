import React, { useState, useRef, useEffect } from "react";
import { useMedia } from "../hooks/useMedia";
import { Message } from "../types";

interface MessageInputProps {
  onSend: (
    content: string,
    type: Message["message_type"],
    fileUrl?: string,
    fileName?: string,
    replyTo?: string,
  ) => Promise<void>;
  onEdit?: (messageId: string, content: string) => Promise<unknown>;
  replyingTo?: Message | null;
  onCancelReply?: () => void;
  editingMessage?: Message | null;
  onCancelEdit?: () => void;
  disabled?: boolean;
}

export function MessageInput({
  onSend,
  onEdit,
  replyingTo,
  onCancelReply,
  editingMessage,
  onCancelEdit,
  disabled,
}: MessageInputProps) {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { uploading, progress, uploadImage, uploadVideo, uploadFile } =
    useMedia();

  // При начале редактирования устанавливаем текст и фокус
  useEffect(() => {
    if (editingMessage) {
      setContent(editingMessage.content);
      inputRef.current?.focus();
    }
  }, [editingMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || sending || disabled) return;

    setSending(true);
    try {
      if (editingMessage && onEdit) {
        await onEdit(editingMessage.id, content.trim());
        onCancelEdit?.();
      } else {
        await onSend(content.trim(), "text");
      }
      setContent("");
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let result;
    if (file.type.startsWith("image/")) {
      result = await uploadImage(file);
      if (result) {
        await onSend("", "image", result.url, result.name);
      }
    } else if (file.type.startsWith("video/")) {
      result = await uploadVideo(file);
      if (result) {
        await onSend("", "video", result.url, result.name);
      }
    } else {
      result = await uploadFile(file);
      if (result) {
        await onSend("", "file", result.url, result.name);
      }
    }

    // Сброс input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="message-input-container">
      {/* Edit indicator */}
      {editingMessage && (
        <div className="edit-indicator">
          <span>
            <i className="fas fa-edit"></i> Редактирование сообщения
          </span>
          <button onClick={onCancelEdit}>
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}

      {/* Reply indicator */}
      {replyingTo && !editingMessage && (
        <div className="reply-indicator">
          <span>
            <i className="fas fa-reply"></i> Ответ на:{" "}
            {replyingTo.sender?.display_name}
            {replyingTo.message_type === "image" && (
              <span className="reply-media-preview">
                <i className="fas fa-image"></i> Фото
              </span>
            )}
            {replyingTo.message_type === "video" && (
              <span className="reply-media-preview">
                <i className="fas fa-video"></i> Видео
              </span>
            )}
            {replyingTo.message_type === "file" && (
              <span className="reply-media-preview">
                <i className="fas fa-file"></i> {replyingTo.file_name || "Файл"}
              </span>
            )}
            {replyingTo.message_type === "text" && (
              <span className="reply-content-preview">
                {replyingTo.content.slice(0, 50)}
                {replyingTo.content.length > 50 ? "..." : ""}
              </span>
            )}
          </span>
          <button onClick={onCancelReply}>
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}

      {/* Progress bar */}
      {uploading && progress && (
        <div className="upload-progress">
          <div
            className="progress-bar"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      )}

      <form onSubmit={handleSubmit} className="message-input-form">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading || !!editingMessage}
          title="Прикрепить файл"
        >
          <i className="fas fa-paperclip"></i>
        </button>

        <input
          ref={inputRef}
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={
            editingMessage
              ? "Редактирование сообщения..."
              : "Введите сообщение..."
          }
          disabled={disabled || sending}
        />

        <button
          type="submit"
          disabled={!content.trim() || sending || disabled}
          title={editingMessage ? "Сохранить" : "Отправить"}
        >
          {sending ? (
            <i className="fas fa-spinner fa-spin"></i>
          ) : editingMessage ? (
            <i className="fas fa-check"></i>
          ) : (
            <i className="fas fa-paper-plane"></i>
          )}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          style={{ display: "none" }}
          accept="image/*,video/*,.pdf,.json,.txt"
        />
      </form>
    </div>
  );
}
