import React, { createContext, useReducer, useCallback, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
} from "firebase/firestore";
import { db } from "@/firebase";
import { Skill, SkillCategory, SkillLevel } from "@/types";
import { useAuth } from "./AuthContext";

interface SkillsState {
  skills: Skill[];
  categories: SkillCategory[];
  isLoading: boolean;
  isFetching: boolean;
  error: string | null;
}

type SkillsAction =
  | { type: "SET_SKILLS"; payload: Skill[] }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_FETCHING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null };

interface SkillsContextType extends SkillsState {
  fetchSkills: () => Promise<void>;
  addSkill: (skill: Omit<Skill, "id">, isOffered: boolean) => Promise<string>;
  updateSkill: (
    id: string,
    skill: Partial<Skill>,
    isOffered: boolean
  ) => Promise<void>;
  deleteSkill: (id: string, isOffered: boolean) => Promise<void>;
  getSkillsByCategory: (category: SkillCategory) => Skill[];
  getSkillsByUser: (userId: string) => Skill[];
  searchSkills: (query: string) => Skill[];
}

const initialState: SkillsState = {
  skills: [],
  categories: [
    "technology",
    "language",
    "art",
    "music",
    "cooking",
    "fitness",
    "education",
    "business",
    "crafts",
    "other",
  ],
  isLoading: false,
  isFetching: false,
  error: null,
};

const SkillsContext = createContext<SkillsContextType | undefined>(undefined);

