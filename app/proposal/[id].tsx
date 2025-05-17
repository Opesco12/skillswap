import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  Platform,
  Dimensions,
} from "react-native";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import {
  Calendar,
  Clock,
  Upload,
  X,
  CheckCircle,
  AlertCircle,
} from "lucide-react-native";
import * as DocumentPicker from "expo-document-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { getDoc, doc } from "firebase/firestore";

import { Button } from "@/components/Button";
import { colors } from "@/constants/colors";
import { typography } from "@/constants/typography";
import { useAuth } from "@/context/AuthContext";
import { useSkills } from "@/context/SkillsContext";
import { useExchanges } from "@/context/ExchangesContext";
import { db } from "@/firebase";
import {
  UserProfile,
  Skill,
  Exchange,
  ExchangeStatus,
  Attachment,
} from "@/types";

export default function ProposeExchangeScreen() {
  const { id: recipientId, skillId } = useLocalSearchParams<{
    id: string;
    skillId?: string;
  }>();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const { skills, fetchSkills, isFetching, error: skillsError } = useSkills();
  const { createExchange, error: exchangeError } = useExchanges();

  const [isLoading, setIsLoading] = useState(true);
  const [recipientProfile, setRecipientProfile] = useState<UserProfile | null>(
    null
  );
  const [requestedSkill, setRequestedSkill] = useState<Skill | null>(null);
  const [selectedMySkill, setSelectedMySkill] = useState<Skill | null>(null);
  const [proposalDetails, setProposalDetails] = useState("");
  const [proposedDate, setProposedDate] = useState(new Date());
  const [proposedTime, setProposedTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [proposedLocation, setProposedLocation] = useState("");
  const [proposedDuration, setProposedDuration] = useState("60");
  const [documents, setDocuments] = useState<
    DocumentPicker.DocumentPickerAsset[]
  >([]);
  const [isSending, setIsSending] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Get my skills
  const mySkills = skills.filter((skill) => skill.userId === currentUser?.id);

  // Fetch recipient data, requested skill, and ensure skills are fetched
  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser?.id) {
        Alert.alert("Error", "You must be logged in to propose an exchange");
        router.back();
        return;
      }

      setIsLoading(true);
      try {
        // Fetch recipient profile
        const userRef = doc(db, "users", recipientId);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          throw new Error("User not found");
        }
        const userData = userSnap.data() as UserProfile;
        setRecipientProfile({
          ...userData,
          id: userSnap.id,
          location: userData.location || { city: "", country: "" },
          skillsOffered: userData.skillsOffered || [],
          skillsNeeded: userData.skillsNeeded || [],
          ratings: userData.ratings || [],
        });

        // Fetch requested skill
        if (skillId) {
          const skillRef = doc(db, "skills", skillId);
          const skillSnap = await getDoc(skillRef);
          if (!skillSnap.exists()) {
            throw new Error("Requested skill not found");
          }
          const skillData = { id: skillSnap.id, ...skillSnap.data() } as Skill;
          setRequestedSkill(skillData);
        } else {
          throw new Error("No skill ID provided");
        }

        // Ensure skills are fetched
        if (!isFetching && skills.length === 0) {
          const unsubscribe = fetchSkills(currentUser.id);
          return () => unsubscribe();
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        Alert.alert("Error", "Failed to load data", [
          {
            text: "Retry",
            onPress: () => setRetryCount((prev) => prev + 1),
          },
          {
            text: "Go Back",
            onPress: () => router.back(),
            style: "cancel",
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    if (recipientId && skillId) {
      fetchData();
    } else {
      setIsLoading(false);
      Alert.alert("Error", "Missing recipient or skill ID", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    }
  }, [
    recipientId,
    skillId,
    currentUser,
    skills,
    isFetching,
    fetchSkills,
    router,
    retryCount,
  ]);

  // Handle skills and exchange errors
  useEffect(() => {
    if (skillsError) {
      Alert.alert("Error", skillsError);
    }
    if (exchangeError) {
      Alert.alert("Error", exchangeError);
    }
  }, [skillsError, exchangeError]);

  // Handle date picker changes
  const onChangeDate = useCallback(
    (event: any, selectedDate?: Date) => {
      const currentDate = selectedDate || proposedDate;
      setShowDatePicker(Platform.OS === "ios");
      setProposedDate(currentDate);
    },
    [proposedDate]
  );

  // Handle time picker changes
  const onChangeTime = useCallback(
    (event: any, selectedTime?: Date) => {
      const currentTime = selectedTime || proposedTime;
      setShowTimePicker(Platform.OS === "ios");
      setProposedTime(currentTime);
    },
    [proposedTime]
  );

  // Handle document picker
  const pickDocument = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*", "video/*"],
        copyToCacheDirectory: true,
      });

      if (result.canceled === false) {
        const asset = result.assets[0];
        const supportedTypes = ["image", "document", "video"];
        const mimeType = asset.mimeType || "";
        const type = mimeType.startsWith("image/")
          ? "image"
          : mimeType.startsWith("video/")
          ? "video"
          : mimeType === "application/pdf"
          ? "document"
          : null;

        if (!type || !supportedTypes.includes(type)) {
          Alert.alert(
            "Error",
            "Unsupported file type. Please upload an image, video, or PDF."
          );
          return;
        }

        setDocuments((prev) => [...prev, asset]);
      }
    } catch (error) {
      console.error("Error picking document:", error);
      Alert.alert("Error", "Failed to pick document");
    }
  }, []);

  // Remove document from list
  const removeDocument = useCallback((index: number) => {
    setDocuments((prev) => {
      const newDocuments = [...prev];
      newDocuments.splice(index, 1);
      return newDocuments;
    });
  }, []);

  // Send proposal
  const sendProposal = useCallback(async () => {
    if (!currentUser) {
      Alert.alert("Error", "You must be logged in to propose an exchange");
      return;
    }

    if (!selectedMySkill) {
      Alert.alert("Error", "Please select a skill you're offering");
      return;
    }

    if (!requestedSkill) {
      Alert.alert("Error", "Requested skill is not available");
      return;
    }

    if (!proposalDetails.trim()) {
      Alert.alert("Error", "Please enter some details about your proposal");
      return;
    }

    if (!proposedLocation.trim()) {
      Alert.alert("Error", "Please enter a proposed location");
      return;
    }

    const duration = parseInt(proposedDuration, 10);
    if (isNaN(duration) || duration <= 0) {
      Alert.alert("Error", "Please enter a valid duration in minutes");
      return;
    }

    const dateTime = new Date(proposedDate);
    dateTime.setHours(proposedTime.getHours());
    dateTime.setMinutes(proposedTime.getMinutes());

    if (dateTime < new Date()) {
      Alert.alert("Error", "Proposed date and time cannot be in the past");
      return;
    }

    setIsSending(true);

    try {
      const attachments = await Promise.all(
        documents.map(async (doc, index) => {
          const response = await fetch(doc.uri);
          const blob = await response.blob();
          const file = new File([blob], doc.name, { type: doc.mimeType || "" });
          return {
            id: `doc-${index}-${Date.now()}`,
            url: doc.uri,
            type: doc.mimeType?.startsWith("image/")
              ? "image"
              : doc.mimeType?.startsWith("video/")
              ? "video"
              : ("document" as "image" | "document" | "video"),
            name: doc.name,
            size: doc.size || 0,
            uploadedAt: new Date().toISOString(),
            file,
          };
        })
      );

      const exchange: Omit<
        Exchange,
        "id" | "createdAt" | "updatedAt" | "completedAt"
      > & {
        attachments?: (Attachment & { file: File })[];
      } = {
        initiatorId: currentUser.id,
        recipientId: recipientId,
        initiatorSkillId: selectedMySkill.id,
        recipientSkillId: requestedSkill.id,
        status: "pending",
        proposedDate: dateTime.toISOString(),
        proposedDuration: duration,
        proposedLocation,
        notes: proposalDetails,
        attachments,
      };

      const exchangeId = await createExchange(exchange);

      Alert.alert("Success", "Your proposal has been sent successfully!", [
        {
          text: "View Proposal",
          onPress: () => router.push(`/exchange/${exchangeId}`),
        },
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error("Error sending proposal:", error);
      Alert.alert("Error", "Failed to send proposal. Please try again.");
    } finally {
      setIsSending(false);
    }
  }, [
    currentUser,
    selectedMySkill,
    requestedSkill,
    proposalDetails,
    proposedLocation,
    proposedDuration,
    proposedDate,
    proposedTime,
    documents,
    recipientId,
    createExchange,
    router,
  ]);

  if (isLoading || !recipientProfile || !requestedSkill) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color={colors.primary}
        />
      </View>
    );
  }

  if (mySkills.length === 0 && !isFetching) {
    return (
      <View style={styles.errorContainer}>
        <AlertCircle
          size={48}
          color={colors.error}
        />
        <Text style={styles.errorText}>
          No skills found. Please add a skill to propose an exchange.
        </Text>
        <Button
          title="Add a Skill"
          onPress={() => router.push("/skills/add")}
          variant="primary"
          size="large"
          style={styles.errorButton}
        />
        <Button
          title="Go Back"
          onPress={() => router.back()}
          variant="secondary"
          size="large"
          style={styles.errorButton}
        />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "Propose Exchange",
          headerBackTitle: "Back",
        }}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Recipient Info */}
        <View style={styles.recipientContainer}>
          <Text style={styles.sectionTitle}>Proposing to</Text>
          <View style={styles.recipientInfo}>
            <Image
              source={{ uri: recipientProfile.avatar }}
              style={styles.avatar}
            />
            <View style={styles.recipientDetails}>
              <Text style={styles.recipientName}>
                {recipientProfile.displayName}
              </Text>
              <Text style={styles.recipientUsername}>
                @{recipientProfile.username}
              </Text>
              <Text style={styles.recipientLocation}>
                {recipientProfile.location.city},{" "}
                {recipientProfile.location.country}
              </Text>
              <Text style={styles.recipientTrustScore}>
                Trust Score: {recipientProfile.trustScore.toFixed(1)}
              </Text>
            </View>
          </View>
        </View>

        {/* Your Skill Offer */}
        <View
          style={[
            styles.section,
            !selectedMySkill && isSending ? styles.sectionError : {},
          ]}
        >
          <Text style={styles.sectionTitle}>Your Skill Offer</Text>
          <Text style={styles.sectionSubtitle}>
            Select a skill you'll provide
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.skillsScrollView}
            contentContainerStyle={styles.skillsScrollContent}
          >
            {mySkills.length > 0 ? (
              mySkills.map((skill) => (
                <TouchableOpacity
                  key={skill.id}
                  style={[
                    styles.skillCard,
                    selectedMySkill?.id === skill.id &&
                      styles.selectedSkillCard,
                  ]}
                  onPress={() => setSelectedMySkill(skill)}
                  activeOpacity={0.7}
                  accessibilityLabel={`Select skill: ${skill.name}`}
                  accessibilityHint="Tap to choose this skill to offer"
                  accessibilityRole="button"
                >
                  <Text style={styles.skillTitle}>{skill.name}</Text>
                  <Text style={styles.skillCategory}>{skill.category}</Text>
                  <Text style={styles.skillLevel}>Level: {skill.level}</Text>
                  {selectedMySkill?.id === skill.id && (
                    <View style={styles.selectedCheck}>
                      <CheckCircle
                        size={20}
                        color={colors.white}
                      />
                    </View>
                  )}
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.noSkillsCard}>
                <AlertCircle
                  size={24}
                  color={colors.warning}
                />
                <Text style={styles.noSkillsText}>
                  You haven't added any skills yet
                </Text>
                <TouchableOpacity
                  onPress={() => router.push("/skills/add")}
                  accessibilityLabel="Add a new skill"
                  accessibilityHint="Tap to navigate to the skill creation page"
                  accessibilityRole="button"
                >
                  <Text style={styles.addSkillLink}>Add a skill</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>

        {/* Requested Skill */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Requested Skill</Text>
          <Text style={styles.sectionSubtitle}>
            The skill you want in return
          </Text>

          <View style={[styles.skillCard, styles.nonEditableSkillCard]}>
            <Text style={styles.skillTitle}>{requestedSkill.name}</Text>
            <Text style={styles.skillCategory}>{requestedSkill.category}</Text>
            <Text style={styles.skillLevel}>Level: {requestedSkill.level}</Text>
          </View>
        </View>

        {/* Proposal Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Proposal Details</Text>
          <Text style={styles.sectionSubtitle}>
            Describe what you're looking to learn or exchange
          </Text>

          <TextInput
            style={styles.detailsInput}
            placeholder="Example: I'd like to learn basic guitar chords in exchange for teaching you how to make fresh pasta."
            placeholderTextColor={colors.textLight}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            value={proposalDetails}
            onChangeText={setProposalDetails}
            accessibilityLabel="Proposal details input"
            accessibilityHint="Enter a description of your exchange proposal"
          />
        </View>

        {/* Proposed Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Proposed Location</Text>
          <Text style={styles.sectionSubtitle}>
            Suggest where you'd like to meet
          </Text>

          <TextInput
            style={styles.detailsInput}
            placeholder="Example: Local community center or virtual meeting"
            placeholderTextColor={colors.textLight}
            value={proposedLocation}
            onChangeText={setProposedLocation}
            accessibilityLabel="Proposed location input"
            accessibilityHint="Enter the location for the exchange"
          />
        </View>

        {/* Proposed Duration */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Proposed Duration</Text>
          <Text style={styles.sectionSubtitle}>
            Suggest how long the exchange will take (in minutes)
          </Text>

          <TextInput
            style={styles.detailsInput}
            placeholder="Example: 60"
            placeholderTextColor={colors.textLight}
            keyboardType="numeric"
            value={proposedDuration}
            onChangeText={setProposedDuration}
            accessibilityLabel="Proposed duration input"
            accessibilityHint="Enter the duration of the exchange in minutes"
          />
        </View>

        {/* Date and Time */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Proposed Date & Time</Text>
          <Text style={styles.sectionSubtitle}>
            Suggest when you'd like to meet
          </Text>

          <View style={styles.dateTimeContainer}>
            <TouchableOpacity
              style={styles.dateTimeButton}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
              accessibilityLabel="Select date"
              accessibilityHint="Tap to open the date picker"
              accessibilityRole="button"
            >
              <Calendar
                size={20}
                color={colors.primary}
              />
              <Text style={styles.dateTimeText}>
                {proposedDate.toLocaleDateString()}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dateTimeButton}
              onPress={() => setShowTimePicker(true)}
              activeOpacity={0.7}
              accessibilityLabel="Select time"
              accessibilityHint="Tap to open the time picker"
              accessibilityRole="button"
            >
              <Clock
                size={20}
                color={colors.primary}
              />
              <Text style={styles.dateTimeText}>
                {proposedTime.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={proposedDate}
              mode="date"
              display={Platform.OS === "ios" ? "inline" : "default"}
              onChange={onChangeDate}
              minimumDate={new Date()}
            />
          )}

          {showTimePicker && (
            <DateTimePicker
              value={proposedTime}
              mode="time"
              display={Platform.OS === "ios" ? "inline" : "default"}
              onChange={onChangeTime}
            />
          )}
        </View>

        {/* Documents */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reference Materials</Text>
          <Text style={styles.sectionSubtitle}>
            Optional: Upload images, videos, or PDF documents
          </Text>

          <View style={styles.documentsContainer}>
            {documents.map((doc, index) => (
              <View
                key={index}
                style={styles.documentItem}
              >
                <Text
                  style={styles.documentName}
                  numberOfLines={1}
                >
                  {doc.name}
                </Text>
                <TouchableOpacity
                  style={styles.removeDocumentButton}
                  onPress={() => removeDocument(index)}
                  activeOpacity={0.7}
                  accessibilityLabel={`Remove document ${doc.name}`}
                  accessibilityHint="Tap to remove this uploaded file"
                  accessibilityRole="button"
                >
                  <X
                    size={16}
                    color={colors.error}
                  />
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity
              style={styles.addDocumentButton}
              onPress={pickDocument}
              activeOpacity={0.7}
              accessibilityLabel="Upload file"
              accessibilityHint="Tap to upload an image, video, or PDF"
              accessibilityRole="button"
            >
              <Upload
                size={20}
                color={colors.primary}
              />
              <Text style={styles.addDocumentText}>
                {documents.length > 0 ? "Add Another File" : "Upload File"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Submit Button */}
        <View style={styles.buttonContainer}>
          <Button
            title="Send Proposal"
            onPress={sendProposal}
            variant="primary"
            size="large"
            loading={isSending}
            disabled={
              isSending ||
              !selectedMySkill ||
              !requestedSkill ||
              !proposalDetails.trim() ||
              !proposedLocation.trim() ||
              !proposedDuration.trim()
            }
            style={styles.submitButton}
            accessibilityLabel="Send proposal"
            accessibilityHint="Tap to submit your exchange proposal"
          />
        </View>
      </ScrollView>
    </>
  );
}

const windowWidth = Dimensions.get("window").width;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
    padding: 20,
  },
  errorText: {
    ...typography.body1,
    color: colors.textPrimary,
    textAlign: "center",
    marginVertical: 20,
  },
  errorButton: {
    marginVertical: 10,
    width: "80%",
  },
  recipientContainer: {
    backgroundColor: colors.white,
    padding: 20,
    margin: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  section: {
    backgroundColor: colors.white,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionError: {
    borderColor: colors.error,
    borderWidth: 1,
  },
  sectionTitle: {
    ...typography.h4,
    fontWeight: "bold",
    color: colors.textPrimary || "#1A1A1A",
    marginBottom: 8,
    textAlign: "center",
  },
  sectionSubtitle: {
    ...typography.body2,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  recipientInfo: {
    alignItems: "center",
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recipientDetails: {
    flex: 1,
  },
  recipientName: {
    ...typography.subtitle1,
    fontWeight: "600",
    color: colors.textPrimary || "#1A1A1A",
  },
  recipientUsername: {
    ...typography.body2,
    color: colors.textSecondary,
    marginTop: 4,
  },
  recipientLocation: {
    ...typography.body2,
    color: colors.textSecondary,
    marginTop: 4,
  },
  recipientTrustScore: {
    ...typography.body2,
    color: colors.textSecondary,
    marginTop: 4,
  },
  skillsScrollView: {
    flexGrow: 0,
  },
  skillsScrollContent: {
    paddingRight: 16,
  },
  skillCard: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    width: windowWidth / 2 - 32,
    marginRight: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedSkillCard: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
    shadowColor: colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  nonEditableSkillCard: {
    borderColor: colors.border,
    backgroundColor: colors.card,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    width: "100%",
    marginRight: 0,
  },
  skillTitle: {
    ...typography.subtitle1,
    fontWeight: "600",
    color: colors.textPrimary || "#1A1A1A",
    marginBottom: 4,
  },
  skillCategory: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: "capitalize",
    marginBottom: 4,
  },
  skillLevel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: "capitalize",
  },
  selectedCheck: {
    position: "absolute",
    right: 8,
    top: 8,
    backgroundColor: colors.primary,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  noSkillsCard: {
    backgroundColor: colors.card,
    padding: 20,
    borderRadius: 12,
    width: windowWidth / 2 - 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  noSkillsText: {
    ...typography.body2,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 12,
    marginBottom: 12,
    lineHeight: 20,
  },
  addSkillLink: {
    ...typography.button,
    color: colors.primary,
    fontWeight: "600",
  },
  detailsInput: {
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    minHeight: 120,
    ...typography.body1,
    color: colors.textPrimary || "#1A1A1A",
    lineHeight: 22,
  },
  dateTimeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  dateTimeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    flex: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  dateTimeText: {
    ...typography.body2,
    color: colors.textPrimary || "#1A1A1A",
    marginLeft: 8,
    flex: 1,
  },
  documentsContainer: {
    gap: 12,
  },
  documentItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  documentName: {
    ...typography.body2,
    color: colors.textPrimary || "#1A1A1A",
    flex: 1,
    marginRight: 8,
  },
  removeDocumentButton: {
    padding: 8,
    backgroundColor: colors.white,
    borderRadius: 8,
  },
  addDocumentButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: "dashed",
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  addDocumentText: {
    ...typography.button,
    color: colors.primary,
    marginLeft: 8,
    fontWeight: "600",
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    alignItems: "center",
  },
  submitButton: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 12,
    paddingVertical: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
