import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import {
  Calendar,
  Clock,
  MapPin,
  FileText,
  CheckCircle,
  XCircle,
  MessageSquare,
  Star,
} from "lucide-react-native";
import { Button } from "@/components/Button";
import { SkillCard } from "@/components/SkillCard";
import { colors } from "@/constants/colors";
import { typography } from "@/constants/typography";
import { useExchanges } from "@/context/ExchangesContext";
import { useSkills } from "@/context/SkillsContext";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationsContext";
import {
  Exchange,
  ExchangeStatus,
  Skill,
  UserProfile,
  Rating,
  ExchangeRating,
  NotificationType,
} from "@/types";
import { formatDateTime } from "@/utils/date-utils";
import { db } from "@/firebase";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";

export default function ExchangeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const {
    exchanges,
    isLoading: exchangesLoading,
    updateExchangeStatus,
    error: exchangesError,
  } = useExchanges();
  const {
    skills,
    isFetching: skillsFetching,
    error: skillsError,
  } = useSkills();
  const { user: currentUser } = useAuth();
  const { addNotification } = useNotifications();

  const [exchange, setExchange] = useState<Exchange | null>(null);
  const [initiatorSkill, setInitiatorSkill] = useState<Skill | null>(null);
  const [recipientSkill, setRecipientSkill] = useState<Skill | null>(null);
  const [initiatorUser, setInitiatorUser] = useState<UserProfile | null>(null);
  const [recipientUser, setRecipientUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRatingScore, setUserRatingScore] = useState(0);
  const [userRatingComment, setUserRatingComment] = useState("");
  const [exchangeRatingScore, setExchangeRatingScore] = useState(0);
  const [exchangeRatingComment, setExchangeRatingComment] = useState("");
  const [hasRatedUser, setHasRatedUser] = useState(false);
  const [hasRatedExchange, setHasRatedExchange] = useState(false);

  const fetchData = async () => {
    if (!id || !currentUser?.id) {
      setError("Missing exchange ID or user not authenticated");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Find exchange
      const foundExchange = exchanges.find((e) => e.id === id);
      if (!foundExchange) {
        throw new Error("Exchange not found");
      }
      setExchange(foundExchange);

      // Fetch initiator and recipient user data
      const initiatorRef = doc(db, "users", foundExchange.initiatorId);
      const initiatorSnap = await getDoc(initiatorRef);
      if (!initiatorSnap.exists()) {
        throw new Error("Initiator user not found");
      }
      const initiatorData = initiatorSnap.data() as UserProfile;
      setInitiatorUser({
        ...initiatorData,
        id: initiatorSnap.id,
        location: initiatorData.location || { city: "", country: "" },
        skillsOffered: initiatorData.skillsOffered || [],
        skillsNeeded: initiatorData.skillsNeeded || [],
        ratings: initiatorData.ratings || [],
      });

      const recipientRef = doc(db, "users", foundExchange.recipientId);
      const recipientSnap = await getDoc(recipientRef);
      if (!recipientSnap.exists()) {
        throw new Error("Recipient user not found");
      }
      const recipientData = recipientSnap.data() as UserProfile;
      setRecipientUser({
        ...recipientData,
        id: recipientSnap.id,
        location: recipientData.location || { city: "", country: "" },
        skillsOffered: recipientData.skillsOffered || [],
        skillsNeeded: recipientData.skillsNeeded || [],
        ratings: recipientData.ratings || [],
      });

      // Set skills
      const foundInitiatorSkill = skills.find(
        (s) => s.id === foundExchange.initiatorSkillId
      );
      setInitiatorSkill(foundInitiatorSkill || null);

      const foundRecipientSkill = skills.find(
        (s) => s.id === foundExchange.recipientSkillId
      );
      setRecipientSkill(foundRecipientSkill || null);

      // Check if user has already rated
      const targetUserId =
        foundExchange.initiatorId === currentUser.id
          ? foundExchange.recipientId
          : foundExchange.initiatorId;
      const userRatingRef = doc(
        db,
        `users/${targetUserId}/ratings`,
        `${id}_${currentUser.id}`
      );
      const userRatingSnap = await getDoc(userRatingRef);
      setHasRatedUser(userRatingSnap.exists());

      const exchangeRatingRef = doc(
        db,
        `exchanges/${id}/ratings`,
        `${id}_${currentUser.id}`
      );
      const exchangeRatingSnap = await getDoc(exchangeRatingRef);
      setHasRatedExchange(exchangeRatingSnap.exists());
    } catch (err: any) {
      console.error("Error fetching data:", err);
      setError(err.message || "Failed to load exchange details");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch exchange, skills, user data, and rating status
  useEffect(() => {
    fetchData();
  }, [id, currentUser, exchanges, skills]);

  // Handle context errors
  useEffect(() => {
    if (exchangesError) {
      Alert.alert("Error", exchangesError);
    }
    if (skillsError) {
      Alert.alert("Error", skillsError);
    }
    if (error) {
      Alert.alert("Error", error, [
        {
          text: "Retry",
          onPress: () => {
            setIsLoading(true);
            setError(null);
            fetchData();
          },
        },
        {
          text: "Go Back",
          onPress: () => router.back(),
          style: "cancel",
        },
      ]);
    }
  }, [exchangesError, skillsError, error, router]);

  const isCurrentUserInitiator = exchange?.initiatorId === currentUser?.id;
  const isCurrentUserRecipient = exchange?.recipientId === currentUser?.id;
  const canAcceptOrDecline =
    isCurrentUserRecipient && exchange?.status === "pending";
  const canCancel =
    (isCurrentUserInitiator || isCurrentUserRecipient) &&
    (exchange?.status === "pending" || exchange?.status === "accepted");
  const canComplete =
    (isCurrentUserInitiator || isCurrentUserRecipient) &&
    exchange?.status === "in_progress";
  const canRate =
    (isCurrentUserInitiator || isCurrentUserRecipient) &&
    exchange?.status === "completed";

  const handleAccept = useCallback(async () => {
    if (exchange) {
      try {
        await updateExchangeStatus(exchange.id, "accepted");
        Alert.alert("Success", "Exchange accepted successfully");
      } catch (err: any) {
        Alert.alert("Error", err.message || "Failed to accept exchange");
      }
    }
  }, [exchange, updateExchangeStatus]);

  const handleDecline = useCallback(async () => {
    if (exchange) {
      try {
        await updateExchangeStatus(exchange.id, "declined");
        Alert.alert("Success", "Exchange declined");
      } catch (err: any) {
        Alert.alert("Error", err.message || "Failed to decline exchange");
      }
    }
  }, [exchange, updateExchangeStatus]);

  const handleCancel = useCallback(async () => {
    if (exchange) {
      Alert.alert(
        "Cancel Exchange",
        "Are you sure you want to cancel this exchange?",
        [
          { text: "No", style: "cancel" },
          {
            text: "Yes",
            style: "destructive",
            onPress: async () => {
              try {
                await updateExchangeStatus(exchange.id, "canceled");
                Alert.alert("Success", "Exchange canceled");
              } catch (err: any) {
                Alert.alert(
                  "Error",
                  err.message || "Failed to cancel exchange"
                );
              }
            },
          },
        ]
      );
    }
  }, [exchange, updateExchangeStatus]);

  const handleStartExchange = useCallback(async () => {
    if (exchange) {
      try {
        await updateExchangeStatus(exchange.id, "in_progress");
        Alert.alert("Success", "Exchange started");
      } catch (err: any) {
        Alert.alert("Error", err.message || "Failed to start exchange");
      }
    }
  }, [exchange, updateExchangeStatus]);

  const handleCompleteExchange = useCallback(async () => {
    if (exchange) {
      try {
        await updateExchangeStatus(exchange.id, "completed");
        Alert.alert("Success", "Exchange completed");
      } catch (err: any) {
        Alert.alert("Error", err.message || "Failed to complete exchange");
      }
    }
  }, [exchange, updateExchangeStatus]);

  const handleMessage = useCallback(() => {
    const otherUserId = isCurrentUserInitiator
      ? exchange?.recipientId
      : exchange?.initiatorId;
    if (otherUserId) {
      router.push(`/chat/${otherUserId}`);
    } else {
      Alert.alert("Error", "Unable to start chat");
    }
  }, [exchange, isCurrentUserInitiator, router]);

  const handleRateUser = useCallback(async () => {
    if (!currentUser?.id || !exchange || userRatingScore < 1 || hasRatedUser) {
      Alert.alert("Error", "Invalid rating or already rated");
      return;
    }
    try {
      const targetUserId = isCurrentUserInitiator
        ? exchange.recipientId
        : exchange.initiatorId;
      const ratingId = `${exchange.id}_${currentUser.id}`;
      const rating: Rating = {
        id: ratingId,
        score: userRatingScore,
        comment: userRatingComment,
        reviewerId: currentUser.id,
        exchangeId: exchange.id,
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, `users/${targetUserId}/ratings`, ratingId), rating);

      // Update trustScore
      const ratingsRef = collection(db, `users/${targetUserId}/ratings`);
      const ratingsSnap = await getDocs(ratingsRef);
      const ratings = ratingsSnap.docs.map((doc) => doc.data() as Rating);
      const trustScore = ratings.length
        ? ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length
        : 0;
      await setDoc(
        doc(db, "users", targetUserId),
        { trustScore },
        { merge: true }
      );

      // Send notification
      await addNotification({
        userId: targetUserId,
        type: "new_rating" as NotificationType,
        title: "New Rating Received",
        message: `${currentUser.displayName} rated you for an exchange`,
        relatedId: exchange.id,
        isRead: false,
      });

      setHasRatedUser(true);
      setUserRatingScore(0);
      setUserRatingComment("");
      Alert.alert("Success", "User rating submitted");
    } catch (err: any) {
      console.error("handleRateUser: Error:", err);
      Alert.alert("Error", err.message || "Failed to submit user rating");
    }
  }, [
    currentUser,
    exchange,
    userRatingScore,
    userRatingComment,
    hasRatedUser,
    addNotification,
    isCurrentUserInitiator,
  ]);

  const handleRateExchange = useCallback(async () => {
    if (
      !currentUser?.id ||
      !exchange ||
      exchangeRatingScore < 1 ||
      hasRatedExchange
    ) {
      Alert.alert("Error", "Invalid rating or already rated");
      return;
    }
    try {
      const ratingId = `${exchange.id}_${currentUser.id}`;
      const rating: ExchangeRating = {
        id: ratingId,
        score: exchangeRatingScore,
        comment: exchangeRatingComment,
        reviewerId: currentUser.id,
        exchangeId: exchange.id,
        createdAt: new Date().toISOString(),
      };
      await setDoc(
        doc(db, `exchanges/${exchange.id}/ratings`, ratingId),
        rating
      );

      setHasRatedExchange(true);
      setExchangeRatingScore(0);
      setExchangeRatingComment("");
      Alert.alert("Success", "Exchange rating submitted");
    } catch (err: any) {
      console.error("handleRateExchange: Error:", err);
      Alert.alert("Error", err.message || "Failed to submit exchange rating");
    }
  }, [
    currentUser,
    exchange,
    exchangeRatingScore,
    exchangeRatingComment,
    hasRatedExchange,
  ]);

  const getStatusColor = (status: ExchangeStatus): string => {
    switch (status) {
      case "pending":
        return colors.warning;
      case "accepted":
        return colors.info;
      case "declined":
        return colors.error;
      case "canceled":
        return colors.error;
      case "completed":
        return colors.success;
      case "in_progress":
        return colors.primary;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusText = (status: ExchangeStatus): string => {
    switch (status) {
      case "pending":
        return "Pending";
      case "accepted":
        return "Accepted";
      case "declined":
        return "Declined";
      case "canceled":
        return "Canceled";
      case "completed":
        return "Completed";
      case "in_progress":
        return "In Progress";
      default:
        return status;
    }
  };

  if (
    isLoading ||
    exchangesLoading ||
    skillsFetching ||
    !exchange ||
    !initiatorUser ||
    !recipientUser
  ) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color={colors.primary}
        />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "Exchange Details",
          headerBackTitle: "Back",
        }}
      />

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.statusContainer}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(exchange.status) },
              ]}
            >
              <Text style={styles.statusText}>
                {getStatusText(exchange.status)}
              </Text>
            </View>
          </View>

          <Text style={styles.title}>Skill Exchange</Text>

          <View style={styles.exchangeDetails}>
            <View style={styles.detailItem}>
              <Calendar
                size={16}
                color={colors.textSecondary}
                style={styles.detailIcon}
              />
              <Text style={styles.detailText}>
                {formatDateTime(exchange.proposedDate)}
              </Text>
            </View>

            <View style={styles.detailItem}>
              <Clock
                size={16}
                color={colors.textSecondary}
                style={styles.detailIcon}
              />
              <Text style={styles.detailText}>
                {exchange.proposedDuration} minutes
              </Text>
            </View>

            <View style={styles.detailItem}>
              <MapPin
                size={16}
                color={colors.textSecondary}
                style={styles.detailIcon}
              />
              <Text style={styles.detailText}>{exchange.proposedLocation}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Exchange Participants</Text>

          <View style={styles.participantsContainer}>
            <View style={styles.participant}>
              <Image
                source={{ uri: initiatorUser.avatar }}
                style={styles.participantAvatar}
              />
              <Text style={styles.participantName}>
                {initiatorUser.displayName}
              </Text>
              <Text style={styles.participantRole}>Initiator</Text>
            </View>

            <View style={styles.exchangeArrow}>
              <Text style={styles.exchangeArrowText}>⟷</Text>
            </View>

            <View style={styles.participant}>
              <Image
                source={{ uri: recipientUser.avatar }}
                style={styles.participantAvatar}
              />
              <Text style={styles.participantName}>
                {recipientUser.displayName}
              </Text>
              <Text style={styles.participantRole}>Recipient</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Skills Being Exchanged</Text>

          <View style={styles.skillsContainer}>
            <View style={styles.skillItem}>
              <Text style={styles.skillOwner}>
                {initiatorUser.displayName} offers:
              </Text>
              {initiatorSkill ? (
                <SkillCard
                  skill={initiatorSkill}
                  compact
                />
              ) : (
                <Text style={styles.errorText}>Initiator skill not found</Text>
              )}
            </View>

            <View style={styles.skillItem}>
              <Text style={styles.skillOwner}>
                {recipientUser.displayName} offers:
              </Text>
              {recipientSkill ? (
                <SkillCard
                  skill={recipientSkill}
                  compact
                />
              ) : (
                <Text style={styles.errorText}>Recipient skill not found</Text>
              )}
            </View>
          </View>
        </View>

        {exchange.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <View style={styles.notesContainer}>
              <FileText
                size={16}
                color={colors.textSecondary}
                style={styles.notesIcon}
              />
              <Text style={styles.notes}>{exchange.notes}</Text>
            </View>
          </View>
        )}

        {canRate && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Rate{" "}
                {isCurrentUserInitiator
                  ? recipientUser.displayName
                  : initiatorUser.displayName}
              </Text>
              {hasRatedUser ? (
                <Text style={styles.infoText}>
                  You have already rated this user.
                </Text>
              ) : (
                <>
                  <View style={styles.ratingStars}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <TouchableOpacity
                        key={star}
                        onPress={() => setUserRatingScore(star)}
                      >
                        <Star
                          size={32}
                          color={
                            star <= userRatingScore
                              ? colors.primary
                              : colors.textLight
                          }
                          fill={
                            star <= userRatingScore ? colors.primary : "none"
                          }
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Add a comment (optional)"
                    value={userRatingComment}
                    onChangeText={setUserRatingComment}
                    multiline
                    numberOfLines={4}
                  />
                  <Button
                    title="Submit User Rating"
                    onPress={handleRateUser}
                    variant="primary"
                    size="medium"
                    disabled={userRatingScore < 1}
                    style={styles.fullWidthButton}
                  />
                </>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Rate This Exchange</Text>
              {hasRatedExchange ? (
                <Text style={styles.infoText}>
                  You have already rated this exchange.
                </Text>
              ) : (
                <>
                  <View style={styles.ratingStars}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <TouchableOpacity
                        key={star}
                        onPress={() => setExchangeRatingScore(star)}
                      >
                        <Star
                          size={32}
                          color={
                            star <= exchangeRatingScore
                              ? colors.primary
                              : colors.textLight
                          }
                          fill={
                            star <= exchangeRatingScore
                              ? colors.primary
                              : "none"
                          }
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Add a comment (optional)"
                    value={exchangeRatingComment}
                    onChangeText={setExchangeRatingComment}
                    multiline
                    numberOfLines={4}
                  />
                  <Button
                    title="Submit Exchange Rating"
                    onPress={handleRateExchange}
                    variant="primary"
                    size="medium"
                    disabled={exchangeRatingScore < 1}
                    style={styles.fullWidthButton}
                  />
                </>
              )}
            </View>
          </>
        )}

        <View style={styles.actionsContainer}>
          {canAcceptOrDecline && (
            <View style={styles.actionButtons}>
              <Button
                title="Accept"
                onPress={handleAccept}
                variant="primary"
                leftIcon={
                  <CheckCircle
                    size={20}
                    color={colors.white}
                  />
                }
                style={styles.acceptButton}
              />
              <Button
                title="Decline"
                onPress={handleDecline}
                variant="outline"
                leftIcon={
                  <XCircle
                    size={20}
                    color={colors.primary}
                  />
                }
                style={styles.declineButton}
              />
            </View>
          )}

          {exchange.status === "accepted" && (
            <Button
              title="Start Exchange"
              onPress={handleStartExchange}
              variant="primary"
              style={styles.fullWidthButton}
            />
          )}

          {canComplete && (
            <Button
              title="Complete Exchange"
              onPress={handleCompleteExchange}
              variant="primary"
              leftIcon={
                <CheckCircle
                  size={20}
                  color={colors.white}
                />
              }
              style={styles.fullWidthButton}
            />
          )}

          <View style={styles.secondaryActions}>
            <Button
              title="Message"
              onPress={handleMessage}
              variant="outline"
              leftIcon={
                <MessageSquare
                  size={20}
                  color={colors.primary}
                />
              }
              style={styles.messageButton}
            />
            {canCancel && (
              <Button
                title="Cancel"
                onPress={handleCancel}
                variant="outline"
                leftIcon={
                  <XCircle
                    size={20}
                    color={colors.error}
                  />
                }
                style={styles.cancelButton}
                textStyle={{ color: colors.error }}
              />
            )}
          </View>
        </View>

        <View style={styles.footer} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    backgroundColor: colors.white,
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statusContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.white,
  },
  title: {
    ...typography.h2,
    textAlign: "center",
    marginBottom: 24,
  },
  exchangeDetails: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 8,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  detailIcon: {
    marginRight: 8,
  },
  detailText: {
    ...typography.body2,
    color: colors.textSecondary,
  },
  section: {
    backgroundColor: colors.white,
    padding: 16,
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    ...typography.h4,
    marginBottom: 16,
  },
  participantsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  participant: {
    alignItems: "center",
    flex: 2,
  },
  participantAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
  },
  participantName: {
    ...typography.subtitle1,
    marginBottom: 4,
  },
  participantRole: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  exchangeArrow: {
    flex: 1,
    alignItems: "center",
  },
  exchangeArrowText: {
    fontSize: 24,
    color: colors.primary,
  },
  skillsContainer: {
    gap: 16,
  },
  skillItem: {
    gap: 8,
  },
  skillOwner: {
    ...typography.subtitle2,
    color: colors.textSecondary,
  },
  errorText: {
    ...typography.body2,
    color: colors.error,
    textAlign: "center",
  },
  notesContainer: {
    flexDirection: "row",
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 8,
  },
  notesIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  notes: {
    ...typography.body1,
    flex: 1,
    lineHeight: 24,
  },
  actionsContainer: {
    padding: 16,
    marginTop: 16,
    marginHorizontal: 16,
  },
  actionButtons: {
    flexDirection: "row",
    marginBottom: 16,
  },
  acceptButton: {
    flex: 1,
    marginRight: 8,
  },
  declineButton: {
    flex: 1,
    marginLeft: 8,
    borderColor: colors.error,
  },
  fullWidthButton: {
    marginBottom: 16,
  },
  secondaryActions: {
    flexDirection: "row",
  },
  messageButton: {
    flex: 1,
    marginRight: 8,
  },
  cancelButton: {
    flex: 1,
    marginLeft: 8,
    borderColor: colors.error,
  },
  footer: {
    height: 40,
  },
  ratingStars: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    ...typography.body1,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  infoText: {
    ...typography.body2,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
