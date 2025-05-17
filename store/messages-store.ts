import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Message, Conversation } from "@/types";
import { mockMessages, mockConversations } from "../mocks/messages";

interface MessagesState {
  messages: Message[];
  conversations: Conversation[];
  isLoading: boolean;
  error: string | null;
  fetchMessages: () => Promise<void>;
  fetchConversations: () => Promise<void>;
  sendMessage: (
    message: Omit<Message, "id" | "timestamp" | "isRead">
  ) => Promise<void>;
  markMessageAsRead: (id: string) => Promise<void>;
  getConversationMessages: (conversationId: string) => Message[];
  getUserConversations: (userId: string) => Conversation[];
  getUnreadCount: (userId: string) => number;
}

export const useMessagesStore = create<MessagesState>()(
  persist(
    (set, get) => ({
      messages: [],
      conversations: [],
      isLoading: false,
      error: null,

      fetchMessages: async () => {
        set({ isLoading: true, error: null });
        try {
          // Simulate API call
          await new Promise((resolve) => setTimeout(resolve, 1000));

          set({ messages: mockMessages, isLoading: false });
        } catch (error) {
          set({ error: "Failed to fetch messages", isLoading: false });
        }
      },

      fetchConversations: async () => {
        set({ isLoading: true, error: null });
        try {
          // Simulate API call
          await new Promise((resolve) => setTimeout(resolve, 1000));

          set({ conversations: mockConversations, isLoading: false });
        } catch (error) {
          set({ error: "Failed to fetch conversations", isLoading: false });
        }
      },

      sendMessage: async (message) => {
        set({ isLoading: true, error: null });
        try {
          // Simulate API call
          await new Promise((resolve) => setTimeout(resolve, 1000));

          const newMessage: Message = {
            ...message,
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            isRead: false,
          };

          set((state) => ({
            messages: [...state.messages, newMessage],
            isLoading: false,
          }));

          // Update conversation or create a new one
          const participants = [message.senderId, message.receiverId].sort();
          const conversationId = participants.join("-");

          const existingConversation = get().conversations.find(
            (c) => c.id === conversationId
          );

          if (existingConversation) {
            set((state) => ({
              conversations: state.conversations.map((c) =>
                c.id === conversationId
                  ? {
                      ...c,
                      lastMessage: newMessage,
                      unreadCount:
                        c.unreadCount +
                        (message.senderId !== message.receiverId ? 1 : 0),
                    }
                  : c
              ),
            }));
          } else {
            const newConversation: Conversation = {
              id: conversationId,
              participants,
              lastMessage: newMessage,
              unreadCount: 1,
            };

            set((state) => ({
              conversations: [...state.conversations, newConversation],
            }));
          }
        } catch (error) {
          set({ error: "Failed to send message", isLoading: false });
        }
      },

      markMessageAsRead: async (id) => {
        set({ isLoading: true, error: null });
        try {
          // Simulate API call
          await new Promise((resolve) => setTimeout(resolve, 500));

          set((state) => ({
            messages: state.messages.map((message) =>
              message.id === id ? { ...message, isRead: true } : message
            ),
            isLoading: false,
          }));

          // Update unread count in conversation
          const message = get().messages.find((m) => m.id === id);
          if (message) {
            const participants = [message.senderId, message.receiverId].sort();
            const conversationId = participants.join("-");

            set((state) => ({
              conversations: state.conversations.map((c) =>
                c.id === conversationId
                  ? { ...c, unreadCount: Math.max(0, c.unreadCount - 1) }
                  : c
              ),
            }));
          }
        } catch (error) {
          set({ error: "Failed to mark message as read", isLoading: false });
        }
      },

      getConversationMessages: (conversationId) => {
        const conversation = get().conversations.find(
          (c) => c.id === conversationId
        );
        if (!conversation) return [];

        const [user1, user2] = conversation.participants;

        return get()
          .messages.filter(
            (message) =>
              (message.senderId === user1 && message.receiverId === user2) ||
              (message.senderId === user2 && message.receiverId === user1)
          )
          .sort(
            (a, b) =>
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
      },

      getUserConversations: (userId) => {
        return get()
          .conversations.filter((conversation) =>
            conversation.participants.includes(userId)
          )
          .sort(
            (a, b) =>
              new Date(b.lastMessage.timestamp).getTime() -
              new Date(a.lastMessage.timestamp).getTime()
          );
      },

      getUnreadCount: (userId) => {
        return get()
          .conversations.filter((conversation) =>
            conversation.participants.includes(userId)
          )
          .reduce((total, conversation) => total + conversation.unreadCount, 0);
      },
    }),
    {
      name: "messages-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
