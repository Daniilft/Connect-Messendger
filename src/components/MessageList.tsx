import React, { useRef, useEffect, useState, useCallback } from "react";
import { Message } from "../types";
import { useAuth } from "../context/AuthContext";

interface MessageListProps {
  messages: Message[];
  loading: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onReply: (message: Message) => void;
  onEdit: (message: Message) => void;
  onDelete: (message: Message) => void;
  onAddReaction: (messageId: string, emoji: string) => void;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  message: Message | null;
}

const emojis = ["👍", "❤️", "😂", "😢", "😮", "🔥", "🎉", "👎"];

export function MessageList({
  messages,
  loading,
  hasMore,
  loadingMore,
  onLoadMore,
  onReply,
  onEdit,
  onDelete,
  onAddReaction,
}: MessageListProps) {
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    message: null,
  });
  const [contextMenuClosing, setContextMenuClosing] = useState(false);
  const [showReactions, setShowReactions] = useState<string | null>(null);
  const [reactionsClosing, setReactionsClosing] = useState(false);

  // Скролл вниз при новых сообщениях
  useEffect(() => {
    if (!loading && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, loading]);

  // Бесконечная загрузка
  const handleScroll = () => {
    if (!listRef.current || loadingMore || !hasMore) return;

    const { scrollTop } = listRef.current;
    if (scrollTop < 100) {
      onLoadMore();
    }
  };

  // Контекстное меню - с учётом границ экрана
  const handleContextMenu = useCallback((e: React.MouseEvent, message: Message) => {
    e.preventDefault();
    
    const menuWidth = 180;
    const menuHeight = 160;
    const padding = 10;
    
    let x = e.clientX;
    let y = e.clientY;
    
    // Не выходить за правый край
    if (x + menuWidth > window.innerWidth - padding) {
      x = window.innerWidth - menuWidth - padding;
    }
    
    // Не выходить за нижний край
    if (y + menuHeight > window.innerHeight - padding) {
      y = window.innerHeight - menuHeight - padding;
    }
    
    setContextMenu({
      visible: true,
      x,
      y,
      message,
    });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenuClosing(true);
    setTimeout(() => {
      setContextMenu({ visible: false, x: 0, y: 0, message: null });
      setContextMenuClosing(false);
    }, 200);
  }, []);

  const isOwnMessage = contextMenu.message?.sender_id === user?.id;

  if (loading) {
    return <div className="messages-loading">Загрузка сообщений...</div>;
  }

  return (
    <div className="messages-list" ref={listRef} onScroll={handleScroll}>
      {loadingMore && <div className="loading-more">Загрузка...</div>}

      {messages.map((message) => (
        <div
          key={message.id}
          className={`message ${message.sender_id === user?.id ? "own" : ""} ${message.is_deleted ? "deleted" : ""}`}
          onContextMenu={(e) => handleContextMenu(e, message)}
        >
          {message.reply_to && message.reply_message && (
            <div className="message-reply">
              <span className="reply-author">
                {message.reply_message.sender?.display_name}
              </span>
              <span className="reply-content">
                {message.reply_message.content}
              </span>
            </div>
          )}

          {message.message_type === "text" && (
            <div className="message-content">{message.content}</div>
          )}

          <div className="message-footer">
            <span className="message-time">
              {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {message.updated_at !== message.created_at && (
              <span className="message-edited">(изменено)</span>
            )}
          </div>

          {message.message_type === "image" && message.file_url && (
            <div className="message-image">
              <img
                src={message.file_url}
                alt={message.file_name || undefined}
              />
            </div>
          )}

          {message.message_type === "video" && message.file_url && (
            <div className="message-video">
              <video controls src={message.file_url}>
                <track kind="captions" />
              </video>
            </div>
          )}

          {message.message_type === "file" && message.file_url && (
            <a
              href={message.file_url}
              className="message-file"
              download={message.file_name || undefined}
            >
              📎 {message.file_name}
            </a>
          )}

          {/* Реакции */}
          {message.reactions && message.reactions.length > 0 && (
            <div className="message-reactions">
              {Object.entries(
                message.reactions.reduce((acc: Record<string, number>, r) => {
                  acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                  return acc;
                }, {}),
              ).map(([emoji, count]) => (
                <span key={emoji} className="reaction">
                  {emoji} {count}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}

      <div ref={messagesEndRef} />

      {/* Контекстное меню */}
      {contextMenu.visible && contextMenu.message && (
        <div
          className={`context-menu ${contextMenuClosing ? "closing" : ""}`}
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
          onMouseLeave={closeContextMenu}
        >
          <button onClick={() => { onReply(contextMenu.message!); closeContextMenu(); }}>
            <i className="fas fa-reply"></i> Ответить
          </button>
          
          <button onClick={() => { setShowReactions(contextMenu.message!.id); closeContextMenu(); }}>
            <i className="far fa-smile"></i> Реакция
          </button>
          
          {isOwnMessage && (
            <>
              <button onClick={() => { onEdit(contextMenu.message!); closeContextMenu(); }}>
                <i className="fas fa-edit"></i> Изменить
              </button>
              <button className="danger" onClick={() => { onDelete(contextMenu.message!); closeContextMenu(); }}>
                <i className="fas fa-trash"></i> Удалить
              </button>
            </>
          )}
        </div>
      )}

      {/* Выбор реакций */}
      {showReactions && (
        <div 
          className={`reactions-picker-overlay ${reactionsClosing ? "closing" : ""}`}
          onClick={() => {
            setReactionsClosing(true);
            setTimeout(() => {
              setShowReactions(null);
              setReactionsClosing(false);
            }, 200);
          }}
        >
          <div className={`reactions-picker ${reactionsClosing ? "closing" : ""}`} onClick={(e) => e.stopPropagation()}>
            {emojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  onAddReaction(showReactions, emoji);
                  setReactionsClosing(true);
                  setTimeout(() => {
                    setShowReactions(null);
                    setReactionsClosing(false);
                  }, 200);
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
