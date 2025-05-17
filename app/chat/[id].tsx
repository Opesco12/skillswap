import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { Send } from "lucide-react-native";
import { MessageBubble } from "@/components/MessageBubble";
import { colors } from "@/constants/colors";
import { useMessages } from "@/context/MessagesContext";
import { useAuth } from "@/context/AuthContext";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/firebase";
import { Message, UserProfile } from "@/types";

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  const { user: currentUser } = useAuth();
  const { isLoading, fetchMessages, sendMessage, markMessageAsRead } =
    useMessages();
  const [messageText, setMessageText] = useState("");
  const [otherUser, setOtherUser] = useState<UserProfile | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [userError, setUserError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);

  // Fetch other user's profile
  useEffect(() => {
    const fetchOtherUser = async () => {
      if (!id) {
        setUserError("No user ID provided");
        setIsUserLoading(false);
        return;
      }

      setIsUserLoading(true);
      setUserError(null);

      try {
        const userRef = doc(db, "users", id);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          setUserError("User not found");
          setIsUserLoading(false);
          return;
        }

        const userData = {
          id: userSnap.id,
          avatar: userSnap.data().avatar || "https://via.placeholder.com/40",
          ...userSnap.data(),
        } as UserProfile;
        setOtherUser(userData);
      } catch (error: any) {
        console.error("ChatScreen: Error fetching user:", error);
        setUserError(error.message || "Failed to load user");
      } finally {
        setIsUserLoading(false);
      }
    };

    fetchOtherUser();
  }, [id]);

  // Fetch messages in real-time
  useEffect(() => {
    if (!currentUser?.id || !id) return;

    fetchMessages(); // Ensure MessagesContext state is populated

    const conversationId = [currentUser.id, id].sort().join("-");
    const messagesRef = collection(db, "messages");
    const q = query(
      messagesRef,
      where("senderId", "in", [currentUser.id, id]),
      where("receiverId", "in", [currentUser.id, id])
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const messages: Message[] = [];
        snapshot.forEach((doc) => {
          messages.push({ id: doc.id, ...doc.data() } as Message);
        });

        const sortedMessages = messages.sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        setChatMessages(sortedMessages);

        // Mark unread messages from other user as read
        sortedMessages.forEach((message) => {
          if (message?.senderId === id && !message?.isRead) {
            markMessageAsRead(message.id);
          }
        });

        // Scroll to bottom on new messages
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      },
      (error) => {
        console.error("ChatScreen: Error fetching messages:", error);
        setUserError("Failed to load messages");
      }
    );

    return () => unsubscribe();
  }, [currentUser?.id, id, fetchMessages, markMessageAsRead]);

  const handleSend = async () => {
    if (!messageText.trim() || !currentUser?.id || !id) return;

    try {
      await sendMessage({
        senderId: currentUser.id,
        receiverId: id,
        content: messageText.trim(),
      });

      setMessageText("");

      // Scroll to bottom after sending
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error: any) {
      console.error("ChatScreen: Error sending message:", error);
      setUserError("Failed to send message");
    }
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isCurrentUser = item?.senderId === currentUser?.id;
    const showAvatar =
      index === 0 || chatMessages[index - 1]?.senderId !== item?.senderId;

    return (
      <MessageBubble
        message={item}
        isCurrentUser={isCurrentUser}
        showAvatar={showAvatar}
        avatar={
          isCurrentUser
            ? currentUser?.avatar || "https://via.placeholder.com/40"
            : otherUser?.avatar || "https://via.placeholder.com/40"
        }
      />
    );
  };

  if (isUserLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator
          size="large"
          color={colors.primary}
        />
      </View>
    );
  }

  if (userError || !otherUser) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text style={styles.errorText}>{userError || "User not found"}</Text>
      </View>
    );
  }

  return (
    <View style={{ paddingTop: StatusBar.currentHeight, flex: 1 }}>
      <Stack.Screen
        options={{
          title: otherUser?.displayName || "Chat",
          headerBackTitle: "Back",
          headerTitle: () => (
            <View style={styles.headerTitle}>
              <Image
                source={{
                  uri: otherUser?.avatar || "https://via.placeholder.com/30",
                }}
                style={styles.headerAvatar}
              />
              <Text style={styles.headerName}>
                {otherUser?.displayName || "Unknown User"}
              </Text>
            </View>
          ),
        }}
      />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {isLoading && chatMessages.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              size="large"
              color={colors.primary}
            />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={chatMessages}
            renderItem={renderMessage}
            keyExtractor={(item) => item?.id || `${Math.random()}`}
            contentContainerStyle={styles.messagesList}
            onLayout={() =>
              flatListRef.current?.scrollToEnd({ animated: false })
            }
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: false })
            }
          />
        )}

        <View style={styles.inputContainer}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Type a message..."
            value={messageText}
            onChangeText={setMessageText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              !messageText.trim() && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!messageText.trim()}
          >
            <Send
              size={20}
              color={!messageText.trim() ? colors.textLight : colors.white}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerTitle: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
  },
  headerName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    textAlign: "center",
  },
  messagesList: {
    padding: 16,
  },
  inputContainer: {
    flexDirection: "row",
    padding: 8,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: colors.border,
  },
});
