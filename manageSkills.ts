import {
  doc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  arrayUnion,
} from "firebase/firestore";
import { db } from "@/firebase";
import { Skill } from "@/types";

export async function addSkill(skill: Omit<Skill, "id">) {
  try {
    const skillRef = await addDoc(collection(db, "skills"), skill);
    return skillRef.id;
  } catch (error) {
    console.error("Error adding skill:", error);
    throw error;
  }
}

export async function linkSkillToUser(
  userId: string,
  skillId: string,
  type: "offered" | "needed"
) {
  try {
    const userRef = doc(db, "users", userId);
    const field = type === "offered" ? "skillsOffered" : "skillsNeeded";
    await updateDoc(userRef, {
      [field]: arrayUnion(doc(db, "skills", skillId)),
    });
  } catch (error) {
    console.error("Error linking skill to user:", error);
    throw error;
  }
}

export async function getUserSkills(userId: string) {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    const userData = userDoc.data();
    if (!userData) return { skillsOffered: [], skillsNeeded: [] };

    const skillsOffered = await Promise.all(
      (userData.skillsOffered || []).map(async (ref: any) => {
        const skillDoc = await getDoc(ref);
        return { id: ref.id, ...skillDoc.data() } as Skill;
      })
    );

    const skillsNeeded = await Promise.all(
      (userData.skillsNeeded || []).map(async (ref: any) => {
        const skillDoc = await getDoc(ref);
        return { id: ref.id, ...skillDoc.data() } as Skill;
      })
    );

    return { skillsOffered, skillsNeeded };
  } catch (error) {
    console.error("Error fetching user skills:", error);
    throw error;
  }
}
