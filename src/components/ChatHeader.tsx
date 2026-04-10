import React from "react";
import { Chat } from "../types";
import { useUserStatus } from "../hooks/useUserStatus";

interface ChatHeaderProps {
  chat: Chat | null;
}

export function ChatHeader({ chat }: ChatHeaderProps) {
  const isGroup = chat?.type === "group";
  const otherMember = chat?.other_member;
  const otherUserId = otherMember?.id;

  const { getStatusText } = useUserStatus(otherUserId);

  if (!chat) return null;

  const title = isGroup 
    ? chat.name 
    : (otherMember?.display_name || otherMember?.username || otherMember?.email || "Диалог");

  const statusText = isGroup 
    ? `${chat.members?.length || 0} участников`
    : getStatusText();

  return (
    <div className="chat-header">
      <div className="chat-header-main">
        <div className="chat-header-name">{title}</div>
        <div className={`chat-header-status ${!isGroup && otherMember?.status === "online" ? "online" : ""}`}>
          {statusText}
        </div>
      </div>
      <button className="chat-header-search" title="Поиск в чате">
        <i className="fas fa-search"></i>
      </button>
    </div>
  );
}
