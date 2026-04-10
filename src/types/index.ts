export type ChatType = "direct" | "group";
export type MessageType = "text" | "image" | "video" | "file" | "code";
export type MemberRole = "member" | "admin";
export type ExecutionStatus = "success" | "error" | "timeout";

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  status: UserStatus;
  last_seen: string | null;
  created_at: string;
  updated_at: string;
}

export type UserStatus = "online" | "offline" | "typing";

export interface Chat {
  id: string;
  type: ChatType;
  name: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Дополнительные поля для UI
  last_message?: Message;
  unread_count?: number;
  members?: ChatMember[];
  other_member?: Profile | null;
}

export interface ChatMember {
  id: string;
  chat_id: string;
  user_id: string;
  role: MemberRole;
  joined_at: string;
  profile?: Profile;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  message_type: MessageType;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  reply_to: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  // Дополнительные поля для UI
  sender?: Profile;
  reply_message?: Message;
  reactions?: MessageReaction[];
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
  user?: Profile;
}

export interface CustomScript {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  code: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  // Дополнительные поля для UI
  author?: Profile;
}

export interface ScriptExecution {
  id: string;
  script_id: string;
  user_id: string;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  error: string | null;
  status: ExecutionStatus;
  executed_at: string;
  duration_ms: number | null;
}

export interface ChatWithMembers extends Chat {
  members: (ChatMember & { profile: Profile })[];
}
