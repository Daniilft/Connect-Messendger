import React from "react";
import { Chat } from "../types";

interface ChatListProps {
  chats: Chat[];
  selectedChatId: string | null;
  onSelectChat: (chatId: string) => void;
  loading: boolean;
}

export function ChatList({
  chats,
  selectedChatId,
  onSelectChat,
  loading,
}: ChatListProps) {
  if (loading) {
    return (
      <div className="chat-list-empty">
        <i className="fas fa-spinner fa-spin"></i> Загрузка...
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <div className="chat-list-empty">
        <i className="fas fa-comments"></i> Нет чатов
      </div>
    );
  }

  return (
    <div className="chat-list">
      {chats.map((chat) => (
        <div
          key={chat.id}
          className={`chat-item ${selectedChatId === chat.id ? "active" : ""}`}
          onClick={() => onSelectChat(chat.id)}
        >
          <div className="chat-avatar">
            <i
              className={chat.type === "group" ? "fas fa-users" : "fas fa-user"}
            ></i>
          </div>
          <div className="chat-info">
            <div className="chat-name">
              {chat.type === "group"
                ? chat.name
                : chat.other_member?.display_name ||
                  chat.other_member?.username ||
                  chat.other_member?.email ||
                  "Диалог"}
            </div>
            {chat.last_message && (
              <div className="chat-last-message">
                {chat.last_message.content.slice(0, 50)}
                {chat.last_message.content.length > 50 ? "..." : ""}
              </div>
            )}
          </div>
          {chat.unread_count && chat.unread_count > 0 && (
            <div className="chat-unread">{chat.unread_count}</div>
          )}
        </div>
      ))}
    </div>
  );
}
