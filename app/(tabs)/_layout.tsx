import React from "react";
import { Tabs } from "expo-router";
import {
  Home,
  ArrowLeftRight,
  MessageSquare,
  Bell,
  User,
} from "lucide-react-native";
import { colors } from "@/constants/colors";
import { useMessagesStore } from "../../store/messages-store";
import { useNotificationsStore } from "../../store/notifications-store";
import { useAuthStore } from "@/store/auth-store";

export default function TabLayout() {
  const user = useAuthStore((state) => state.user);
  const messageUnreadCount = useMessagesStore((state) =>
    state.getUnreadCount(user?.id || "")
  );
  const notificationUnreadCount = useNotificationsStore((state) =>
    state.getUnreadCount(user?.id || "")
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarItemStyle: {
          paddingVertical: 7,
        },
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textLight,
        tabBarStyle: {
          borderTopColor: colors.border,
          backgroundColor: colors.white,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Discover",
          tabBarLabel: "Discover",
          tabBarIcon: ({ color, size }) => (
            <Home
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="exchanges"
        options={{
          title: "Exchanges",
          tabBarLabel: "Exchanges",
          tabBarIcon: ({ color, size }) => (
            <ArrowLeftRight
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarLabel: "Messages",
          tabBarIcon: ({ color, size }) => (
            <MessageSquare
              size={size}
              color={color}
            />
          ),
          tabBarBadge: messageUnreadCount > 0 ? messageUnreadCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.primary,
          },
        }}
      />

      <Tabs.Screen
        name="notifications"
        options={{
          title: "Notifications",
          tabBarLabel: "Notifications",
          tabBarIcon: ({ color, size }) => (
            <Bell
              size={size}
              color={color}
            />
          ),
          tabBarBadge:
            notificationUnreadCount > 0 ? notificationUnreadCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.primary,
          },
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size }) => (
            <User
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
