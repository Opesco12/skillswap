import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  TextInput,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import {
  MapPin,
  Calendar,
  Star,
  Shield,
  ArrowLeftRight,
  MessageSquare,
  Settings,
  Edit,
  LogOut,
  X,
} from "lucide-react-native";
import { Button } from "@/components/Button";
import { SkillCard } from "@/components/SkillCard";
import { RatingStars } from "@/components/RatingStars";
import { colors } from "@/constants/colors";
import { typography } from "@/constants/typography";
import { useAuth } from "@/context/AuthContext";
import { useSkills } from "@/context/SkillsContext";
import { useNotifications } from "@/context/NotificationsContext";
import { getDoc, collection, getDocs, doc } from "firebase/firestore";
import { db } from "@/firebase";
import {
  UserProfile,
  Skill,
  SkillCategory,
  SkillLevel,
  NotificationType,
  Rating,
} from "@/types";

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user: currentUser, logout, syncUserProfile } = useAuth();
  const {
    skills,
    categories,
    addSkill,
    isLoading: skillsLoading,
    isFetching,
    error: skillsError,
    fetchSkills,
  } = useSkills();
  const { addNotification } = useNotifications();

  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isOffered, setIsOffered] = useState(true);
  const [skillName, setSkillName] = useState("");
  const [skillCategory, setSkillCategory] =
    useState<SkillCategory>("technology");
  const [skillDescription, setSkillDescription] = useState("");
  const [skillLevel, setSkillLevel] = useState<SkillLevel>("beginner");
  const [skillExamples, setSkillExamples] = useState("");
  const [formError, setFormError] = useState("");
  const [ratings, setRatings] = useState<(Rating & { reviewerName: string })[]>(
    []
  );

  useEffect(() => {
    if (!currentUser) {
      console.log("UserProfileScreen: No current user, redirecting to login");
      router.replace("/login");
      return;
    }
    if (!id) {
      console.log("UserProfileScreen: No user ID provided");
      setFetchError("Invalid user ID");
      setIsLoading(false);
      return;
    }

    const fetchUserProfile = async () => {
      setIsLoading(true);
      setFetchError(null);
      try {
        const userDoc = await getDoc(doc(db, "users", id));
        if (!userDoc.exists()) {
          throw new Error("User not found");
        }
        const userData = userDoc.data();
        const ratingsRef = collection(db, `users/${id}/ratings`);
        const ratingsSnap = await getDocs(ratingsRef);
        const ratingsData = await Promise.all(
          ratingsSnap.docs.map(async (document) => {
            const rating = document.data() as Rating;
            const reviewerDoc = await getDoc(
              doc(db, `users/${rating.reviewerId!}`)
            );
            const reviewerName = reviewerDoc.exists()
              ? reviewerDoc?.data().displayName || "Anonymous"
              : "Anonymous";
            return { ...rating, reviewerName };
          })
        );

        const profile: UserProfile = {
          id,
          username: userData.username || `user${id}`,
          email: userData.email || "",
          displayName: userData.displayName || `User ${id}`,
          bio: userData.bio,
          avatar: userData.avatar || "https://via.placeholder.com/100",
          location: userData.location || { city: "", country: "" },
          skillsOffered: userData.skillsOffered || [],
          skillsNeeded: userData.skillsNeeded || [],
          trustScore: ratingsData.length
            ? ratingsData.reduce((sum, r) => sum + r.score, 0) /
              ratingsData.length
            : userData.trustScore || 0,
          memberSince: userData.memberSince,
          isVerified: userData.isVerified || false,
          completedExchanges: userData.completedExchanges || 0,
          ratings: ratingsData,
        };

        setUserProfile(profile);
        setRatings(ratingsData);

        if (profile.trustScore !== userData.trustScore) {
          await syncUserProfile(id, { trustScore: profile?.trustScore });
          console.log(
            "UserProfileScreen: Updated trust score:",
            profile.trustScore
          );
        }

        await fetchSkills();
      } catch (error: any) {
        console.error("UserProfileScreen: Error fetching user profile:", error);
        setFetchError(error.message || "Failed to load profile");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [id, currentUser, fetchSkills, syncUserProfile]);

  const handleAddSkill = useCallback(async () => {
    console.log("handleAddSkill: Starting, isOffered:", isOffered);
    if (!currentUser?.id) {
      setFormError("User not authenticated");
      return;
    }
    if (!skillName || !skillDescription) {
      setFormError("Name and description are required");
      return;
    }

    const targetArray = isOffered
      ? userProfile?.skillsOffered || []
      : userProfile?.skillsNeeded || [];
    if (targetArray.length >= 3) {
      setFormError(
        `Cannot add more than 3 ${isOffered ? "offered" : "needed"} skills`
      );
      return;
    }

    try {
      const newSkill: Omit<Skill, "id"> = {
        name: skillName,
        category: skillCategory,
        description: skillDescription,
        level: skillLevel,
        examples: skillExamples
          ? skillExamples.split(",").map((e) => e.trim())
          : [],
        userId: currentUser.id,
        isOffered,
      };

      await addSkill(newSkill, isOffered);

      setUserProfile((prev) =>
        prev
          ? {
              ...prev,
              [isOffered ? "skillsOffered" : "skillsNeeded"]: [
                ...(prev[isOffered ? "skillsOffered" : "skillsNeeded"] || []),
                { ...newSkill, id: `skill-${Date.now()}` },
              ],
            }
          : prev
      );

      await addNotification({
        userId: currentUser.id,
        type: "system" as NotificationType,
        title: "New Skill Added",
        message: `${currentUser.displayName} added a new ${
          isOffered ? "offered" : "needed"
        } skill: ${skillName}`,
        relatedId: undefined,
        isRead: false,
      });
      console.log("handleAddSkill: Notified about new skill");

      setModalVisible(false);
      setSkillName("");
      setSkillCategory("technology");
      setSkillDescription("");
      setSkillLevel("beginner");
      setSkillExamples("");
      setFormError("");
    } catch (err: any) {
      console.error("handleAddSkill: Error:", err);
      setFormError(err.message || "Failed to add skill");
    }
  }, [
    currentUser,
    skillName,
    skillCategory,
    skillDescription,
    skillLevel,
    skillExamples,
    isOffered,
    addSkill,
    userProfile,
    addNotification,
  ]);

  const handleMessage = useCallback(async () => {
    try {
      await addNotification({
        userId: id,
        type: "new_message" as NotificationType,
        title: "New Message",
        message: `New message from ${currentUser?.displayName || "Someone"}`,
        relatedId: `chat-${id}-${currentUser?.id}`,
        isRead: false,
      });
      console.log("UserProfileScreen: Notified user of new message");
      router.push(`/chat/${id}`);
    } catch (error) {
      console.error(
        "UserProfileScreen: Error sending message notification:",
        error
      );
    }
  }, [id, currentUser, addNotification, router]);

  const handleProposeExchange = useCallback(async () => {
    try {
      await addNotification({
        userId: id,
        type: "exchange_request" as NotificationType,
        title: "New Exchange Request",
        message: `${
          currentUser?.displayName || "Someone"
        } proposed an exchange`,
        relatedId: `exchange-${Date.now()}`,
        isRead: false,
      });
      console.log("UserProfileScreen: Notified user of exchange request");
      router.push(`/propose-exchange/${id}`);
    } catch (error) {
      console.error(
        "UserProfileScreen: Error sending exchange notification:",
        error
      );
    }
  }, [id, currentUser, addNotification, router]);

  const handleEditProfile = useCallback(() => {
    // router.push("/edit-profile");
  }, [router]);

  const handleSettings = useCallback(() => {
    // router.push("/settings");
  }, [router]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } catch (error) {
      console.error("UserProfileScreen: Logout failed:", error);
    }
  }, [logout]);

  if (isLoading || skillsLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color={colors.primary}
        />
      </View>
    );
  }

  if (fetchError || !userProfile) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>
          {fetchError || "Failed to load profile"}
        </Text>
      </View>
    );
  }

  const isCurrentUser = currentUser?.id === userProfile.id;
  // const userSkillsOffered = skills.filter(
  //   (skill) => skill.userId === id && skill?.isOffered
  // );
  const userSkillsOffered = skills.filter(
    (skill) => skill.userId === id && !skill?.isOffered
  );

  return (
    <>
      <Stack.Screen
        options={{ title: userProfile.displayName, headerBackTitle: "Back" }}
      />
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          {isCurrentUser && (
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={handleSettings}
              >
                <Settings
                  size={24}
                  color={colors.text}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={handleLogout}
              >
                <LogOut
                  size={24}
                  color={colors.text}
                />
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.profileInfo}>
            <Image
              source={{ uri: userProfile.avatar }}
              style={styles.avatar}
            />
            <Text style={styles.name}>{userProfile.displayName}</Text>
            <Text style={styles.username}>@{userProfile.username}</Text>
            {userProfile.bio && (
              <Text style={styles.bio}>{userProfile.bio}</Text>
            )}
            <View style={styles.locationContainer}>
              <MapPin
                size={16}
                color={colors.textSecondary}
                style={styles.locationIcon}
              />
              <Text style={styles.location}>
                {userProfile.location.city && userProfile.location.country
                  ? `${userProfile.location.city}, ${userProfile.location.country}`
                  : "Location not specified"}
              </Text>
            </View>
            {isCurrentUser ? (
              <Button
                title="Edit Profile"
                onPress={handleEditProfile}
                variant="outline"
                size="small"
                leftIcon={
                  <Edit
                    size={16}
                    color={colors.primary}
                  />
                }
                style={styles.editButton}
                accessibilityLabel="Edit profile"
              />
            ) : (
              <View style={styles.actionButtons}>
                <Button
                  title="Message"
                  onPress={handleMessage}
                  variant="primary"
                  size="medium"
                  leftIcon={
                    <MessageSquare
                      size={16}
                      color={colors.white}
                    />
                  }
                  style={styles.messageButton}
                />
                <Button
                  title="Propose Exchange"
                  onPress={handleProposeExchange}
                  variant="outline"
                  size="medium"
                  leftIcon={
                    <ArrowLeftRight
                      size={16}
                      color={colors.primary}
                    />
                  }
                  style={styles.exchangeButton}
                />
              </View>
            )}
          </View>
        </View>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {userProfile.completedExchanges}
            </Text>
            <Text style={styles.statLabel}>Exchanges</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={styles.ratingContainer}>
              <Text style={styles.statValue}>
                {userProfile.trustScore.toFixed(1)}
              </Text>
              <RatingStars
                rating={userProfile.trustScore}
                size={16}
              />
            </View>
            <Text style={styles.statLabel}>Trust Score</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={styles.memberSinceContainer}>
              <Calendar
                size={16}
                color={colors.textSecondary}
                style={styles.memberSinceIcon}
              />
              <Text style={styles.memberSince}>
                {userProfile.memberSince
                  ? new Date(userProfile.memberSince).toLocaleDateString(
                      "en-US",
                      {
                        month: "short",
                        year: "numeric",
                      }
                    )
                  : "N/A"}
              </Text>
            </View>
            <Text style={styles.statLabel}>Member Since</Text>
          </View>
        </View>
        {userProfile.isVerified && (
          <View style={styles.verifiedContainer}>
            <Shield
              size={16}
              color={colors.success}
              style={styles.verifiedIcon}
            />
            <Text style={styles.verifiedText}>Verified Account</Text>
          </View>
        )}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Skills I Offer</Text>
            {isCurrentUser && (
              <Button
                title="Add Skill"
                onPress={() => {
                  setIsOffered(true);
                  setModalVisible(true);
                }}
                variant="text"
                size="small"
                accessibilityLabel="Add skill to offer"
                disabled={userSkillsOffered.length >= 3}
              />
            )}
          </View>
          {isFetching && (
            <Text style={styles.loadingText}>Loading skills...</Text>
          )}
          {userSkillsOffered.length > 0 ? (
            <View style={styles.skillsContainer}>
              {userSkillsOffered.map((skill) => (
                <TouchableOpacity
                  key={skill.id}
                  onPress={() => router.push(`/skill/${skill.id}`)}
                  activeOpacity={0.7}
                >
                  <SkillCard
                    skill={skill}
                    compact
                  />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptySkillsContainer}>
              <ArrowLeftRight
                size={24}
                color={colors.textLight}
              />
              <Text style={styles.emptySkillsText}>
                {isCurrentUser
                  ? "You haven't added any skills yet. Add skills to start exchanging!"
                  : "This user hasn't added any skills yet."}
              </Text>
            </View>
          )}
        </View>
        {/* <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Skills I Want to Learn</Text>
            {isCurrentUser && (
              <Button
                title="Add Skill"
                onPress={() => {
                  setIsOffered(false);
                  setModalVisible(true);
                }}
                variant="text"
                size="small"
                accessibilityLabel="Add skill to learn"
                disabled={userSkillsNeeded.length >= 3}
              />
            )}
          </View> */}
        {/* {isFetching && (
            <Text style={styles.loadingText}>Loading skills...</Text>
          )}
          {userSkillsNeeded.length > 0 ? (
            <View style={styles.skillsContainer}>
              {userSkillsNeeded.map((skill) => (
                <TouchableOpacity
                  key={skill.id}
                  onPress={() => router.push(`/skill/${skill.id}`)}
                  activeOpacity={0.7}
                >
                  <SkillCard
                    skill={skill}
                    compact
                  />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptySkillsContainer}>
              <Star
                size={24}
                color={colors.textLight}
              />
              <Text style={styles.emptySkillsText}>
                {isCurrentUser
                  ? "Add skills you want to learn to find matching exchange partners"
                  : "This user hasn't added any skills to learn."}
              </Text>
            </View>
          )} */}
        {/* </View> */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ratings & Reviews</Text>
          {ratings.length > 0 ? (
            <View style={styles.ratingsContainer}>
              {ratings.map((rating) => (
                <View
                  key={rating.id}
                  style={styles.ratingItem}
                >
                  <RatingStars
                    rating={rating.score}
                    size={16}
                  />
                  <Text style={styles.ratingComment}>
                    {rating.comment || "No comment"}
                  </Text>
                  <Text style={styles.ratingReviewer}>
                    {rating.reviewerName} •{" "}
                    {new Date(rating.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyRatingsContainer}>
              <Star
                size={24}
                color={colors.textLight}
              />
              <Text style={styles.emptyRatingsText}>
                This user doesn't have any ratings yet.
              </Text>
            </View>
          )}
        </View>
        <View style={styles.footer} />
      </ScrollView>
      {isCurrentUser && (
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent={true}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  Add {isOffered ? "Skill Offered" : "Skill Needed"}
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <X
                    size={24}
                    color={colors.text}
                  />
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Skill Name"
                value={skillName}
                onChangeText={setSkillName}
              />
              <Picker
                selectedValue={skillCategory}
                style={styles.picker}
                onValueChange={(itemValue) => setSkillCategory(itemValue)}
              >
                {categories.map((category) => (
                  <Picker.Item
                    key={category}
                    label={category.charAt(0).toUpperCase() + category.slice(1)}
                    value={category}
                  />
                ))}
              </Picker>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Description"
                value={skillDescription}
                onChangeText={setSkillDescription}
                multiline
                numberOfLines={4}
              />
              <Picker
                selectedValue={skillLevel}
                style={styles.picker}
                onValueChange={(itemValue) => setSkillLevel(itemValue)}
              >
                <Picker.Item
                  label="Beginner"
                  value="beginner"
                />
                <Picker.Item
                  label="Intermediate"
                  value="intermediate"
                />
                <Picker.Item
                  label="Advanced"
                  value="advanced"
                />
                <Picker.Item
                  label="Expert"
                  value="expert"
                />
              </Picker>
              <TextInput
                style={styles.input}
                placeholder="Examples (comma-separated)"
                value={skillExamples}
                onChangeText={setSkillExamples}
              />
              {formError && <Text style={styles.errorText}>{formError}</Text>}
              {skillsError && (
                <Text style={styles.errorText}>{skillsError}</Text>
              )}
              <Button
                title="Add Skill"
                onPress={handleAddSkill}
                variant="primary"
                size="large"
                isLoading={skillsLoading}
                style={styles.addButton}
              />
            </View>
          </View>
        </Modal>
      )}
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
  headerActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 16,
  },
  iconButton: {
    padding: 8,
    marginLeft: 16,
  },
  profileInfo: {
    alignItems: "center",
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  name: {
    ...typography.h2,
    marginBottom: 4,
  },
  username: {
    ...typography.subtitle2,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  bio: {
    ...typography.body1,
    textAlign: "center",
    marginBottom: 16,
    paddingHorizontal: 24,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  locationIcon: {
    marginRight: 4,
  },
  location: {
    ...typography.body2,
    color: colors.textSecondary,
  },
  actionButtons: {
    flexDirection: "row",
    width: "100%",
  },
  messageButton: {
    flex: 1,
    marginRight: 8,
  },
  exchangeButton: {
    flex: 1,
    marginLeft: 8,
  },
  editButton: {
    minWidth: 120,
  },
  statsContainer: {
    flexDirection: "row",
    backgroundColor: colors.white,
    padding: 16,
    marginTop: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    ...typography.h3,
    marginBottom: 4,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  statDivider: {
    width: 1,
    height: "80%",
    backgroundColor: colors.border,
    alignSelf: "center",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  memberSinceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  memberSinceIcon: {
    marginRight: 4,
  },
  memberSince: {
    ...typography.body2,
  },
  verifiedContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.success + "10",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: "center",
    marginTop: 16,
  },
  verifiedIcon: {
    marginRight: 4,
  },
  verifiedText: {
    ...typography.body2,
    color: colors.success,
    fontWeight: "500",
  },
  section: {
    backgroundColor: colors.white,
    padding: 16,
    marginTop: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    ...typography.h4,
  },
  skillsContainer: {
    gap: 8,
  },
  emptySkillsContainer: {
    alignItems: "center",
    padding: 24,
    backgroundColor: colors.card,
    borderRadius: 8,
  },
  emptySkillsText: {
    ...typography.body2,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 8,
  },
  ratingsContainer: {
    gap: 16,
  },
  ratingItem: {
    padding: 12,
    backgroundColor: colors.card,
    borderRadius: 8,
  },
  ratingComment: {
    ...typography.body2,
    color: colors.textSecondary,
    marginVertical: 8,
  },
  ratingReviewer: {
    ...typography.caption,
    color: colors.textLight,
  },
  emptyRatingsContainer: {
    alignItems: "center",
    padding: 24,
    backgroundColor: colors.card,
    borderRadius: 8,
  },
  emptyRatingsText: {
    ...typography.body2,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 8,
  },
  loadingText: {
    ...typography.body2,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 8,
  },
  errorText: {
    ...typography.body2,
    color: colors.error,
    textAlign: "center",
    margin: 16,
  },
  footer: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: colors.white,
    padding: 20,
    borderRadius: 12,
    width: "90%",
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    ...typography.h4,
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
  picker: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    marginBottom: 16,
  },
  addButton: {
    marginTop: 16,
  },
});
