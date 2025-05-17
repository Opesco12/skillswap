import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Skill, SkillCategory, SkillLevel } from "@/types";
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
} from "firebase/firestore";
import { db } from "@/firebase";
import { useAuthStore } from "@/store/auth-store";

interface SkillsState {
  skills: Skill[];
  categories: SkillCategory[];
  isLoading: boolean;
  isFetching: boolean;
  error: string | null;
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

export const useSkillsStore = create<SkillsState>()(
  persist(
    (set, get) => ({
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

      fetchSkills: async () => {
        set({ isFetching: true, error: null });
        try {
          const skillsRef = collection(db, "skills");
          const snapshot = await getDocs(skillsRef);
          const skills = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Skill[];
          set({ skills, isFetching: false });
        } catch (error: any) {
          set({
            error: error.message || "Failed to fetch skills",
            isFetching: false,
          });
          throw error;
        }
      },

      addSkill: async (skill, isOffered) => {
        set({ isLoading: true, error: null });
        try {
          const user = useAuthStore.getState().user;
          if (!user) throw new Error("User not authenticated");

          const targetArray = isOffered
            ? user.skillsOffered || []
            : user.skillsNeeded || [];
          if (targetArray.length >= 3) {
            throw new Error(
              `Cannot add more than 3 ${
                isOffered ? "offered" : "needed"
              } skills`
            );
          }

          const skillDocRef = doc(collection(db, "skills"));
          const newSkill: Skill = {
            ...skill,
            id: skillDocRef.id,
          };

          // Add to /skills
          await setDoc(skillDocRef, newSkill);

          // Add to users/{userId}
          const updatedArray = [...targetArray, newSkill];
          const userRef = doc(db, "users", user.id);
          await updateDoc(userRef, {
            [isOffered ? "skillsOffered" : "skillsNeeded"]: updatedArray,
          });

          // Update auth store
          useAuthStore.setState((state) => ({
            user: state.user
              ? {
                  ...state.user,
                  [isOffered ? "skillsOffered" : "skillsNeeded"]: updatedArray,
                }
              : null,
          }));

          // Update local skills state
          set((state) => ({
            skills: [...state.skills, newSkill],
            isLoading: false,
          }));
          return newSkill.id;
        } catch (error: any) {
          set({
            error: error.message || "Failed to add skill",
            isLoading: false,
          });
          throw error;
        }
      },

      updateSkill: async (id, updatedSkill, isOffered) => {
        set({ isLoading: true, error: null });
        try {
          const user = useAuthStore.getState().user;
          if (!user) throw new Error("User not authenticated");

          // Update /skills
          const skillRef = doc(db, "skills", id);
          await updateDoc(skillRef, updatedSkill);

          // Update users/{userId}
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

          // Update auth store
          useAuthStore.setState((state) => ({
            user: state.user
              ? {
                  ...state.user,
                  [isOffered ? "skillsOffered" : "skillsNeeded"]: updatedArray,
                }
              : null,
          }));

          // Update local skills state
          set((state) => ({
            skills: state.skills.map((skill) =>
              skill.id === id ? { ...skill, ...updatedSkill } : skill
            ),
            isLoading: false,
          }));
        } catch (error: any) {
          set({
            error: error.message || "Failed to add skill",
            isLoading: false,
          });
          throw error;
        }
      },

      deleteSkill: async (id, isOffered) => {
        set({ isLoading: true, error: null });
        try {
          const user = useAuthStore.getState().user;
          if (!user) throw new Error("User not authenticated");

          // Delete from /skills
          const skillRef = doc(db, "skills", id);
          await deleteDoc(skillRef);

          // Update users/{userId}
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

          // Update auth store
          useAuthStore.setState((state) => ({
            user: state.user
              ? {
                  ...state.user,
                  [isOffered ? "skillsOffered" : "skillsNeeded"]: updatedArray,
                }
              : null,
          }));

          // Update local skills state
          set((state) => ({
            skills: state.skills.filter((skill) => skill.id !== id),
            isLoading: false,
          }));
        } catch (error: any) {
          set({
            error: error.message || "Failed to delete skill",
            isLoading: false,
          });
          throw error;
        }
      },

      getSkillsByCategory: (category) => {
        return get().skills.filter((skill) => skill.category === category);
      },

      getSkillsByUser: (userId) => {
        return get().skills.filter((skill) => skill.userId === userId);
      },

      searchSkills: (query) => {
        const lowerQuery = query.toLowerCase();
        return get().skills.filter(
          (skill) =>
            skill.name.toLowerCase().includes(lowerQuery) ||
            skill.description.toLowerCase().includes(lowerQuery)
        );
      },
    }),
    {
      name: "skills-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
