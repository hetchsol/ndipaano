'use client';

import { create } from 'zustand';
import { chatAPI } from '@/lib/api';

interface ChatUser {
  id: string;
  firstName: string;
  lastName: string;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  type: 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM';
  content: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  readAt?: string;
  createdAt: string;
  sender?: ChatUser;
}

interface Conversation {
  id: string;
  bookingId: string;
  patientId: string;
  practitionerId: string;
  isActive: boolean;
  createdAt: string;
  lastMessage?: Message;
  unreadCount: number;
  otherParty?: ChatUser;
}

interface ChatState {
  conversations: Conversation[];
  messagesByConversation: Record<string, Message[]>;
  unreadCounts: Record<string, number>;
  totalUnread: number;
  typingUsers: Record<string, { userId: string; firstName: string } | null>;
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;

  fetchConversations: () => Promise<void>;
  fetchMessages: (conversationId: string, cursor?: string) => Promise<boolean>;
  sendMessage: (conversationId: string, content: string, type?: string) => Promise<Message | null>;
  markAsRead: (conversationId: string) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;

  // Actions called from socket events
  addIncomingMessage: (message: Message) => void;
  setTypingUser: (conversationId: string, user: { userId: string; firstName: string } | null) => void;
  updateMessagesRead: (conversationId: string, userId: string) => void;
}

export const useChat = create<ChatState>((set, get) => ({
  conversations: [],
  messagesByConversation: {},
  unreadCounts: {},
  totalUnread: 0,
  typingUsers: {},
  isLoadingConversations: false,
  isLoadingMessages: false,

  fetchConversations: async () => {
    set({ isLoadingConversations: true });
    try {
      const res = await chatAPI.listConversations({ limit: 50 });
      const conversations = res.data.data?.data || res.data.data || [];
      const unreadCounts: Record<string, number> = {};
      conversations.forEach((c: Conversation) => {
        unreadCounts[c.id] = c.unreadCount || 0;
      });
      set({ conversations, unreadCounts });
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    } finally {
      set({ isLoadingConversations: false });
    }
  },

  fetchMessages: async (conversationId: string, cursor?: string) => {
    set({ isLoadingMessages: true });
    try {
      const res = await chatAPI.getMessages(conversationId, { cursor, limit: 50 });
      const messages: Message[] = res.data.data?.data || res.data.data || [];
      const existing = get().messagesByConversation[conversationId] || [];

      if (cursor) {
        // Prepend older messages
        const existingIds = new Set(existing.map((m) => m.id));
        const newMessages = messages.filter((m) => !existingIds.has(m.id));
        set({
          messagesByConversation: {
            ...get().messagesByConversation,
            [conversationId]: [...newMessages, ...existing],
          },
        });
      } else {
        set({
          messagesByConversation: {
            ...get().messagesByConversation,
            [conversationId]: messages,
          },
        });
      }
      return messages.length > 0;
    } catch (err) {
      console.error('Failed to fetch messages:', err);
      return false;
    } finally {
      set({ isLoadingMessages: false });
    }
  },

  sendMessage: async (conversationId: string, content: string, type = 'TEXT') => {
    try {
      const res = await chatAPI.sendMessage(conversationId, { content, type });
      const message: Message = res.data.data;
      const existing = get().messagesByConversation[conversationId] || [];
      set({
        messagesByConversation: {
          ...get().messagesByConversation,
          [conversationId]: [...existing, message],
        },
      });
      return message;
    } catch (err) {
      console.error('Failed to send message:', err);
      return null;
    }
  },

  markAsRead: async (conversationId: string) => {
    try {
      await chatAPI.markAsRead(conversationId);
      set({
        unreadCounts: { ...get().unreadCounts, [conversationId]: 0 },
      });
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  },

  fetchUnreadCount: async () => {
    try {
      const res = await chatAPI.getUnreadCount();
      const count = res.data.data?.unreadCount ?? res.data.data ?? 0;
      set({ totalUnread: count });
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  },

  addIncomingMessage: (message: Message) => {
    const existing = get().messagesByConversation[message.conversationId] || [];
    const alreadyExists = existing.some((m) => m.id === message.id);
    if (alreadyExists) return;

    set({
      messagesByConversation: {
        ...get().messagesByConversation,
        [message.conversationId]: [...existing, message],
      },
      unreadCounts: {
        ...get().unreadCounts,
        [message.conversationId]: (get().unreadCounts[message.conversationId] || 0) + 1,
      },
      totalUnread: get().totalUnread + 1,
    });

    // Update last message on conversation
    const conversations = get().conversations.map((c) =>
      c.id === message.conversationId
        ? { ...c, lastMessage: message, unreadCount: (c.unreadCount || 0) + 1 }
        : c,
    );
    set({ conversations });
  },

  setTypingUser: (conversationId: string, user) => {
    set({
      typingUsers: { ...get().typingUsers, [conversationId]: user },
    });
  },

  updateMessagesRead: (conversationId: string, _userId: string) => {
    const messages = get().messagesByConversation[conversationId] || [];
    const updated = messages.map((m) =>
      !m.readAt ? { ...m, readAt: new Date().toISOString() } : m,
    );
    set({
      messagesByConversation: {
        ...get().messagesByConversation,
        [conversationId]: updated,
      },
    });
  },
}));
