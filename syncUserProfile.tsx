import { doc, setDoc, getDoc } from "firebase/firestore";
import { db, auth } from "@/firebase";
import { UserProfile } from "@/types";

export async function syncUserProfile(userData: Partial<UserProfile>) {
  if (!auth.currentUser) {
    throw new Error("No authenticated user found");
  }

  const userId = auth.currentUser.uid;
  const userRef = doc(db, "users", userId);

  // Default user profile
  const defaultProfile: UserProfile = {
    id: userId,
    username:
      userData.username || auth.currentUser.email?.split("@")[0] || "user",
    email: auth.currentUser.email || "",
    displayName: userData.displayName || auth.currentUser.displayName || "User",
    bio: userData.bio || "",
    avatar:
      userData.avatar ||
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
    location: userData.location || {
      city: "",
      country: "",
      coordinates: {
        latitude: 0,
        longitude: 0,
      },
    },
    skillsOffered: [],
    skillsNeeded: [],
    trustScore: userData.trustScore || 0,
    memberSince: userData.memberSince || new Date().toISOString(),
    isVerified: userData.isVerified || false,
    completedExchanges: userData.completedExchanges || 0,
    ratings: [],
  };

  try {
    // Check if user profile exists
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      // Create new profile
      await setDoc(userRef, defaultProfile);
    } else {
      // Update existing profile
      await setDoc(userRef, defaultProfile, { merge: true });
    }

    return defaultProfile;
  } catch (error) {
    console.error("Error syncing user profile:", error);
    throw error;
  }
}
