import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  StatusBar,
  Modal,
  TextInput,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import {
  Edit,
  MapPin,
  Calendar,
  Star,
  Shield,
  ArrowLeftRight,
  LogOut,
  X,
  Image as ImageIcon,
} from "lucide-react-native";
import axios from "axios";
import { Button } from "@/components/Button";
import { SkillCard } from "@/components/SkillCard";
import { RatingStars } from "@/components/RatingStars";
import { colors } from "@/constants/colors";
import { typography } from "@/constants/typography";
import { useAuth } from "@/context/AuthContext";
import { useSkills } from "@/context/SkillsContext";
import { useNotifications } from "@/context/NotificationsContext";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/firebase";
import { Rating, Skill, SkillCategory, SkillLevel } from "@/types";
import {
  CLOUDINARY_API_URL,
  CLOUDINARY_UPLOAD_PRESET,
  CLOUDINARY_CLOUD_NAME,
} from "../../constants/cloudinary";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, syncUserProfile } = useAuth();
  const { categories, addSkill, isLoading, isFetching, error, fetchSkills } =
    useSkills();
  const { addNotification } = useNotifications();

  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [isOffered, setIsOffered] = useState(true);
  const [skillName, setSkillName] = useState("");
  const [skillCategory, setSkillCategory] =
    useState<SkillCategory>("technology");
  const [skillDescription, setSkillDescription] = useState("");
  const [skillLevel, setSkillLevel] = useState<SkillLevel>("beginner");
  const [skillExamples, setSkillExamples] = useState("");
  const [formError, setFormError] = useState("");
  const [ratingsError, setRatingsError] = useState<string | null>(null);
  const [hasInitializedSkills, setHasInitializedSkills] = useState(false);
  const [ratings, setRatings] = useState<(Rating & { reviewerName: string })[]>(
    []
  );
  // Edit profile states
  const [editDisplayName, setEditDisplayName] = useState(
    user?.displayName || ""
  );
  const [editUsername, setEditUsername] = useState(user?.username || "");
  const [editBio, setEditBio] = useState(user?.bio || "");
  const [editAvatar, setEditAvatar] = useState(user?.avatar || "");
  const [editCity, setEditCity] = useState(user?.location?.city || "");
  const [editCountry, setEditCountry] = useState(user?.location?.country || "");
  const [editFormError, setEditFormError] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedImage, setSelectedImage] =
    useState<ImagePicker.ImagePickerAsset | null>(null);

  useEffect(() => {
    console.log("ProfileScreen: Initial setup effect");
    if (!user) {
      console.log("ProfileScreen: No user, redirecting to login");
      router.replace("/login");
    } else if (!hasInitializedSkills) {
      console.log("ProfileScreen: Fetching skills initially");
      fetchSkills()
        .then(() => {
          setHasInitializedSkills(true);
          console.log("ProfileScreen: Skills fetched successfully");
        })
        .catch((err) => {
          console.error("Failed to fetch skills:", err);
          setHasInitializedSkills(true);
        });
    }
  }, [user, hasInitializedSkills, fetchSkills, router]);

  const fetchRatings = useCallback(
    async (userId: string) => {
      if (!userId) {
        console.warn("fetchRatings: No userId provided");
        return;
      }

      console.log("fetchRatings: Starting for userId:", userId);
      try {
        const ratingsRef = collection(db, `users/${userId}/ratings`);
        const ratingsSnap = await getDocs(ratingsRef);
        const ratingsData = await Promise.all(
          ratingsSnap.docs.map(async (document) => {
            const rating = document.data() as Rating;
            const reviewerDoc = await getDoc(
              doc(db, "users", rating.reviewerId)
            );
            const reviewerName = reviewerDoc.exists()
              ? reviewerDoc.data().displayName || "Anonymous"
              : "Anonymous";
            return { ...rating, reviewerName };
          })
        );
        setRatings(ratingsData);

        const trustScore = ratingsData.length
          ? ratingsData.reduce((sum, r) => sum + r.score, 0) /
            ratingsData.length
          : user?.trustScore || 0;

        if (user?.trustScore !== trustScore) {
          await syncUserProfile(userId, { trustScore });
          console.log("fetchRatings: Updated user trust score:", trustScore);
        }
        setRatingsError(null);
      } catch (error: any) {
        console.error("fetchRatings: Error:", error.message);
        setRatingsError("Failed to load ratings");
      }
    },
    [user?.trustScore, syncUserProfile]
  );

  useEffect(() => {
    if (user?.id) {
      console.log("ProfileScreen: Fetching ratings for user:", user.id);
      fetchRatings(user.id);
    }
  }, [user?.id, fetchRatings]);

  const handleAddSkill = useCallback(async () => {
    console.log("handleAddSkill: Starting, isOffered:", isOffered);
    if (!user?.id) {
      setFormError("User not authenticated");
      return;
    }
    if (!skillName || !skillDescription) {
      setFormError("Name and description are required");
      return;
    }

    const targetArray = isOffered
      ? user.skillsOffered || []
      : user.skillsNeeded || [];
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
        userId: user.id,
        isOffered,
      };

      await addSkill(newSkill, isOffered);

      await addNotification({
        userId: user.id,
        type: "system" as const,
        title: "New Skill Added",
        message: `${user.displayName} added a new ${
          isOffered ? "offered" : "needed"
        } skill: ${skillName}`,
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
    user,
    skillName,
    skillCategory,
    skillDescription,
    skillLevel,
    skillExamples,
    isOffered,
    addSkill,
    addNotification,
  ]);

  const validateUsername = useCallback(
    async (username: string, currentUserId: string) => {
      if (!username.match(/^[a-zA-Z0-9_-]{3,20}$/)) {
        return "Username must be 3-20 characters, alphanumeric with underscores or hyphens";
      }
      const q = query(
        collection(db, "users"),
        where("username", "==", username)
      );
      const querySnapshot = await getDocs(q);
      const isTaken = querySnapshot.docs.some(
        (doc) => doc.id !== currentUserId
      );
      return isTaken ? "Username is already taken" : "";
    },
    []
  );

  const handlePickImage = useCallback(async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        setEditFormError("Permission to access gallery was denied");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        exif: false,
      });

      if (result.canceled) {
        console.log("User cancelled image picker");
        return;
      }

      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
        setEditFormError("Image size must be less than 5MB");
        return;
      }

      setSelectedImage(asset);
      setEditAvatar(asset.uri);
    } catch (error: any) {
      console.error("ImagePicker Error:", error);
      setEditFormError(`Failed to pick image: ${error.message}`);
    }
  }, []);

  const handleUpdateProfile = useCallback(async () => {
    if (!user?.id) {
      setEditFormError("User not authenticated");
      return;
    }
    if (!editDisplayName) {
      setEditFormError("Display name is required");
      return;
    }
    if (editDisplayName.length > 50) {
      setEditFormError("Display name must be 50 characters or less");
      return;
    }
    if (editBio.length > 200) {
      setEditFormError("Bio must be 200 characters or less");
      return;
    }
    if (editCity.length > 100 || editCountry.length > 100) {
      setEditFormError("City and country must be 100 characters or less");
      return;
    }

    const usernameError = await validateUsername(editUsername, user.id);
    if (usernameError) {
      setEditFormError(usernameError);
      return;
    }

    setIsUpdating(true);
    try {
      let avatarUrl = editAvatar;
      if (selectedImage && selectedImage.uri) {
        const mimeType = selectedImage.mimeType || "image/jpeg";
        const formData = new FormData();
        formData.append("file", {
          uri: selectedImage.uri,
          type: mimeType,
          name: `avatar_${user.id}.${mimeType.split("/")[1]}`,
        } as any);
        formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
        formData.append("cloud_name", CLOUDINARY_CLOUD_NAME);
        formData.append("public_id", `avatars/${user.id}`); // Overwrite existing avatar

        const response = await axios.post(CLOUDINARY_API_URL, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        avatarUrl = response?.data?.url;
        if (response.data.secure_url) {
          console.log(
            "handleUpdateProfile: Image uploaded to Cloudinary, URL:",
            avatarUrl
          );
        } else {
          throw new Error("Failed to retrieve secure URL from Cloudinary");
        }
      }

      const updatedProfile = Object.fromEntries(
        Object.entries({
          displayName: editDisplayName,
          username: editUsername,
          bio: editBio || null,
          avatar: avatarUrl || null,
          location:
            editCity || editCountry
              ? { city: editCity, country: editCountry }
              : null,
        }).filter(([_, value]) => value !== undefined)
      ) as Partial<UserProfile>;

      await syncUserProfile(user.id, updatedProfile);

      await addNotification({
        userId: user.id,
        type: "system" as const,
        title: "Profile Updated",
        message: `${user.displayName} updated their profile`,
        isRead: false,
      });

      setEditModalVisible(false);
      setSelectedImage(null);
      setEditFormError("");
      console.log("handleUpdateProfile: Profile updated successfully");
    } catch (err: any) {
      console.error("handleUpdateProfile: Error:", err.response?.data || err);
      if (err.code?.startsWith("firestore")) {
        setEditFormError(`Firestore error: ${err.message}`);
      } else {
        setEditFormError(
          err.response?.data?.error?.message ||
            err.message ||
            "Failed to update profile"
        );
      }
    } finally {
      setIsUpdating(false);
    }
  }, [
    user,
    editDisplayName,
    editUsername,
    editBio,
    editAvatar,
    editCity,
    editCountry,
    selectedImage,
    syncUserProfile,
    addNotification,
    validateUsername,
  ]);

  const handleEditProfile = useCallback(() => {
    setEditDisplayName(user?.displayName || "");
    setEditUsername(user?.username || "");
    setEditBio(user?.bio || "");
    setEditAvatar(user?.avatar || "");
    setEditCity(user?.location?.city || "");
    setEditCountry(user?.location?.country || "");
    setSelectedImage(null);
    setEditFormError("");
    setEditModalVisible(true);
  }, [user]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }, [logout]);

  const handleSettings = useCallback(() => {
    // router.push("/settings");
  }, [router]);

  const skillsOffered = useMemo(
    () => user?.skillsOffered || [],
    [user?.skillsOffered]
  );
  const skillsNeeded = useMemo(
    () => user?.skillsNeeded || [],
    [user?.skillsNeeded]
  );

  if (!user) {
    return null;
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <View style={styles.headerActions}>
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
        <View style={styles.profileInfo}>
          <Image
            source={{ uri: user.avatar || "https://via.placeholder.com/100" }}
            style={styles.avatar}
          />
          <Text style={styles.name}>{user.displayName}</Text>
          <Text style={styles.username}>@{user.username}</Text>
          {user.bio ? (
            <Text style={styles.bio}>{user.bio}</Text>
          ) : (
            <Text style={styles.emptyBio}>
              Add a bio to tell others about yourself
            </Text>
          )}
          <View style={styles.locationContainer}>
            <MapPin
              size={16}
              color={colors.textSecondary}
              style={styles.locationIcon}
            />
            <Text style={styles.location}>
              {user.location?.city && user.location?.country
                ? `${user.location.city}, ${user.location.country}`
                : "Location not specified"}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{user.completedExchanges}</Text>
          <Text style={styles.statLabel}>Exchanges</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <View style={styles.ratingContainer}>
            <RatingStars
              rating={user.trustScore}
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
              {user.memberSince
                ? new Date(user.memberSince).toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                  })
                : "N/A"}
            </Text>
          </View>
          <Text style={styles.statLabel}>Member Since</Text>
        </View>
      </View>
      {ratingsError && <Text style={styles.errorText}>{ratingsError}</Text>}
      {user.isVerified && (
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
          <Button
            title="Add Skill"
            onPress={() => {
              setIsOffered(true);
              setModalVisible(true);
            }}
            variant="text"
            size="small"
            accessibilityLabel="Add skill to offer"
            disabled={skillsOffered.length >= 3}
          />
        </View>
        {isFetching && (
          <Text style={styles.loadingText}>Loading skills...</Text>
        )}
        {skillsOffered.length > 0 ? (
          <View style={styles.skillsContainer}>
            {skillsOffered.map((skill) => (
              <SkillCard
                key={skill.id}
                skill={skill}
                compact
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptySkillsContainer}>
            <ArrowLeftRight
              size={24}
              color={colors.textLight}
            />
            <Text style={styles.emptySkillsText}>
              You have not added any skills yet. Add skills to start exchanging!
            </Text>
          </View>
        )}
      </View>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Skills I Want to Learn</Text>
          <Button
            title="Add Skill"
            onPress={() => {
              setIsOffered(false);
              setModalVisible(true);
            }}
            variant="text"
            size="small"
            accessibilityLabel="Add skill to learn"
            disabled={skillsNeeded.length >= 3}
          />
        </View>
        {isFetching && (
          <Text style={styles.loadingText}>Loading skills...</Text>
        )}
        {skillsNeeded.length > 0 ? (
          <View style={styles.skillsContainer}>
            {skillsNeeded.map((skill) => (
              <SkillCard
                key={skill.id}
                skill={skill}
                compact
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptySkillsContainer}>
            <Star
              size={24}
              color={colors.textLight}
            />
            <Text style={styles.emptySkillsText}>
              Add skills you want to learn to find matching exchange partners
            </Text>
          </View>
        )}
      </View>
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
              You don't have any ratings yet.
            </Text>
          </View>
        )}
      </View>
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
              accessibilityLabel="Skill name"
            />
            <Picker
              selectedValue={skillCategory}
              style={styles.picker}
              onValueChange={(itemValue) => setSkillCategory(itemValue)}
              accessibilityLabel="Skill category"
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
              accessibilityLabel="Skill description"
            />
            <Picker
              selectedValue={skillLevel}
              style={styles.picker}
              onValueChange={(itemValue) => setSkillLevel(itemValue)}
              accessibilityLabel="Skill level"
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
              accessibilityLabel="Skill examples"
            />
            {formError && <Text style={styles.errorText}>{formError}</Text>}
            {error && <Text style={styles.errorText}>{error}</Text>}
            <Button
              title="Add Skill"
              onPress={handleAddSkill}
              variant="primary"
              size="large"
              isLoading={isLoading}
              style={styles.addButton}
              accessibilityLabel="Submit skill"
            />
          </View>
        </View>
      </Modal>
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <X
                  size={24}
                  color={colors.text}
                />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Display Name"
              value={editDisplayName}
              onChangeText={setEditDisplayName}
              maxLength={50}
              accessibilityLabel="Display name"
            />
            <TextInput
              style={styles.input}
              placeholder="Username"
              value={editUsername}
              onChangeText={setEditUsername}
              maxLength={20}
              accessibilityLabel="Username"
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Bio"
              value={editBio}
              onChangeText={setEditBio}
              multiline
              numberOfLines={4}
              maxLength={200}
              accessibilityLabel="Bio"
            />
            <View style={styles.imagePickerContainer}>
              {selectedImage ? (
                <Image
                  source={{ uri: selectedImage.uri }}
                  style={styles.imagePreview}
                />
              ) : editAvatar ? (
                <Image
                  source={{ uri: editAvatar }}
                  style={styles.imagePreview}
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <ImageIcon
                    size={24}
                    color={colors.textLight}
                  />
                </View>
              )}
              <Button
                title="Pick Avatar from Gallery"
                onPress={handlePickImage}
                variant="outline"
                size="small"
                leftIcon={
                  <ImageIcon
                    size={16}
                    color={colors.primary}
                  />
                }
                style={styles.imagePickerButton}
                accessibilityLabel="Pick avatar from gallery"
              />
            </View>
            <TextInput
              style={styles.input}
              placeholder="City (optional)"
              value={editCity}
              onChangeText={setEditCity}
              maxLength={100}
              accessibilityLabel="City"
            />
            <TextInput
              style={styles.input}
              placeholder="Country (optional)"
              value={editCountry}
              onChangeText={setEditCountry}
              maxLength={100}
              accessibilityLabel="Country"
            />
            <Button
              title="Save Changes"
              onPress={handleUpdateProfile}
              variant="primary"
              size="large"
              isLoading={isUpdating}
              style={styles.addButton}
              accessibilityLabel="Save profile changes"
            />
          </View>
        </View>
      </Modal>
      <View style={styles.footer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.white,
    padding: 16,
    paddingBottom: 24,
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
  emptyBio: {
    ...typography.body2,
    color: colors.textLight,
    textAlign: "center",
    marginBottom: 16,
    paddingHorizontal: 24,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  locationIcon: {
    marginRight: 4,
  },
  location: {
    ...typography.body2,
    color: colors.textSecondary,
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
    color: colors.error,
    ...typography.body2,
    marginBottom: 16,
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: colors.white,
    padding: 20,
    borderRadius: 12,
    width: "100%",
    maxHeight: "90%",
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
  imagePickerContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 8,
  },
  imagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.card,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  imagePickerButton: {
    minWidth: 200,
  },
});
