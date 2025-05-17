import React, {
  createContext,
  useReducer,
  useCallback,
  useMemo,
  useContext,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/firebase";
import { Message, Conversation, Attachment } from "@/types";
import { useAuth } from "./AuthContext";
import { useNotifications } from "./NotificationsContext";

interface MessagesState {
  messages: Message[];
  conversations: Conversation[];
  isLoading: boolean;
  error: string | null;
}

type MessagesAction =
  | { type: "SET_MESSAGES"; payload: Message[] }
  | { type: "SET_CONVERSATIONS"; payload: Conversation[] }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null };

interface MessagesContextType extends MessagesState {
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

const initialState: MessagesState = {
  messages: [],
  conversations: [],
  isLoading: false,
  error: null,
};

const MessagesContext = createContext<MessagesContextType | undefined>(
  undefined
);

const messagesReducer = (
  state: MessagesState,
  action: MessagesAction
): MessagesState => {
  switch (action.type) {
    case "SET_MESSAGES":
      return { ...state, messages: action.payload };
    case "SET_CONVERSATIONS":
      return { ...state, conversations: action.payload };
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    default:
      return state;
  }
};

export const MessagesProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(messagesReducer, initialState);
  const { user: currentUser } = useAuth();
  const { addNotification } = useNotifications();

