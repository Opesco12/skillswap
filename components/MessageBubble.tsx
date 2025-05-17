import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { Message } from "@/types";
import { colors } from "../constants/colors";
import { formatTime } from "../utils/date-utils";

interface MessageBubbleProps {
  message: Message;
  isCurrentUser: boolean;
  showAvatar?: boolean;
  avatar?: string;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isCurrentUser,
  showAvatar = true,
  avatar,
}) => {
  return (
    <View
      style={[
        styles.container,
        isCurrentUser ? styles.currentUserContainer : styles.otherUserContainer,
      ]}
    >
      {!isCurrentUser && showAvatar && (
        <Image
          source={{
            uri:
              avatar ||
              "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
          }}
          style={styles.avatar}
        />
      )}

      <View
        style={[
          styles.bubble,
          isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble,
        ]}
      >
        <Text
          style={[
            styles.message,
            isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage,
          ]}
        >
          {message.content}
        </Text>

        <Text
          style={[
            styles.timestamp,
            isCurrentUser
              ? styles.currentUserTimestamp
              : styles.otherUserTimestamp,
          ]}
        >
          {formatTime(message.timestamp)}
        </Text>
      </View>

      {isCurrentUser && showAvatar && <View style={styles.avatarPlaceholder} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    marginBottom: 12,
    maxWidth: "80%",
  },
  currentUserContainer: {
    alignSelf: "flex-end",
  },
  otherUserContainer: {
    alignSelf: "flex-start",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    alignSelf: "flex-end",
    marginBottom: 4,
  },
  avatarPlaceholder: {
    width: 32,
    marginLeft: 8,
  },
  bubble: {
    borderRadius: 16,
    padding: 12,
    paddingBottom: 24,
  },
  currentUserBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  otherUserBubble: {
    backgroundColor: colors.card,
    borderBottomLeftRadius: 4,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
  },
  currentUserMessage: {
    color: colors.white,
  },
  otherUserMessage: {
    color: colors.text,
  },
  timestamp: {
    fontSize: 10,
    position: "absolute",
    bottom: 6,
    right: 12,
  },
  currentUserTimestamp: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  otherUserTimestamp: {
    color: colors.textLight,
  },
});
