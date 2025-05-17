import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Skill } from "@/types";
import { colors } from "../constants/colors";
import { getCategoryIcon } from "../utils/skill-utils";

interface SkillCardProps {
  skill: Skill;
  onPress?: () => void;
  compact?: boolean;
}

export const SkillCard: React.FC<SkillCardProps> = ({
  skill,
  onPress,
  compact = false,
}) => {
  const { name, category, level, description } = skill;

  const CategoryIcon = getCategoryIcon(category);

  const getLevelColor = () => {
    switch (level) {
      case "beginner":
        return "#4CAF50";
      case "intermediate":
        return "#2196F3";
      case "advanced":
        return "#FF9800";
      case "expert":
        return "#F44336";
      default:
        return colors.textSecondary;
    }
  };

  if (compact) {
    return (
      <TouchableOpacity
        style={styles.compactContainer}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.compactIconContainer}>
          <CategoryIcon
            size={20}
            color={colors.primary}
          />
        </View>
        <View style={styles.compactContent}>
          <Text
            style={styles.compactName}
            numberOfLines={1}
          >
            {name}
          </Text>
          <View style={styles.compactLevelContainer}>
            <Text style={[styles.compactLevel, { color: getLevelColor() }]}>
              {level?.charAt(0)?.toUpperCase() + level?.slice(1)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <CategoryIcon
            size={24}
            color={colors.white}
          />
        </View>
        <View style={styles.titleContainer}>
          <Text style={styles.name}>{name}</Text>
          <View
            style={[
              styles.levelContainer,
              { backgroundColor: getLevelColor() },
            ]}
          >
            <Text style={styles.level}>
              {level?.charAt(0)?.toUpperCase() + level?.slice(1)}
            </Text>
          </View>
        </View>
      </View>

      <Text
        style={styles.description}
        numberOfLines={2}
      >
        {description}
      </Text>

      <View style={styles.footer}>
        <Text style={styles.category}>
          {category?.charAt(0)?.toUpperCase() + category?.slice(1)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  name: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    flex: 1,
    marginRight: 8,
  },
  levelContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  level: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.white,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  category: {
    fontSize: 12,
    color: colors.textLight,
    fontWeight: "500",
  },

  // Compact styles
  compactContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  compactIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.card,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  compactContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  compactName: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text,
    flex: 1,
    marginRight: 8,
  },
  compactLevelContainer: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  compactLevel: {
    fontSize: 12,
    fontWeight: "500",
  },
});
