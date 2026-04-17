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
  onDelete: (message: Message, deleteForAll: boolean) => void;
  onAddReaction: (messageId: string, emoji: string) => void;
  scrollToMessage?: (messageId: string) => void;
  editingMessage?: Message | null;
  onCancelEdit?: () => void;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  message: Message | null;
}

const emojis = ["👍", "❤️", "😂", "😢", "😮", "🔥", "🎉", "👎"];

const EDIT_DELETE_WINDOW_MS = 24 * 60 * 60 * 1000;

const canEditOrDeleteForAll = (message: Message): boolean => {
  if (!message.created_at) return false;
  const createdAtMs = new Date(message.created_at).getTime();
  if (Number.isNaN(createdAtMs)) return false;
  return Date.now() - createdAtMs <= EDIT_DELETE_WINDOW_MS;
};

// Форматирование даты для разделителя
const formatDateDivider = (date: Date): string => {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  const messageDate = new Date(date);
  messageDate.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const yesterdayDate = new Date(yesterday);
  yesterdayDate.setHours(0, 0, 0, 0);

  if (messageDate.getTime() === today.getTime()) {
    return "Сегодня";
  } else if (messageDate.getTime() === yesterdayDate.getTime()) {
    return "Вчера";
  } else {
    return messageDate.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year:
        messageDate.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  }
};

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
  scrollToMessage: externalScrollToMessage,
  editingMessage,
  onCancelEdit,
}: MessageListProps) {
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    message: null,
  });
  const [contextMenuClosing, setContextMenuClosing] = useState(false);
  const [showReactions, setShowReactions] = useState<string | null>(null);
  const [reactionsClosing, setReactionsClosing] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteForAll, setDeleteForAll] = useState(false);

  const resetDeleteModalState = useCallback(() => {
    setDeleteModalOpen(false);
    setDeleteForAll(false);
  }, []);

  // Внутренняя прокрутка к сообщению по ID
  const internalScrollToMessage = useCallback((messageId: string) => {
    const element = messageRefs.current.get(messageId);
    if (element && listRef.current) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.classList.add("highlighted-message");
      setTimeout(() => {
        element.classList.remove("highlighted-message");
      }, 2000);
    }
  }, []);

  // Используем внешнюю или внутреннюю функцию
  const handleScrollToMessage =
    externalScrollToMessage || internalScrollToMessage;

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
  const handleContextMenu = useCallback(
    (e: React.MouseEvent, message: Message) => {
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
    },
    [],
  );

  const closeContextMenu = useCallback(() => {
    if (!contextMenu.visible || contextMenuClosing) return;

    setContextMenuClosing(true);
    setTimeout(() => {
      setContextMenu({ visible: false, x: 0, y: 0, message: null });
      setContextMenuClosing(false);
    }, 200);
  }, [contextMenu.visible, contextMenuClosing]);

  // Закрываем меню, если курсор ушёл достаточно далеко от него, независимо от элементов под курсором
  useEffect(() => {
    if (!contextMenu.visible || deleteModalOpen) return;

    const closeDistance = 120;

    const handleMouseMove = (e: MouseEvent) => {
      const menuElement = contextMenuRef.current;
      if (!menuElement) return;

      const rect = menuElement.getBoundingClientRect();
      const dx =
        e.clientX < rect.left
          ? rect.left - e.clientX
          : e.clientX > rect.right
            ? e.clientX - rect.right
            : 0;
      const dy =
        e.clientY < rect.top
          ? rect.top - e.clientY
          : e.clientY > rect.bottom
            ? e.clientY - rect.bottom
            : 0;

      if (Math.hypot(dx, dy) > closeDistance) {
        closeContextMenu();
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [contextMenu.visible, deleteModalOpen, closeContextMenu]);

  const isOwnMessage = contextMenu.message?.sender_id === user?.id;
  const canEditDelete =
    !!contextMenu.message && canEditOrDeleteForAll(contextMenu.message);
  const canDeleteForAllOption =
    !!contextMenu.message && isOwnMessage && canEditDelete;

  if (loading) {
    return <div className="messages-loading">Загрузка сообщений...</div>;
  }

  return (
    <div className="messages-list" ref={listRef} onScroll={handleScroll}>
      {loadingMore && <div className="loading-more">Загрузка...</div>}

      {messages.map((message, index) => {
        // Определяем, нужно ли показать разделитель даты
        const prevMessage = messages[index - 1];
        const showDateDivider =
          !prevMessage ||
          new Date(message.created_at).toDateString() !==
            new Date(prevMessage.created_at).toDateString();

        return (
          <React.Fragment key={message.id}>
            {showDateDivider && (
              <div className="date-divider">
                {formatDateDivider(new Date(message.created_at))}
              </div>
            )}
            <div
              ref={(el) => {
                if (el) {
                  messageRefs.current.set(message.id, el);
                } else {
                  messageRefs.current.delete(message.id);
                }
              }}
              className={`message ${message.sender_id === user?.id ? "own" : ""} ${message.is_deleted ? "deleted" : ""}`}
              onContextMenu={(e) => handleContextMenu(e, message)}
            >
              {message.reply_to && message.reply_message && (
                <div
                  className="message-reply"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (message.reply_to) {
                      handleScrollToMessage(message.reply_to);
                    }
                  }}
                  title="Перейти к сообщению"
                >
                  <span className="reply-author">
                    {message.reply_message.sender?.display_name}
                  </span>
                  <span className="reply-content">
                    {message.reply_message.message_type === "image" && (
                      <>
                        <i className="fas fa-image"></i> Фото
                      </>
                    )}
                    {message.reply_message.message_type === "video" && (
                      <>
                        <i className="fas fa-video"></i> Видео
                      </>
                    )}
                    {message.reply_message.message_type === "file" && (
                      <>
                        <i className="fas fa-file"></i>{" "}
                        {message.reply_message.file_name || "Файл"}
                      </>
                    )}
                    {message.reply_message.message_type === "text" &&
                      message.reply_message.content}
                  </span>
                </div>
              )}

              {message.message_type === "text" && (
                <div className="message-content">{message.content}</div>
              )}

              <div className="message-footer">
                <span className="message-time">
                  {new Date(message.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
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
                    message.reactions.reduce(
                      (acc: Record<string, number>, r) => {
                        acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                        return acc;
                      },
                      {},
                    ),
                  ).map(([emoji, count]) => (
                    <span key={emoji} className="reaction">
                      {emoji} {count}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </React.Fragment>
        );
      })}

      <div ref={messagesEndRef} />

      {/* Контекстное меню */}
      {contextMenu.visible && contextMenu.message && (
        <div
          ref={contextMenuRef}
          className={`context-menu ${contextMenuClosing ? "closing" : ""}`}
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              onReply(contextMenu.message!);
              closeContextMenu();
            }}
          >
            <i className="fas fa-reply"></i> Ответить
          </button>

          <button
            onClick={() => {
              setShowReactions(contextMenu.message!.id);
              closeContextMenu();
            }}
          >
            <i className="far fa-smile"></i> Реакция
          </button>

          {isOwnMessage && canEditDelete && (
            <>
              <button
                onClick={() => {
                  onEdit(contextMenu.message!);
                  closeContextMenu();
                }}
              >
                <i className="fas fa-edit"></i> Изменить
              </button>
              <button
                className="danger"
                onClick={() => {
                  setDeleteForAll(false);
                  setDeleteModalOpen(true);
                }}
              >
                <i className="fas fa-trash"></i> Удалить
              </button>
            </>
          )}
        </div>
      )}

      {/* Модалка подтверждения удаления */}
      {deleteModalOpen && contextMenu.message && (
        <div
          className="modal-overlay"
          onClick={() => {
            resetDeleteModalState();
          }}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Удалить сообщение?</h3>
            <label
              className={`checkbox-label ${!canDeleteForAllOption ? "disabled" : ""}`}
            >
              <input
                type="checkbox"
                checked={deleteForAll}
                disabled={!canDeleteForAllOption}
                onChange={(e) => setDeleteForAll(e.target.checked)}
              />
              Удалить у всех
            </label>
            <div className="modal-actions">
              <button
                className="danger"
                onClick={() => {
                  onDelete(contextMenu.message!, deleteForAll);
                  resetDeleteModalState();
                  closeContextMenu();
                }}
              >
                Удалить
              </button>
              <button
                onClick={() => {
                  resetDeleteModalState();
                  closeContextMenu();
                }}
              >
                Отмена
              </button>
            </div>
          </div>
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
          <div
            className={`reactions-picker ${reactionsClosing ? "closing" : ""}`}
            onClick={(e) => e.stopPropagation()}
          >
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