  const fetchMessages = useCallback(async () => {
    dispatch({ type: "SET_LOADING", payload: true });
    dispatch({ type: "SET_ERROR", payload: null });
    try {
      const messagesRef = collection(db, "messages");
      const snapshot = await getDocs(messagesRef);
      const messages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[];

      dispatch({ type: "SET_MESSAGES", payload: messages });
      await AsyncStorage.setItem(
        "messages-storage",
        JSON.stringify({ messages })
      );
    } catch (error: any) {
      console.error("fetchMessages: Error:", error);
      dispatch({
        type: "SET_ERROR",
        payload: error.message || "Failed to fetch messages",
      });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, []);

  const fetchConversations = useCallback(async () => {
    dispatch({ type: "SET_LOADING", payload: true });
    dispatch({ type: "SET_ERROR", payload: null });
    try {
      const conversationsRef = collection(db, "conversations");
      const snapshot = await getDocs(conversationsRef);
      const conversations = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Conversation[];

      dispatch({ type: "SET_CONVERSATIONS", payload: conversations });
      await AsyncStorage.setItem(
        "conversations-storage",
        JSON.stringify({ conversations })
      );
    } catch (error: any) {
      console.error("fetchConversations: Error:", error);
      dispatch({
        type: "SET_ERROR",
        payload: error.message || "Failed to fetch conversations",
      });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, []);

  const sendMessage = useCallback(
    async (message: Omit<Message, "id" | "timestamp" | "isRead">) => {
      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "SET_ERROR", payload: null });
      try {
        if (!currentUser?.id) throw new Error("User not authenticated");

        const messageDocRef = doc(collection(db, "messages"));
        const newMessage: Message = {
          ...message,
          id: messageDocRef.id,
          timestamp: new Date().toISOString(),
          isRead: message.senderId === message.receiverId,
        };

        await setDoc(messageDocRef, newMessage);

        const participants = [message.senderId, message.receiverId].sort();
        const conversationId = participants.join("-");
        const conversationRef = doc(db, "conversations", conversationId);

        const conversationSnap = await getDoc(conversationRef);
        let updatedConversations: Conversation[];

        if (conversationSnap.exists()) {
          const existingConversation = {
            id: conversationId,
            ...conversationSnap.data(),
          } as Conversation;

          const unreadCountIncrement =
            message.senderId === currentUser.id &&
            message.senderId !== message.receiverId
              ? 1
              : 0;

          const updatedConversation = {
            ...existingConversation,
            lastMessage: newMessage,
            unreadCount:
              (existingConversation.unreadCount || 0) + unreadCountIncrement,
          };

          await updateDoc(conversationRef, updatedConversation);

          updatedConversations = state.conversations.map((c) =>
            c.id === conversationId ? updatedConversation : c
          );
        } else {
          const newConversation: Conversation = {
            id: conversationId,
            participants,
            lastMessage: newMessage,
            unreadCount:
              message.senderId === currentUser.id &&
              message.senderId !== message.receiverId
                ? 1
                : 0,
          };

          await setDoc(conversationRef, newConversation);

          updatedConversations = [...state.conversations, newConversation];
        }

        if (message.senderId !== message.receiverId) {
          await addNotification({
            userId: message.receiverId,
            type: "new_message",
            title: "New Message",
            message: `New message from ${
              currentUser?.displayName || "Someone"
            }`,
            relatedId: conversationId,
            isRead: false,
          });
          console.log("MessagesProvider: Notified recipient of new message");
        }

        dispatch({
          type: "SET_MESSAGES",
          payload: [...state.messages, newMessage],
        });
        dispatch({ type: "SET_CONVERSATIONS", payload: updatedConversations });
        await AsyncStorage.setItem(
          "messages-storage",
          JSON.stringify({ messages: [...state.messages, newMessage] })
        );
        await AsyncStorage.setItem(
          "conversations-storage",
          JSON.stringify({ conversations: updatedConversations })
        );
      } catch (error: any) {
        console.error("sendMessage: Error:", error);
        dispatch({
          type: "SET_ERROR",
          payload: error.message || "Failed to send message",
        });
        throw error;
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    },
    [
      currentUser?.id,
      currentUser?.displayName,
      state.messages,
      state.conversations,
      addNotification,
    ]
  );

  const markMessageAsRead = useCallback(
    async (id: string) => {
      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "SET_ERROR", payload: null });
      try {
        const messageRef = doc(db, "messages", id);
        await updateDoc(messageRef, { isRead: true });

        const updatedMessages = state.messages.map((message) =>
          message.id === id ? { ...message, isRead: true } : message
        );
        dispatch({ type: "SET_MESSAGES", payload: updatedMessages });

        const message = state.messages.find((m) => m?.id === id);
        if (message) {
          const participants = [message.senderId, message.receiverId].sort();
          const conversationId = participants.join("-");
          const conversationRef = doc(db, "conversations", conversationId);

          const conversationSnap = await getDoc(conversationRef);
          if (conversationSnap.exists()) {
            const conversation = conversationSnap.data() as Conversation;
            const unreadCountDecrement =
              !message.isRead && message.senderId !== currentUser?.id ? 1 : 0;
            const updatedUnreadCount = Math.max(
              0,
              (conversation.unreadCount || 0) - unreadCountDecrement
            );

            const updatedConversation = {
              ...conversation,
              unreadCount: updatedUnreadCount,
            };
            await updateDoc(conversationRef, {
              unreadCount: updatedUnreadCount,
            });
            dispatch({
              type: "SET_CONVERSATIONS",
              payload: state.conversations.map((c) =>
                c.id === conversationId ? updatedConversation : c
              ),
            });
          }
        }

        await AsyncStorage.setItem(
          "messages-storage",
          JSON.stringify({ messages: updatedMessages })
        );
        await AsyncStorage.setItem(
          "conversations-storage",
          JSON.stringify({
            conversations: state.conversations.map((c) =>
              c.id === message?.senderId + "-" + message?.receiverId ||
              c.id === message?.receiverId + "-" + message?.senderId
                ? {
                    ...c,
                    unreadCount: Math.max(
                      0,
                      (c.unreadCount || 0) - (message?.isRead ? 0 : 1)
                    ),
                  }
                : c
            ),
          })
        );
      } catch (error: any) {
        console.error("markMessageAsRead: Error:", error);
        dispatch({
          type: "SET_ERROR",
          payload: error.message || "Failed to mark message as read",
        });
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    },
    [state.messages, state.conversations, currentUser?.id]
  );

  const getConversationMessages = useCallback(
    (conversationId: string) => {
      const conversation = state.conversations.find(
        (c) => c?.id === conversationId
      );
      if (!conversation) return [];

      const [user1, user2] = conversation.participants || [];
      return state.messages
        .filter(
          (message) =>
            (message?.senderId === user1 && message?.receiverId === user2) ||
            (message?.senderId === user2 && message?.receiverId === user1)
        )
        .sort(
          (a, b) =>
            new Date(a?.timestamp || "").getTime() -
            new Date(b?.timestamp || "").getTime()
        );
    },
    [state.messages, state.conversations]
  );

  const getUserConversations = useCallback(
    (userId: string) => {
      return state.conversations
        .filter((conversation) => conversation?.participants?.includes(userId))
        .sort(
          (a, b) =>
            new Date(b?.lastMessage?.timestamp || "").getTime() -
            new Date(a?.lastMessage?.timestamp || "").getTime()
        );
    },
    [state.conversations]
  );

  const getUnreadCount = useCallback(
    (userId: string) => {
      return state.conversations
        .filter((conversation) => conversation?.participants?.includes(userId))
        .reduce(
          (total, conversation) => total + (conversation?.unreadCount || 0),
          0
        );
    },
    [state.conversations]
  );

  const value = useMemo(
    () => ({
      messages: state.messages,
      conversations: state.conversations,
      isLoading: state.isLoading,
      error: state.error,
      fetchMessages,
      fetchConversations,
      sendMessage,
      markMessageAsRead,
      getConversationMessages,
      getUserConversations,
      getUnreadCount,
    }),
    [
      state.messages,
      state.conversations,
      state.isLoading,
      state.error,
      fetchMessages,
      fetchConversations,
      sendMessage,
      markMessageAsRead,
      getConversationMessages,
      getUserConversations,
      getUnreadCount,
    ]
  );

  return (
    <MessagesContext.Provider value={value}>
      {children}
    </MessagesContext.Provider>
  );
};

export const useMessages = () => {
  const context = useContext(MessagesContext);
  if (!context) {
    throw new Error("useMessages must be used within a MessagesProvider");
  }
  return context;
};
