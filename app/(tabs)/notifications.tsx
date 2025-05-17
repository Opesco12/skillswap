import React, { useEffect } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Text,
  StatusBar,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Bell, CheckCheck } from "lucide-react-native";
import { NotificationItem } from "@/components/NotificationItem";
import { EmptyState } from "@/components/EmptyState";
import { colors } from "@/constants/colors";
import { typography } from "@/constants/typography";
import { useNotifications } from "@/context/NotificationsContext";
import { useAuth } from "@/context/AuthContext";
import { Notification } from "@/types";

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    notifications,
    isLoading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    getUnreadCount,
    getUserNotifications,
  } = useNotifications();

  useEffect(() => {
    if (user?.id) {
      console.log(
        "NotificationsScreen: Fetching notifications for user:",
        user.id
      );
      const unsubscribe = fetchNotifications(user.id);
      return () => {
        console.log("NotificationsScreen: Unsubscribing from notifications");
        unsubscribe();
      };
    }
  }, [user?.id, fetchNotifications]);

  useEffect(() => {
    if (error) {
      console.error("NotificationsScreen: Error:", error);
      Alert.alert("Error", error, [
        {
          text: "Retry",
          onPress: () => {
            if (user?.id) fetchNotifications(user.id);
          },
        },
        { text: "OK", style: "cancel" },
      ]);
    }
  }, [error, user?.id, fetchNotifications]);

  const handleNotificationPress = async (notification: Notification) => {
    try {
      // Mark as read
      await markAsRead(notification.id);
      console.log(
        "NotificationsScreen: Marked notification as read:",
        notification.id
      );

      // Navigate based on notification type
      if (notification.relatedId) {
        switch (notification.type) {
          case "exchange_request":
          case "exchange_accepted":
          case "exchange_declined":
          case "exchange_canceled":
          case "exchange_completed":
            // router.push(`/exchange/${notification.relatedId}`);
            break;
          case "new_message":
            // router.push(`/chat/${notification.relatedId}`);
            break;
          case "new_rating":
            // router.push(`/profile/${notification.relatedId}`);
            break;
          default:
            break;
        }
      }
    } catch (err: any) {
      console.error("NotificationsScreen: Failed to mark as read:", err);
      Alert.alert(
        "Error",
        err.message || "Failed to mark notification as read"
      );
    }
  };

  const handleMarkAllAsRead = async () => {
    if (user?.id) {
      try {
        await markAllAsRead(user.id);
        console.log(
          "NotificationsScreen: Marked all notifications as read for user:",
          user.id
        );
      } catch (err: any) {
        console.error("NotificationsScreen: Failed to mark all as read:", err);
        Alert.alert(
          "Error",
          err.message || "Failed to mark all notifications as read"
        );
      }
    }
  };

  const renderNotificationItem = ({ item }: { item: Notification }) => (
    <NotificationItem
      notification={item}
      onPress={() => handleNotificationPress(item)}
    />
  );

  if (isLoading && notifications.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color={colors.primary}
        />
      </View>
    );
  }

  const userNotifications = user?.id ? getUserNotifications(user.id) : [];
  const unreadCount = user?.id ? getUnreadCount(user.id) : 0;

  return (
    <View style={styles.container}>
      {userNotifications.length > 0 ? (
        <>
          <View style={styles.header}>
            <Text style={styles.title}>
              {unreadCount > 0
                ? `You have ${unreadCount} unread notification${
                    unreadCount !== 1 ? "s" : ""
                  }`
                : "All caught up!"}
            </Text>

            {unreadCount > 0 && (
              <TouchableOpacity
                style={styles.markAllButton}
                onPress={handleMarkAllAsRead}
              >
                <CheckCheck
                  size={16}
                  color={colors.primary}
                  style={styles.markAllIcon}
                />
                <Text style={styles.markAllText}>Mark all as read</Text>
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={userNotifications}
            renderItem={renderNotificationItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
          />
        </>
      ) : (
        <EmptyState
          icon={
            <Bell
              size={48}
              color={colors.textLight}
            />
          }
          title="No notifications"
          message="You're all caught up! Notifications about your exchanges and messages will appear here."
          actionLabel="Discover Skills"
          onAction={() => router.push("/")}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    // paddingTop: StatusBar.currentHeight,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    ...typography.subtitle1,
  },
  markAllButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  markAllIcon: {
    marginRight: 4,
  },
  markAllText: {
    color: colors.primary,
    fontWeight: "500",
    fontSize: 14,
  },
});
