import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Notification, NotificationType } from "@/types";
import { mockNotifications } from "@/mocks/notifications";

interface NotificationsState {
  notifications: Notification[];
  isLoading: boolean;
  error: string | null;
  fetchNotifications: () => Promise<void>;
  addNotification: (
    notification: Omit<Notification, "id" | "createdAt">
  ) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: (userId: string) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  getUserNotifications: (userId: string) => Notification[];
  getUnreadCount: (userId: string) => number;
}

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set, get) => ({
      notifications: [],
      isLoading: false,
      error: null,

      fetchNotifications: async () => {
        set({ isLoading: true, error: null });
        try {
          // Simulate API call
          await new Promise((resolve) => setTimeout(resolve, 1000));

          set({ notifications: mockNotifications, isLoading: false });
        } catch (error) {
          set({ error: "Failed to fetch notifications", isLoading: false });
        }
      },

      addNotification: async (notification) => {
        set({ isLoading: true, error: null });
        try {
          // Simulate API call
          await new Promise((resolve) => setTimeout(resolve, 500));

          const newNotification: Notification = {
            ...notification,
            id: Date.now().toString(),
            createdAt: new Date().toISOString(),
          };

          set((state) => ({
            notifications: [...state.notifications, newNotification],
            isLoading: false,
          }));
        } catch (error) {
          set({ error: "Failed to add notification", isLoading: false });
        }
      },

      markAsRead: async (id) => {
        set({ isLoading: true, error: null });
        try {
          // Simulate API call
          await new Promise((resolve) => setTimeout(resolve, 500));

          set((state) => ({
            notifications: state.notifications.map((notification) =>
              notification.id === id
                ? { ...notification, isRead: true }
                : notification
            ),
            isLoading: false,
          }));
        } catch (error) {
          set({
            error: "Failed to mark notification as read",
            isLoading: false,
          });
        }
      },

      markAllAsRead: async (userId) => {
        set({ isLoading: true, error: null });
        try {
          // Simulate API call
          await new Promise((resolve) => setTimeout(resolve, 500));

          set((state) => ({
            notifications: state.notifications.map((notification) =>
              notification.userId === userId
                ? { ...notification, isRead: true }
                : notification
            ),
            isLoading: false,
          }));
        } catch (error) {
          set({
            error: "Failed to mark all notifications as read",
            isLoading: false,
          });
        }
      },

      deleteNotification: async (id) => {
        set({ isLoading: true, error: null });
        try {
          // Simulate API call
          await new Promise((resolve) => setTimeout(resolve, 500));

          set((state) => ({
            notifications: state.notifications.filter(
              (notification) => notification.id !== id
            ),
            isLoading: false,
          }));
        } catch (error) {
          set({ error: "Failed to delete notification", isLoading: false });
        }
      },

      getUserNotifications: (userId) => {
        return get()
          .notifications.filter(
            (notification) => notification.userId === userId
          )
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
      },

      getUnreadCount: (userId) => {
        return get().notifications.filter(
          (notification) =>
            notification.userId === userId && !notification.isRead
        ).length;
      },
    }),
    {
      name: "notifications-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
