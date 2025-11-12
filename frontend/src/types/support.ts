export interface SupportMessage {
  id: string;
  sender: 'USER' | 'ADMIN';
  content: string;
  createdAt: string;
  read?: boolean;
  attachmentUrl?: string;
  attachmentType?: 'IMAGE' | 'VIDEO' | 'FILE';
  attachmentName?: string;
}

export type SupportConversationStatus = 'PENDING' | 'IN_PROGRESS' | 'RESOLVED';

export interface SupportConversation {
  id: string;
  userId: string;
  userName: string;
  lastMessageAt: string;
  unreadCount?: number;
  status: SupportConversationStatus;
  messages: SupportMessage[];
}

export interface SupportReplyPayload {
  content: string;
}

export interface SupportConversationStatusPayload {
  status: SupportConversationStatus;
}

