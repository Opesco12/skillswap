import React, {
  createContext,
  useReducer,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/firebase";
import { Notification, NotificationType } from "@/types";
import { useAuth } from "@/context/AuthContext";

interface NotificationsState {
  notifications: Notification[];
  isLoading: boolean;
  error: string | null;
}

type NotificationsAction =
  | { type: "SET_NOTIFICATIONS"; payload: Notification[] }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null };

interface NotificationsContextType extends NotificationsState {
  fetchNotifications: (userId?: string) => () => void;
  addNotification: (
    notification: Omit<Notification, "id" | "createdAt">
  ) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: (userId: string) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  getUserNotifications: (userId: string) => Notification[];
  getUnreadCount: (userId: string) => number;
}

const initialState: NotificationsState = {
  notifications: [],
  isLoading: false,
  error: null,
};

const NotificationsContext = createContext<
  NotificationsContextType | undefined
>(undefined);

// Validate NotificationType
const validNotificationTypes: NotificationType[] = [
  "exchange_request",
  "exchange_accepted",
  "exchange_declined",
  "exchange_canceled",
  "exchange_completed",
  "new_message",
  "new_rating",
  "system",
];

const notificationsReducer = (
  state: NotificationsState,
  action: NotificationsAction
): NotificationsState => {
  switch (action.type) {
    case "SET_NOTIFICATIONS":
      return { ...state, notifications: action.payload };
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    default:
      return state;
  }
};

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(notificationsReducer, initialState);
  const { user } = useAuth();

  // Load initial notifications from AsyncStorage
  useEffect(() => {
    const loadStoredNotifications = async () => {
      try {
        const stored = await AsyncStorage.getItem("notifications-storage");
        if (stored) {
          const { notifications } = JSON.parse(stored);
          dispatch({ type: "SET_NOTIFICATIONS", payload: notifications });
          console.log(
            "NotificationsProvider: Loaded",
            notifications.length,
            "notifications from AsyncStorage"
          );
        }
      } catch (error) {
        console.error(
          "NotificationsProvider: Failed to load AsyncStorage:",
          error
        );
      }
    };
    loadStoredNotifications();
  }, []);

  const fetchNotifications = useCallback((userId?: string) => {
    console.log("fetchNotifications: Starting fetch, userId:", userId || "all");
    dispatch({ type: "SET_LOADING", payload: true });
    dispatch({ type: "SET_ERROR", payload: null });

    try {
      const notificationsRef = collection(db, "notifications");
      const q = userId
        ? query(notificationsRef, where("userId", "==", userId))
        : notificationsRef;

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const notifications = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Notification[];
          notifications.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          dispatch({ type: "SET_NOTIFICATIONS", payload: notifications });
          AsyncStorage.setItem(
            "notifications-storage",
            JSON.stringify({ notifications })
          )
            .then(() => {
              console.log(
                "fetchNotifications: Saved",
                notifications.length,
                "notifications to AsyncStorage"
              );
            })
            .catch((error) => {
              console.error(
                "fetchNotifications: AsyncStorage save error:",
                error
              );
            });
          console.log(
            "fetchNotifications: Fetched",
            notifications.length,
            "notifications"
          );
          dispatch({ type: "SET_LOADING", payload: false });
        },
        (error) => {
          console.error("fetchNotifications: Snapshot error:", error.message);
          dispatch({
            type: "SET_ERROR",
            payload: `Failed to fetch notifications: ${error.message}`,
          });
          dispatch({ type: "SET_LOADING", payload: false });
        }
      );

      return unsubscribe;
    } catch (error: any) {
      console.error("fetchNotifications: Error:", error.message);
      dispatch({
        type: "SET_ERROR",
        payload: `Failed to fetch notifications: ${error.message}`,
      });
      dispatch({ type: "SET_LOADING", payload: false });
      return () => {};
    }
  }, []);

  // Automatically fetch user's notifications on mount or user change
  useEffect(() => {
    if (user?.id) {
      console.log(
        "NotificationsProvider: Auto-fetching notifications for user:",
        user.id
      );
      const unsubscribe = fetchNotifications(user.id);
      return () => {
        console.log("NotificationsProvider: Unsubscribing from notifications");
        unsubscribe();
      };
    }
  }, [user?.id, fetchNotifications]);

  // Add a notification (used by other components like ExchangeDetailScreen)
  const addNotification = useCallback(
    async (notification: Omit<Notification, "id" | "createdAt">) => {
      console.log("addNotification: Starting with notification:", notification);
      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "SET_ERROR", payload: null });

      try {
        if (!user?.id) {
          throw new Error("User not authenticated");
        }
        if (!notification.userId) {
          throw new Error("Notification userId is required");
        }
        if (!notification.title || !notification.message) {
          throw new Error("Notification title and message are required");
        }
        if (!validNotificationTypes.includes(notification.type)) {
          throw new Error(`Invalid notification type: ${notification.type}`);
        }

        const notificationDocRef = doc(collection(db, "notifications"));
        const newNotification: Notification = {
          ...notification,
          id: notificationDocRef.id,
          createdAt: new Date().toISOString(),
        };

        console.log(
          "addNotification: Writing to /notifications:",
          newNotification
        );
        await setDoc(notificationDocRef, newNotification);

        // Update local state for immediate feedback (onSnapshot will also update)
        const updatedNotifications = [
          ...state.notifications,
          newNotification,
        ].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        dispatch({ type: "SET_NOTIFICATIONS", payload: updatedNotifications });
        await AsyncStorage.setItem(
          "notifications-storage",
          JSON.stringify({ notifications: updatedNotifications })
        );
        console.log(
          "addNotification: Added notification, total:",
          updatedNotifications.length
        );
      } catch (error: any) {
        console.error("addNotification: Error:", error);
        dispatch({
          type: "SET_ERROR",
          payload: `Failed to add notification: ${error.message}`,
        });
        throw error;
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    },
    [user, state.notifications]
  );

  const markAsRead = useCallback(
    async (id: string) => {
      console.log("markAsRead: Starting, id:", id);
      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "SET_ERROR", payload: null });

      try {
        if (!user?.id) {
          throw new Error("User not authenticated");
        }

        const notificationRef = doc(db, "notifications", id);
        await updateDoc(notificationRef, { isRead: true });

        // Update local state
        const updatedNotifications = state.notifications.map((notification) =>
          notification.id === id
            ? { ...notification, isRead: true }
            : notification
        );
        dispatch({ type: "SET_NOTIFICATIONS", payload: updatedNotifications });
        await AsyncStorage.setItem(
          "notifications-storage",
          JSON.stringify({ notifications: updatedNotifications })
        );
        console.log("markAsRead: Marked notification as read");
      } catch (error: any) {
        console.error("markAsRead: Error:", error);
        dispatch({
          type: "SET_ERROR",
          payload: `Failed to mark notification as read: ${error.message}`,
        });
        throw error;
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    },
    [user, state.notifications]
  );

  const markAllAsRead = useCallback(
    async (userId: string) => {
      console.log("markAllAsRead: Starting, userId:", userId);
      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "SET_ERROR", payload: null });

      try {
        if (!user?.id) {
          throw new Error("User not authenticated");
        }

        // Use batch for efficient updates
        const batch = writeBatch(db);
        const userNotifications = state.notifications.filter(
          (notification) =>
            notification.userId === userId && !notification.isRead
        );

        if (userNotifications.length === 0) {
          console.log("markAllAsRead: No unread notifications to mark");
          return;
        }

        userNotifications.forEach((notification) => {
          const notificationRef = doc(db, "notifications", notification.id);
          batch.update(notificationRef, { isRead: true });
        });

        await batch.commit();

        // Update local state
        const updatedNotifications = state.notifications.map((notification) =>
          notification.userId === userId
            ? { ...notification, isRead: true }
            : notification
        );
        dispatch({ type: "SET_NOTIFICATIONS", payload: updatedNotifications });
        await AsyncStorage.setItem(
          "notifications-storage",
          JSON.stringify({ notifications: updatedNotifications })
        );
        console.log(
          "markAllAsRead: Marked",
          userNotifications.length,
          "notifications as read for user:",
          userId
        );
      } catch (error: any) {
        console.error("markAllAsRead: Error:", error);
        dispatch({
          type: "SET_ERROR",
          payload: `Failed to mark all notifications as read: ${error.message}`,
        });
        throw error;
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    },
    [user, state.notifications]
  );

  const deleteNotification = useCallback(
    async (id: string) => {
      console.log("deleteNotification: Starting, id:", id);
      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "SET_ERROR", payload: null });

      try {
        if (!user?.id) {
          throw new Error("User not authenticated");
        }

        const notificationRef = doc(db, "notifications", id);
        await deleteDoc(notificationRef);

        // Update local state
        const updatedNotifications = state.notifications.filter(
          (notification) => notification.id !== id
        );
        dispatch({ type: "SET_NOTIFICATIONS", payload: updatedNotifications });
        await AsyncStorage.setItem(
          "notifications-storage",
          JSON.stringify({ notifications: updatedNotifications })
        );
        console.log("deleteNotification: Deleted notification");
      } catch (error: any) {
        console.error("deleteNotification: Error:", error);
        dispatch({
          type: "SET_ERROR",
          payload: `Failed to delete notification: ${error.message}`,
        });
        throw error;
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    },
    [user, state.notifications]
  );

  const getUserNotifications = useCallback(
    (userId: string) => {
      return state.notifications
        .filter((notification) => notification.userId === userId)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    },
    [state.notifications]
  );

  const getUnreadCount = useCallback(
    (userId: string) => {
      return state.notifications.filter(
        (notification) => notification.userId === userId && !notification.isRead
      ).length;
    },
    [state.notifications]
  );

  const value = useMemo(
    () => ({
      notifications: state.notifications,
      isLoading: state.isLoading,
      error: state.error,
      fetchNotifications,
      addNotification,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      getUserNotifications,
      getUnreadCount,
    }),
    [
      state.notifications,
      state.isLoading,
      state.error,
      fetchNotifications,
      addNotification,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      getUserNotifications,
      getUnreadCount,
    ]
  );

  console.log(
    "NotificationsProvider: Rendering, notifications count:",
    state.notifications.length
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const context = React.useContext(NotificationsContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationsProvider"
    );
  }
  return context;
};
