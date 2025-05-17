import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Notification, NotificationType } from "@/types";
import { colors } from "../constants/colors";
import { formatRelativeTime } from "../utils/date-utils";
import {
  Bell,
  MessageSquare,
  ArrowLeftRight,
  CheckCircle,
  XCircle,
  Star,
  AlertCircle,
} from "lucide-react-native";

interface NotificationItemProps {
  notification: Notification;
  onPress: () => void;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onPress,
}) => {
  const { type, title, message, isRead, createdAt } = notification;

  const getIcon = () => {
    switch (type) {
      case "exchange_request":
        return (
          <ArrowLeftRight
            size={24}
            color={colors.primary}
          />
        );
      case "exchange_accepted":
        return (
          <CheckCircle
            size={24}
            color={colors.success}
          />
        );
      case "exchange_declined":
        return (
          <XCircle
            size={24}
            color={colors.error}
          />
        );
      case "exchange_canceled":
        return (
          <XCircle
            size={24}
            color={colors.error}
          />
        );
      case "exchange_completed":
        return (
          <CheckCircle
            size={24}
            color={colors.success}
          />
        );
      case "new_message":
        return (
          <MessageSquare
            size={24}
            color={colors.info}
          />
        );
      case "new_rating":
        return (
          <Star
            size={24}
            color={colors.warning}
          />
        );
      case "system":
        return (
          <Bell
            size={24}
            color={colors.secondary}
          />
        );
      default:
        return (
          <AlertCircle
            size={24}
            color={colors.textSecondary}
          />
        );
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isRead ? styles.readContainer : styles.unreadContainer,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>{getIcon()}</View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text
            style={styles.title}
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text style={styles.time}>{formatRelativeTime(createdAt)}</Text>
        </View>

        <Text
          style={styles.message}
          numberOfLines={2}
        >
          {message}
        </Text>
      </View>

      {!isRead && <View style={styles.unreadIndicator} />}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  readContainer: {
    backgroundColor: colors.white,
  },
  unreadContainer: {
    backgroundColor: colors.card,
  },
  iconContainer: {
    marginRight: 12,
    justifyContent: "center",
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    flex: 1,
    marginRight: 8,
  },
  time: {
    fontSize: 12,
    color: colors.textLight,
  },
  message: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginLeft: 8,
    alignSelf: "center",
  },
});
