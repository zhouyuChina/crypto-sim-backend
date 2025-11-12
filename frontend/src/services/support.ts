import type {
  SupportConversation,
  SupportReplyPayload,
  SupportMessage,
  SupportConversationStatus,
  SupportConversationStatusPayload
} from '@/types/support';

const createMockConversations = (): SupportConversation[] => [
  {
    id: 'conv-001',
    userId: 'user-101',
    userName: '測試用戶 Alice',
    lastMessageAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    unreadCount: 1,
    status: 'PENDING',
    messages: [
      {
        id: 'msg-001',
        sender: 'USER',
        content: '客服您好，我想了解平台是否支援模擬交易？',
        createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        read: false
      },
      {
        id: 'msg-002',
        sender: 'ADMIN',
        content: '您好，平台提供模擬交易功能，您可以在大盤設定中建立新的測試方案。',
        createdAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
        read: true
      },
      {
        id: 'msg-003',
        sender: 'USER',
        content: '太好了，那我嘗試看看，謝謝！',
        createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
        read: false
      }
    ]
  }
];

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
let conversationsStore = createMockConversations();
let localConversationsStore: Record<string, SupportMessage[]> = {};

export const supportService = {
  async listConversations(): Promise<SupportConversation[]> {
    await delay(200);
    return conversationsStore.map(conversation => ({
      ...conversation,
      status: conversation.status ?? 'PENDING',
      messages: [...(localConversationsStore[conversation.id] ?? conversation.messages)]
    })).sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  },

  async getConversation(_: unknown, conversationId: string): Promise<SupportConversation> {
    await delay(150);
    const found =
      conversationsStore.find(conversation => conversation.id === conversationId) ??
      conversationsStore[0];
    if (!found) {
      throw new Error('Conversation not found');
    }
    return {
      ...found,
      status: found.status ?? 'PENDING',
      messages: [...(localConversationsStore[found.id] ?? found.messages)]
    };
  },

  async replyConversation(
    _: unknown,
    conversationId: string,
    payload: SupportReplyPayload
  ): Promise<SupportMessage> {
    const now = new Date().toISOString();
    const newMessage: SupportMessage = {
      id: `admin-${Date.now()}`,
      sender: 'ADMIN',
      content: payload.content,
      createdAt: now,
      read: true
    };

    const existingMessages =
      localConversationsStore[conversationId] ??
      conversationsStore.find(conversation => conversation.id === conversationId)?.messages ??
      [];
    localConversationsStore = {
      ...localConversationsStore,
      [conversationId]: [...existingMessages, newMessage]
    };
    conversationsStore = conversationsStore.map(conversation =>
      conversation.id === conversationId
        ? { ...conversation, lastMessageAt: now, unreadCount: 0 }
        : conversation
    );
    await delay(120);
    return newMessage;
  },

  async markConversationRead(_: unknown, conversationId: string): Promise<void> {
    conversationsStore = conversationsStore.map(conversation =>
      conversation.id === conversationId
        ? { ...conversation, unreadCount: 0 }
        : conversation
    );
    await delay(60);
  },

  async updateConversationStatus(
    _: unknown,
    conversationId: string,
    payload: SupportConversationStatusPayload
  ): Promise<SupportConversation> {
    conversationsStore = conversationsStore.map(conversation =>
      conversation.id === conversationId
        ? { ...conversation, status: payload.status }
        : conversation
    );
    await delay(120);
    const updated =
      conversationsStore.find(conversation => conversation.id === conversationId) ??
      conversationsStore[0];
    return updated;
  },

  async clearConversations(): Promise<void> {
    await delay(200);
    conversationsStore = [];
    localConversationsStore = {};
  }
};