const skillsReducer = (
  state: SkillsState,
  action: SkillsAction
): SkillsState => {
  switch (action.type) {
    case "SET_SKILLS":
      return { ...state, skills: action.payload };
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "SET_FETCHING":
      return { ...state, isFetching: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    default:
      return state;
  }
};

export const SkillsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(skillsReducer, initialState);
  const { user, syncUserProfile } = useAuth();

  const fetchSkills = useCallback(async () => {
    console.log("fetchSkills: Starting fetch");
    dispatch({ type: "SET_FETCHING", payload: true });
    dispatch({ type: "SET_ERROR", payload: null });
    try {
      const skillsRef = collection(db, "skills");
      const snapshot = await getDocs(skillsRef);
      const skills = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Skill[];
      dispatch({ type: "SET_SKILLS", payload: skills });
      await AsyncStorage.setItem("skills-storage", JSON.stringify({ skills }));
      console.log("fetchSkills: Fetched", skills.length, "skills");
    } catch (error: any) {
      console.error("fetchSkills: Error:", error);
      dispatch({
        type: "SET_ERROR",
        payload: error.message || "Failed to fetch skills",
      });
      throw error;
    } finally {
      dispatch({ type: "SET_FETCHING", payload: false });
    }
  }, []);

  const addSkill = useCallback(
    async (skill: Omit<Skill, "id">, isOffered: boolean) => {
      console.log("addSkill: Starting, isOffered:", isOffered);
      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "SET_ERROR", payload: null });
      try {
        if (!user) throw new Error("User not authenticated");

        const targetArray = isOffered
          ? user.skillsOffered || []
          : user.skillsNeeded || [];
        if (targetArray.length >= 3) {
          throw new Error(
            `Cannot add more than 3 ${isOffered ? "offered" : "needed"} skills`
          );
        }

        const skillDocRef = doc(collection(db, "skills"));
        const newSkill: Skill = {
          ...skill,
          id: skillDocRef.id,
        };

        console.log("addSkill: Writing to /skills:", newSkill);
        await setDoc(skillDocRef, newSkill);

        const updatedArray = [...targetArray, newSkill];
        const userRef = doc(db, "users", user.id);
        console.log("addSkill: Writing to users/{userId}:", updatedArray);
        await updateDoc(userRef, {
          [isOffered ? "skillsOffered" : "skillsNeeded"]: updatedArray,
        });

        dispatch({ type: "SET_SKILLS", payload: [...state.skills, newSkill] });
        await AsyncStorage.setItem(
          "skills-storage",
          JSON.stringify({ skills: [...state.skills, newSkill] })
        );
        await syncUserProfile(user.id);
        console.log(
          "addSkill: Updated skills, new skill count:",
          state.skills.length + 1
        );
        return newSkill.id;
      } catch (error: any) {
        console.error("addSkill: Error:", error);
        dispatch({
          type: "SET_ERROR",
          payload: error.message || "Failed to add skill",
        });
        throw error;
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    },
    [user, syncUserProfile]
  );

  const updateSkill = useCallback(
    async (id: string, updatedSkill: Partial<Skill>, isOffered: boolean) => {
      console.log("updateSkill: Starting, id:", id);
      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "SET_ERROR", payload: null });
      try {
        if (!user) throw new Error("User not authenticated");

        const skillRef = doc(db, "skills", id);
        await updateDoc(skillRef, updatedSkill);

        const targetArray = isOffered
          ? user.skillsOffered || []
          : user.skillsNeeded || [];
        const skillIndex = targetArray.findIndex((skill) => skill.id === id);
        if (skillIndex === -1) throw new Error("Skill not found");

        const updatedArray = [...targetArray];
        updatedArray[skillIndex] = {
          ...updatedArray[skillIndex],
          ...updatedSkill,
        };
        const userRef = doc(db, "users", user.id);
        await updateDoc(userRef, {
          [isOffered ? "skillsOffered" : "skillsNeeded"]: updatedArray,
        });

        const updatedSkills = state.skills.map((skill) =>
          skill.id === id ? { ...skill, ...updatedSkill } : skill
        );
        dispatch({ type: "SET_SKILLS", payload: updatedSkills });
        await AsyncStorage.setItem(
          "skills-storage",
          JSON.stringify({ skills: updatedSkills })
        );
        await syncUserProfile(user.id);
      } catch (error: any) {
        console.error("updateSkill: Error:", error);
        dispatch({
          type: "SET_ERROR",
          payload: error.message || "Failed to update skill",
        });
        throw error;
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    },
    [user, syncUserProfile]
  );

  const deleteSkill = useCallback(
    async (id: string, isOffered: boolean) => {
      console.log("deleteSkill: Starting, id:", id);
      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "SET_ERROR", payload: null });
      try {
        if (!user) throw new Error("User not authenticated");

        const skillRef = doc(db, "skills", id);
        await deleteDoc(skillRef);

        const targetArray = isOffered
          ? user.skillsOffered || []
          : user.skillsNeeded || [];
        const updatedArray = targetArray.filter((skill) => skill.id !== id);
        if (targetArray.length === updatedArray.length)
          throw new Error("Skill not found");

        const userRef = doc(db, "users", user.id);
        await updateDoc(userRef, {
          [isOffered ? "skillsOffered" : "skillsNeeded"]: updatedArray,
        });

        const updatedSkills = state.skills.filter((skill) => skill.id !== id);
        dispatch({ type: "SET_SKILLS", payload: updatedSkills });
        await AsyncStorage.setItem(
          "skills-storage",
          JSON.stringify({ skills: updatedSkills })
        );
        await syncUserProfile(user.id);
      } catch (error: any) {
        console.error("deleteSkill: Error:", error);
        dispatch({
          type: "SET_ERROR",
          payload: error.message || "Failed to delete skill",
        });
        throw error;
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    },
    [user, syncUserProfile]
  );

  const getSkillsByCategory = useCallback(
    (category: SkillCategory) => {
      return state.skills.filter((skill) => skill.category === category);
    },
    [state.skills]
  );

  const getSkillsByUser = useCallback(
    (userId: string) => {
      return state.skills.filter((skill) => skill.userId === userId);
    },
    [state.skills]
  );

  const searchSkills = useCallback(
    (query: string) => {
      const lowerQuery = query.toLowerCase();
      return state.skills.filter(
        (skill) =>
          skill.name.toLowerCase().includes(lowerQuery) ||
          skill.description.toLowerCase().includes(lowerQuery)
      );
    },
    [state.skills]
  );

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({
      skills: state.skills,
      categories: state.categories,
      isLoading: state.isLoading,
      isFetching: state.isFetching,
      error: state.error,
      fetchSkills,
      addSkill,
      updateSkill,
      deleteSkill,
      getSkillsByCategory,
      getSkillsByUser,
      searchSkills,
    }),
    [
      state.skills,
      state.categories,
      state.isLoading,
      state.isFetching,
      state.error,
      fetchSkills,
      addSkill,
      updateSkill,
      deleteSkill,
      getSkillsByCategory,
      getSkillsByUser,
      searchSkills,
    ]
  );

  console.log("SkillsProvider: Rendering, skills count:", state.skills.length);

  return (
    <SkillsContext.Provider value={value}>{children}</SkillsContext.Provider>
  );
};

export const useSkills = () => {
  const context = React.useContext(SkillsContext);
  if (!context) {
    throw new Error("useSkills must be used within a SkillsProvider");
  }
  return context;
};
