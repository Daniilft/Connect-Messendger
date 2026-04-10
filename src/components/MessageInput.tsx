import React, { useState, useRef } from "react";
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
  replyingTo?: Message | null;
  onCancelReply?: () => void;
  disabled?: boolean;
}

export function MessageInput({
  onSend,
  replyingTo,
  onCancelReply,
  disabled,
}: MessageInputProps) {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploading, progress, uploadImage, uploadVideo, uploadFile } =
    useMedia();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || sending || disabled) return;

    setSending(true);
    try {
      await onSend(content.trim(), "text");
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
      {/* Reply indicator */}
      {replyingTo && (
        <div className="reply-indicator">
          <span>
            <i className="fas fa-reply"></i> Ответ на:{" "}
            {replyingTo.sender?.display_name}
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
          disabled={disabled || uploading}
          title="Прикрепить файл"
        >
          <i className="fas fa-paperclip"></i>
        </button>

        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Введите сообщение..."
          disabled={disabled || sending}
        />

        <button
          type="submit"
          disabled={!content.trim() || sending || disabled}
          title="Отправить"
        >
          {sending ? (
            <i className="fas fa-spinner fa-spin"></i>
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
