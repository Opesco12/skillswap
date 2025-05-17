import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { MessageSquare } from "lucide-react-native";
import { ConversationItem } from "@/components/ConversationItem";
import { EmptyState } from "@/components/EmptyState";
import { colors } from "@/constants/colors";
import { useMessages } from "@/context/MessagesContext";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase";
import { Conversation, UserProfile } from "@/types";

export default function MessagesScreen() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const { isLoading, fetchConversations, getUserConversations } = useMessages();
  const [userCache, setUserCache] = useState<Map<string, UserProfile>>(
    new Map()
  );

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const fetchUserInfo = useCallback(
    async (userId: string): Promise<UserProfile | null> => {
      if (userCache.has(userId)) {
        return userCache.get(userId)!;
      }

      try {
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          console.warn("MessagesScreen: User not found:", userId);
          return null;
        }

        const userData = {
          id: userSnap.id,
          // avatar: "https://via.placeholder.com/40", // Fallback avatar
          ...userSnap.data(),
        } as UserProfile;

        setUserCache((prev) => new Map(prev).set(userId, userData));
        return userData;
      } catch (error: any) {
        console.error("MessagesScreen: Error fetching user:", error);
        return null;
      }
    },
    [userCache]
  );

  const handleConversationPress = useCallback(
    (conversation: Conversation) => {
      const otherUserId = conversation?.participants?.find(
        (id) => id !== currentUser?.id
      );
      if (otherUserId) {
        router.push(`/chat/${otherUserId}`);
      }
    },
    [currentUser?.id, router]
  );

  const renderConversationItem = useCallback(
    ({ item }: { item: Conversation }) => (
      <ConversationItem
        conversation={item}
        onPress={() => handleConversationPress(item)}
        currentUserId={currentUser?.id || ""}
        getUserInfo={fetchUserInfo}
      />
    ),
    [currentUser?.id, fetchUserInfo, handleConversationPress]
  );

  if (isLoading && getUserConversations(currentUser?.id || "").length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color={colors.primary}
        />
      </View>
    );
  }

  const userConversations = currentUser?.id
    ? getUserConversations(currentUser.id)
    : [];

  return (
    <View style={styles.container}>
      {userConversations.length > 0 ? (
        <FlatList
          data={userConversations}
          renderItem={renderConversationItem}
          keyExtractor={(item) => item?.id || `${Math.random()}`}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <EmptyState
          icon={
            <MessageSquare
              size={48}
              color={colors.textLight}
            />
          }
          title="No messages yet"
          message="Your conversations will appear here"
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
    paddingTop: StatusBar.currentHeight,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
