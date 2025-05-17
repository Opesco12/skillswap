import React, {
  createContext,
  useReducer,
  useEffect,
  useCallback,
} from "react";
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
}

type AuthAction =
  | { type: "SET_USER"; payload: UserProfile | null }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null };

interface AuthContextType extends AuthState {
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

const initialState: AuthState = {
  user: null,
  isLoading: false,
  error: null,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case "SET_USER":
      return { ...state, user: action.payload };
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    default:
      return state;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const register = useCallback(
    async (
      email: string,
      password: string,
      username: string,
      displayName: string,
      bio: string,
      city: string,
      country: string,
      avatar: string
    ) => {
      console.log("register: Starting");
      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "SET_ERROR", payload: null });
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
          location: { city, country },
          skillsOffered: [],
          skillsNeeded: [],
          trustScore: 0,
          memberSince: new Date().toISOString(),
          isVerified: false,
          completedExchanges: 0,
          ratings: [],
        };
        await setDoc(doc(db, "users", firebaseUser.uid), userDoc);

        dispatch({ type: "SET_USER", payload: userDoc });
        await AsyncStorage.setItem(
          "auth-storage",
          JSON.stringify({ user: userDoc })
        );
        console.log("register: User registered:", userDoc);
      } catch (error: any) {
        console.error("register: Error:", error);
        dispatch({
          type: "SET_ERROR",
          payload: error.message || "Failed to register",
        });
        throw error;
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    },
    []
  );

  const login = useCallback(async (email: string, password: string) => {
    console.log("login: Starting");
    dispatch({ type: "SET_LOADING", payload: true });
    dispatch({ type: "SET_ERROR", payload: null });
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const firebaseUser = userCredential.user;

      await syncUserProfile(firebaseUser.uid);
      console.log("login: Login complete, user:", state.user);
      router.replace("/(tabs)");
    } catch (error: any) {
      console.error("login: Error:", error);
      dispatch({
        type: "SET_ERROR",
        payload: error.message || "Failed to login",
      });
      throw error;
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, []);

  const logout = useCallback(async () => {
    console.log("logout: Starting");
    dispatch({ type: "SET_LOADING", payload: true });
    dispatch({ type: "SET_ERROR", payload: null });
    try {
      await signOut(auth);
      dispatch({ type: "SET_USER", payload: null });
      await AsyncStorage.removeItem("auth-storage");
      console.log("logout: User logged out");
      router.replace("/(auth)/login");
    } catch (error: any) {
      console.error("logout: Error:", error);
      dispatch({
        type: "SET_ERROR",
        payload: error.message || "Failed to logout",
      });
      throw error;
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, []);

  const syncUserProfile = useCallback(async (userId: string) => {
    console.log("syncUserProfile: Starting for userId:", userId);
    dispatch({ type: "SET_LOADING", payload: true });
    dispatch({ type: "SET_ERROR", payload: null });
    try {
      const userRef = doc(db, "users", userId);
      const docSnap = await getDoc(userRef);
      if (docSnap.exists()) {
        const userData = docSnap.data() as UserProfile;
        dispatch({ type: "SET_USER", payload: userData });
        await AsyncStorage.setItem(
          "auth-storage",
          JSON.stringify({ user: userData })
        );
        console.log("syncUserProfile: Fetched user:", userData);
      } else {
        dispatch({ type: "SET_USER", payload: null });
        dispatch({ type: "SET_ERROR", payload: "User not found" });
        await AsyncStorage.removeItem("auth-storage");
        console.log("syncUserProfile: User not found");
      }
    } catch (error: any) {
      console.error("syncUserProfile: Error:", error);
      dispatch({
        type: "SET_ERROR",
        payload: error.message || "Failed to sync user profile",
      });
      throw error;
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, []);

  const initializeAuth = useCallback(() => {
    console.log("initializeAuth: Starting");
    dispatch({ type: "SET_LOADING", payload: true });
    dispatch({ type: "SET_ERROR", payload: null });
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        console.log("initializeAuth: User signed in, syncing profile");
        await syncUserProfile(firebaseUser.uid);
      } else {
        console.log("initializeAuth: No user signed in");
        dispatch({ type: "SET_USER", payload: null });
        dispatch({ type: "SET_LOADING", payload: false });
        await AsyncStorage.removeItem("auth-storage");
      }
    });
    return unsubscribe;
  }, [syncUserProfile]);

  useEffect(() => {
    const loadPersistedState = async () => {
      try {
        const persisted = await AsyncStorage.getItem("auth-storage");
        if (persisted) {
          const { user } = JSON.parse(persisted);
          dispatch({ type: "SET_USER", payload: user });
        }
      } catch (error) {
        console.error("Failed to load persisted state:", error);
      }
    };
    loadPersistedState();
    const unsubscribe = initializeAuth();
    return unsubscribe;
  }, [initializeAuth]);

  const value = {
    user: state.user,
    isLoading: state.isLoading,
    error: state.error,
    register,
    login,
    logout,
    syncUserProfile,
    initializeAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
