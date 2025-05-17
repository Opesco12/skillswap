import { SkillCategory } from "@/types";
import {
  Code,
  Languages,
  Palette,
  Music,
  Utensils,
  Dumbbell,
  GraduationCap,
  Briefcase,
  Scissors,
  HelpCircle,
} from "lucide-react-native";

export const getCategoryIcon = (category: SkillCategory) => {
  switch (category) {
    case "technology":
      return Code;
    case "language":
      return Languages;
    case "art":
      return Palette;
    case "music":
      return Music;
    case "cooking":
      return Utensils;
    case "fitness":
      return Dumbbell;
    case "education":
      return GraduationCap;
    case "business":
      return Briefcase;
    case "crafts":
      return Scissors;
    case "other":
    default:
      return HelpCircle;
  }
};

export const getCategoryName = (category: SkillCategory): string => {
  switch (category) {
    case "technology":
      return "Technology";
    case "language":
      return "Language";
    case "art":
      return "Art";
    case "music":
      return "Music";
    case "cooking":
      return "Cooking";
    case "fitness":
      return "Fitness";
    case "education":
      return "Education";
    case "business":
      return "Business";
    case "crafts":
      return "Crafts";
    case "other":
      return "Other";
    default:
      return category;
  }
};

export const getSkillLevelName = (level: string): string => {
  switch (level) {
    case "beginner":
      return "Beginner";
    case "intermediate":
      return "Intermediate";
    case "advanced":
      return "Advanced";
    case "expert":
      return "Expert";
    default:
      return level;
  }
};
