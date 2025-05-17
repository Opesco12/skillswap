import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { Conversation } from "@/types";
import { colors } from "@/constants/colors";
import { formatRelativeTime } from "@/utils/date-utils";

interface ConversationItemProps {
  conversation: Conversation;
  onPress: () => void;
  currentUserId: string;
  getUserInfo: (userId: string) => Promise<{
    displayName: string;
    avatar: string;
  } | null>;
}

export const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  onPress,
  currentUserId,
  getUserInfo,
}) => {
  const otherUserId =
    conversation.participants.find((id) => id !== currentUserId) || "";
  const [userInfo, setUserInfo] = React.useState<{
    displayName: string;
    avatar: string;
  } | null>(null);

  React.useEffect(() => {
    const fetchUserInfo = async () => {
      const info = await getUserInfo(otherUserId);
      setUserInfo(info);
    };
    fetchUserInfo();
  }, [otherUserId, getUserInfo]);

  const displayName = userInfo?.displayName || "Unknown";
  const avatar = userInfo?.avatar || "";

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: avatar }}
        style={styles.avatar}
      />

      <View style={styles.content}>
        <View style={styles.header}>
          <Text
            style={styles.name}
            numberOfLines={1}
          >
            {displayName}
          </Text>
          <Text style={styles.time}>
            {formatRelativeTime(conversation.lastMessage.timestamp)}
          </Text>
        </View>

        <View style={styles.messageContainer}>
          <Text
            style={styles.message}
            numberOfLines={1}
          >
            {conversation.lastMessage.senderId === currentUserId ? "You: " : ""}
            {conversation.lastMessage.content}
          </Text>

          {conversation.unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {conversation.unreadCount > 99
                  ? "99+"
                  : conversation.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
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
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  content: {
    flex: 1,
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  name: {
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
  messageContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  message: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
    marginRight: 8,
  },
  badge: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "600",
  },
});
