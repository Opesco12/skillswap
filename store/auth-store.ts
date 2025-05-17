import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "@/firebase";
import { UserProfile } from "@/types";
import { router } from "expo-router";

interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  register: (
    email: string,
    password: string,
    username: string,
    displayName: string,
    bio: string,
    city: string,
    country: string,
    avatar: string
  ) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  syncUserProfile: (userId: string) => Promise<void>;
  initializeAuth: () => () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,
      error: null,

      register: async (
        email,
        password,
        username,
        displayName,
        bio,
        city,
        country,
        avatar
      ) => {
        console.log("register: Starting");
        set({ isLoading: true, error: null });
        try {
          const userCredential = await createUserWithEmailAndPassword(
            auth,
            email,
            password
          );
          const firebaseUser = userCredential.user;

          await updateProfile(firebaseUser, { displayName });

          const userDoc: UserProfile = {
            id: firebaseUser.uid,
            username,
            email: firebaseUser.email || email,
            displayName,
            bio,
            avatar,
            location: {
              city,
              country,
            },
            skillsOffered: [],
            skillsNeeded: [],
            trustScore: 0,
            memberSince: new Date().toISOString(),
            isVerified: false,
            completedExchanges: 0,
            ratings: [],
          };
          await setDoc(doc(db, "users", firebaseUser.uid), userDoc);

          set((state) => {
            console.log("register: User registered:", userDoc);
            return { user: userDoc, isLoading: false };
          });
        } catch (error: any) {
          console.error("register: Error:", error);
          set({
            error: error.message || "Failed to register",
            isLoading: false,
          });
          throw error;
        }
      },

      login: async (email: string, password: string): Promise<void> => {
        console.log("login: Starting");
        set({ isLoading: true, error: null });
        try {
          const userCredential = await signInWithEmailAndPassword(
            auth,
            email,
            password
          );
          const firebaseUser = userCredential.user;

          await useAuthStore.getState().syncUserProfile(firebaseUser.uid);

          set((state) => {
            console.log("login: Login complete, user:", state.user);
            return { isLoading: false };
          });
          router.replace("/(tabs)");
        } catch (error: any) {
          console.error("login: Error:", error);
          set({ error: error.message || "Failed to login", isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        console.log("logout: Starting");
        set({ isLoading: true, error: null });
        try {
          await signOut(auth);
          set((state) => {
            console.log("logout: User logged out");
            return { user: null, isLoading: false };
          });
          router.replace("/(auth)/login");
        } catch (error: any) {
          console.error("logout: Error:", error);
          set({ error: error.message || "Failed to logout", isLoading: false });
          throw error;
        }
      },

      syncUserProfile: async (userId: string) => {
        console.log("syncUserProfile: Starting for userId:", userId);
        set({ isLoading: true, error: null });
        try {
          const userRef = doc(db, "users", userId);
          const docSnap = await getDoc(userRef);
          if (docSnap.exists()) {
            set((state) => {
              const userData = docSnap.data() as UserProfile;
              console.log("syncUserProfile: Fetched user:", userData);
              return { user: userData, isLoading: false };
            });
          } else {
            set((state) => {
              console.log("syncUserProfile: User not found");
              return { user: null, isLoading: false, error: "User not found" };
            });
          }
        } catch (error: any) {
          console.error("syncUserProfile: Error:", error);
          set({
            error: error.message || "Failed to sync user profile",
            isLoading: false,
          });
          throw error;
        }
      },

      initializeAuth: () => {
        console.log("initializeAuth: Starting");
        set({ isLoading: true, error: null });
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          if (firebaseUser) {
            console.log("initializeAuth: User signed in, syncing profile");
            await useAuthStore.getState().syncUserProfile(firebaseUser.uid);
          } else {
            console.log("initializeAuth: No user signed in");
            set({ user: null, isLoading: false });
          }
        });
        return unsubscribe;
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
