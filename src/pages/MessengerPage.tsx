import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useChats } from "../hooks/useChats";
import { useMessages } from "../hooks/useMessages";
import { useUsers } from "../hooks/useUsers";
import { ChatList } from "../components/ChatList";
import { MessageList } from "../components/MessageList";
import { MessageInput } from "../components/MessageInput";
import { ChatHeader } from "../components/ChatHeader";
import { Message, Profile } from "../types";

interface MessengerPageProps {
  onOpenSettings: () => void;
}

type SearchTab = "chats" | "messages" | "channels";

export function MessengerPage({ onOpenSettings }: MessengerPageProps) {
  const { user } = useAuth();
  const { chats, createDirectChat, loading: chatsLoading } = useChats();
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  const {
    messages,
    loading: messagesLoading,
    hasMore,
    loadingMore,
    loadMore,
    sendMessage,
    editMessage,
    deleteMessageForAll,
    deleteMessageForMe,
    addReaction,
  } = useMessages(selectedChatId);

  const {
    searchUsers,
    users: searchResults,
    channels: channelResults,
    loading: usersLoading,
  } = useUsers();

  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchTab, setSearchTab] = useState<SearchTab>("chats");
  const [searchedMessages, setSearchedMessages] = useState<any[]>([]);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Поиск сообщений (отдельная функция)
  const handleSearchMessages = useCallback(
    async (query: string) => {
      if (!user || query.length < 2) {
        setSearchedMessages([]);
        return;
      }

      // Импортируем supabase напрямую для поиска
      const { supabase } = await import("../supabaseClient");

      // Получаем ID чатов пользователя
      const { data: memberData } = await supabase
        .from("chat_members")
        .select("chat_id")
        .eq("user_id", user.id);

      const chatIds = memberData?.map((m) => m.chat_id) || [];
      if (chatIds.length === 0) return;

      const { data } = await supabase
        .from("messages")
        .select("*, chats!inner(name, type)")
        .in("chat_id", chatIds)
        .eq("is_deleted", false)
        .ilike("content", `%${query}%`)
        .order("created_at", { ascending: false })
        .limit(50);

      setSearchedMessages(data || []);
    },
    [user],
  );

  // Debounced поиск
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.length >= 2) {
      setShowSearchResults(true);
      searchUsers(searchQuery);

      // Debounced поиск сообщений
      searchTimeoutRef.current = setTimeout(() => {
        handleSearchMessages(searchQuery);
      }, 300);
    } else {
      setShowSearchResults(false);
      setSearchedMessages([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, searchUsers, handleSearchMessages]);

  // Обработчики сообщений
  const handleSend = async (
    content: string,
    type: Message["message_type"],
    fileUrl?: string,
    fileName?: string,
  ) => {
    if (editingMessage) {
      await editMessage(editingMessage.id, content);
      setEditingMessage(null);
    } else {
      await sendMessage(content, type, fileUrl, fileName, replyingTo?.id);
    }
    setReplyingTo(null);
  };

  const handleReply = (message: Message) => {
    setReplyingTo(message);
    setEditingMessage(null);
  };

  const handleEdit = (message: Message) => {
    setEditingMessage(message);
    setReplyingTo(null);
  };

  const handleDelete = async (message: Message, deleteForAll: boolean) => {
    if (deleteForAll) {
      await deleteMessageForAll(message.id);
    } else {
      await deleteMessageForMe(message.id);
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    await addReaction(messageId, emoji);
  };

  // Выбор чата из списка
  const handleSelectChat = (chatId: string) => {
    setSelectedChatId(chatId);
    setSearchQuery("");
    setShowSearchResults(false);
  };

  // Выбор чата из результатов поиска
  const handleSelectChatFromSearch = (chatId: string) => {
    setSelectedChatId(chatId);
    setSearchQuery("");
    setShowSearchResults(false);
  };

  // Создать чат с пользователем
  const handleCreateChatWithUser = async (userId: string) => {
    const { chatId } = await createDirectChat(userId);
    if (chatId) {
      setSelectedChatId(chatId);
      setSearchQuery("");
      setShowSearchResults(false);
    }
  };

  // Найти чат по сообщению из поиска
  const getChatById = (chatId: string) => {
    return chats.find((c) => c.id === chatId);
  };

  return (
    <div className="messenger-page">
      {/* Sidebar */}
      <div className="sidebar">
        {/* Поиск */}
        <div className="sidebar-search">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Поиск..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() =>
              searchQuery.length >= 2 && setShowSearchResults(true)
            }
          />
          {searchQuery && (
            <button
              className="clear-search"
              onClick={() => {
                setSearchQuery("");
                setShowSearchResults(false);
              }}
            >
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>

        {/* Результаты поиска */}
        {showSearchResults && (
          <div className="search-results">
            {/* Табы поиска */}
            <div className="search-tabs">
              <button
                className={searchTab === "chats" ? "active" : ""}
                onClick={() => setSearchTab("chats")}
              >
                <i className="fas fa-comments"></i> Чаты
              </button>
              <button
                className={searchTab === "messages" ? "active" : ""}
                onClick={() => setSearchTab("messages")}
              >
                <i className="fas fa-envelope"></i> Сообщения
              </button>
              <button
                className={searchTab === "channels" ? "active" : ""}
                onClick={() => setSearchTab("channels")}
              >
                <i className="fas fa-broadcast-tower"></i> Каналы
              </button>
            </div>

            {usersLoading ? (
              <div className="search-result-item">
                <i className="fas fa-spinner fa-spin"></i> Поиск...
              </div>
            ) : (
              <>
                {/* Чаты + Пользователи */}
                {searchTab === "chats" && (
                  <div className="search-section">
                    {/* Существующие чаты */}
                    {chats
                      .filter(
                        (c) =>
                          c.name
                            ?.toLowerCase()
                            .includes(searchQuery.toLowerCase()) ||
                          c.other_member?.display_name
                            ?.toLowerCase()
                            .includes(searchQuery.toLowerCase()) ||
                          c.other_member?.username
                            ?.toLowerCase()
                            .includes(searchQuery.toLowerCase()),
                      )
                      .map((chat) => (
                        <div
                          key={chat.id}
                          className="search-result-item"
                          onClick={() => handleSelectChatFromSearch(chat.id)}
                        >
                          <div className="chat-avatar">
                            <i
                              className={
                                chat.type === "group"
                                  ? "fas fa-users"
                                  : "fas fa-user"
                              }
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
                          </div>
                        </div>
                      ))}

                    {/* Пользователи (для создания нового чата) */}
                    {searchResults
                      .filter((u) => u.id !== user?.id)
                      .map((u: Profile) => (
                        <div
                          key={u.id}
                          className="search-result-item"
                          onClick={() => handleCreateChatWithUser(u.id)}
                        >
                          <div className="chat-avatar">
                            <i className="fas fa-user-plus"></i>
                          </div>
                          <div className="chat-info">
                            <div className="chat-name">
                              {u.display_name || u.email}
                            </div>
                            {u.username && (
                              <div className="chat-username">@{u.username}</div>
                            )}
                          </div>
                        </div>
                      ))}

                    {chats.filter(
                      (c) =>
                        c.name
                          ?.toLowerCase()
                          .includes(searchQuery.toLowerCase()) ||
                        c.other_member?.display_name
                          ?.toLowerCase()
                          .includes(searchQuery.toLowerCase()),
                    ).length === 0 &&
                      searchResults.filter((u) => u.id !== user?.id).length ===
                        0 && (
                        <div className="search-result-item empty">
                          <i className="fas fa-search"></i> Чаты не найдены
                        </div>
                      )}
                  </div>
                )}

                {/* Сообщения */}
                {searchTab === "messages" && (
                  <div className="search-section">
                    {searchedMessages.map((msg) => {
                      const chat = getChatById(msg.chat_id);
                      return (
                        <div
                          key={msg.id}
                          className="search-result-item"
                          onClick={() =>
                            handleSelectChatFromSearch(msg.chat_id)
                          }
                        >
                          <div className="chat-avatar">
                            <i className="fas fa-comment"></i>
                          </div>
                          <div className="chat-info">
                            <div className="chat-name">
                              {chat?.type === "group"
                                ? chat.name
                                : chat?.other_member?.display_name || "Чат"}
                            </div>
                            <div className="chat-last-message">
                              {msg.content.slice(0, 60)}...
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {searchedMessages.length === 0 && (
                      <div className="search-result-item empty">
                        <i className="fas fa-search"></i> Сообщения не найдены
                      </div>
                    )}
                  </div>
                )}

                {/* Каналы */}
                {searchTab === "channels" && (
                  <div className="search-section">
                    {channelResults.map((channel) => (
                      <div
                        key={channel.id}
                        className="search-result-item"
                        onClick={() => handleSelectChatFromSearch(channel.id)}
                      >
                        <div className="chat-avatar">
                          <i className="fas fa-broadcast-tower"></i>
                        </div>
                        <div className="chat-info">
                          <div className="chat-name">{channel.name}</div>
                        </div>
                      </div>
                    ))}
                    {channelResults.length === 0 && (
                      <div className="search-result-item empty">
                        <i className="fas fa-broadcast-tower"></i> Каналы не
                        найдены
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Список чатов */}
        {!showSearchResults && (
          <ChatList
            chats={chats}
            selectedChatId={selectedChatId}
            onSelectChat={handleSelectChat}
            loading={chatsLoading}
          />
        )}

        {/* Кнопка настроек */}
        <div className="sidebar-actions">
          <button onClick={onOpenSettings} title="Настройки">
            <i className="fas fa-bars"></i>
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="chat-area">
        {selectedChatId ? (
          <>
            <ChatHeader
              chat={chats.find((c) => c.id === selectedChatId) || null}
            />
            <MessageList
              messages={messages}
              loading={messagesLoading}
              hasMore={hasMore}
              loadingMore={loadingMore}
              onLoadMore={loadMore}
              onReply={handleReply}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onAddReaction={handleReaction}
              editingMessage={editingMessage}
              onCancelEdit={() => setEditingMessage(null)}
            />

            <MessageInput
              onSend={handleSend}
              onEdit={editMessage}
              replyingTo={replyingTo}
              onCancelReply={() => setReplyingTo(null)}
              editingMessage={editingMessage}
              onCancelEdit={() => setEditingMessage(null)}
            />
          </>
        ) : (
          <div className="no-chat-selected">
            <i className="fas fa-comments"></i>
            <p>Здесь еще нет сообщений.</p>
            <p className="sub">Начните беседу!</p>
          </div>
        )}
      </div>
    </div>
  );
}
