import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import {
  MapPin,
  Star,
  Shield,
  ArrowLeftRight,
  MessageSquare,
} from "lucide-react-native";
import { Button } from "@/components/Button";
import { SkillCard } from "@/components/SkillCard";
import { RatingStars } from "@/components/RatingStars";
import { colors } from "@/constants/colors";
import { typography } from "@/constants/typography";
import { useAuth } from "@/context/AuthContext";
import { useSkills } from "@/context/SkillsContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase";
import { Skill, UserProfile } from "@/types";

export default function SkillScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const { categories } = useSkills();

  const [isLoading, setIsLoading] = useState(true);
  const [skill, setSkill] = useState<Skill | null>(null);
  const [ownerProfile, setOwnerProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSkillAndOwner = async () => {
      if (!id) {
        setError("No skill ID provided");
        setIsLoading(false);
        return;
      }

      console.log("SkillScreen: Fetching skill, id:", id);
      setIsLoading(true);
      setError(null);

      try {
        // Fetch skill
        const skillRef = doc(db, "skills", id);
        const skillSnap = await getDoc(skillRef);

        if (!skillSnap.exists()) {
          setError("Skill not found");
          setIsLoading(false);
          return;
        }

        const skillData = { id: skillSnap.id, ...skillSnap.data() } as Skill;
        setSkill(skillData);

        // Fetch owner profile
        const userRef = doc(db, "users", skillData.userId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          setError("Skill owner not found");
          setIsLoading(false);
          return;
        }

        const userData = { id: userSnap.id, ...userSnap.data() } as UserProfile;
        setOwnerProfile(userData);

        console.log(
          "SkillScreen: Fetched skill:",
          skillData?.name,
          "Owner:",
          userData?.displayName
        );
      } catch (err: any) {
        console.error("SkillScreen: Error fetching skill or owner:", err);
        setError(err.message || "Failed to load skill details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSkillAndOwner();
  }, [id]);

  const handleMessage = useCallback(() => {
    if (ownerProfile?.id) {
      console.log(
        "SkillScreen: Navigating to chat with user:",
        ownerProfile.id
      );
      router.push(`/chat/${ownerProfile.id}`);
    }
  }, [ownerProfile?.id, router]);

  const handleProposeExchange = useCallback(() => {
    if (skill?.id && ownerProfile?.id) {
      console.log("SkillScreen: Proposing exchange for skill:", skill.id);
      router.push(`/proposal/${ownerProfile.id}?skillId=${skill.id}`);
    }
  }, [skill?.id, ownerProfile?.id, router]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color={colors.primary}
        />
      </View>
    );
  }

  if (error || !skill || !ownerProfile) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          {error || "Skill or owner not found"}
        </Text>
        <Button
          title="Go Back"
          onPress={() => router.back()}
          variant="outline"
          size="medium"
        />
      </View>
    );
  }

  const isCurrentUser = currentUser?.id === ownerProfile?.id;
  const otherSkillsOffered = (ownerProfile?.skillsOffered || []).filter(
    (s) => s.id !== skill?.id
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: skill?.name || "Skill",
          headerBackTitle: "Back",
        }}
      />
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.skillInfo}>
            <Text style={styles.skillName}>
              {skill?.name || "Unnamed Skill"}
            </Text>
            <Text style={styles.skillCategory}>
              {categories
                ?.find((c) => c === skill?.category)
                ?.charAt(0)
                .toUpperCase() + (skill?.category?.slice(1) || "") ||
                skill?.category ||
                "Uncategorized"}
            </Text>
            <Text style={styles.skillLevel}>
              Level: {skill?.level || "Not specified"}
            </Text>
            {skill?.description && (
              <Text style={styles.skillDescription}>{skill.description}</Text>
            )}
            {skill?.examples?.length > 0 && (
              <View style={styles.examplesContainer}>
                <Text style={styles.examplesTitle}>Examples:</Text>
                {skill?.examples?.map((example, index) => (
                  <Text
                    key={index}
                    style={styles.exampleItem}
                  >
                    • {example}
                  </Text>
                ))}
              </View>
            )}
            {!isCurrentUser && (
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

        <View style={styles.ownerSection}>
          <Text style={styles.sectionTitle}>Offered by</Text>
          <TouchableOpacity
            onPress={() =>
              ownerProfile?.id && router.push(`/profile/${ownerProfile.id}`)
            }
            activeOpacity={0.7}
          >
            <View style={styles.ownerInfo}>
              <Image
                source={{
                  uri: ownerProfile?.avatar || "https://via.placeholder.com/60",
                }}
                style={styles.ownerAvatar}
              />
              <View style={styles.ownerDetails}>
                <Text style={styles.ownerName}>
                  {ownerProfile?.displayName || "Anonymous"}
                </Text>
                <Text style={styles.ownerUsername}>
                  @{ownerProfile?.username || "unknown"}
                </Text>
                <View style={styles.ownerLocation}>
                  <MapPin
                    size={14}
                    color={colors.textSecondary}
                    style={styles.locationIcon}
                  />
                  <Text style={styles.locationText}>
                    {ownerProfile?.location?.city &&
                    ownerProfile?.location?.country
                      ? `${ownerProfile.location.city}, ${ownerProfile.location.country}`
                      : "Location not specified"}
                  </Text>
                </View>
                <View style={styles.ownerStats}>
                  <RatingStars
                    rating={ownerProfile?.trustScore || 0}
                    size={14}
                  />
                  <Text style={styles.trustScore}>
                    {(ownerProfile?.trustScore || 0).toFixed(1)} (
                    {ownerProfile?.completedExchanges || 0} exchanges)
                  </Text>
                </View>
                {ownerProfile?.isVerified && (
                  <View style={styles.verifiedContainer}>
                    <Shield
                      size={14}
                      color={colors.success}
                      style={styles.verifiedIcon}
                    />
                    <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {otherSkillsOffered?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Other Skills by {ownerProfile?.displayName || "Anonymous"}
            </Text>
            <View style={styles.skillsContainer}>
              {otherSkillsOffered.map((s) => (
                <TouchableOpacity
                  key={s?.id}
                  onPress={() => s?.id && router.push(`/skill/${s.id}`)}
                  activeOpacity={0.7}
                >
                  <SkillCard
                    skill={s}
                    compact
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ratings & Reviews</Text>
          {ownerProfile?.ratings?.length > 0 ? (
            <View>
              <Text style={styles.comingSoonText}>
                Ratings display coming soon
              </Text>
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
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  errorText: {
    ...typography.body1,
    color: colors.error,
    marginBottom: 16,
    textAlign: "center",
  },
  header: {
    backgroundColor: colors.white,
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  skillInfo: {
    alignItems: "center",
  },
  skillName: {
    ...typography.h2,
    marginBottom: 8,
  },
  skillCategory: {
    ...typography.subtitle2,
    color: colors.primary,
    marginBottom: 8,
  },
  skillLevel: {
    ...typography.body2,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  skillDescription: {
    ...typography.body1,
    textAlign: "center",
    marginBottom: 16,
    paddingHorizontal: 24,
  },
  examplesContainer: {
    width: "100%",
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  examplesTitle: {
    ...typography.body2,
    fontWeight: "600",
    marginBottom: 8,
  },
  exampleItem: {
    ...typography.body2,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  actionButtons: {
    flexDirection: "row",
    width: "100%",
    gap: 8,
  },
  messageButton: {
    flex: 1,
  },
  exchangeButton: {
    flex: 1,
  },
  ownerSection: {
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
  sectionTitle: {
    ...typography.h4,
    marginBottom: 16,
  },
  ownerInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  ownerAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  ownerDetails: {
    flex: 1,
  },
  ownerName: {
    ...typography.h4,
    marginBottom: 4,
  },
  ownerUsername: {
    ...typography.body2,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  ownerLocation: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  locationIcon: {
    marginRight: 4,
  },
  locationText: {
    ...typography.body2,
    color: colors.textSecondary,
  },
  ownerStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  trustScore: {
    ...typography.body2,
    color: colors.textSecondary,
  },
  verifiedContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
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
  skillsContainer: {
    gap: 8,
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
  comingSoonText: {
    ...typography.body2,
    color: colors.textSecondary,
    textAlign: "center",
    padding: 16,
  },
  footer: {
    height: 40,
  },
});
