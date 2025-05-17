import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Search, Filter, RefreshCw } from "lucide-react-native";
import { Input } from "@/components/Input";
import { SkillCard } from "@/components/SkillCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/Button";
import { colors } from "@/constants/colors";
import { typography } from "@/constants/typography";
import { useSkills } from "@/context/SkillsContext";
import { Skill, SkillCategory } from "@/types";

export default function DiscoverScreen() {
  const router = useRouter();
  const { skills, categories, isFetching, error, fetchSkills } = useSkills();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<SkillCategory | null>(null);

  useEffect(() => {
    console.log("DiscoverScreen: Initial fetchSkills");
    fetchSkills().catch((err) => console.error("Failed to fetch skills:", err));
  }, [fetchSkills]);

  const handleRefresh = useCallback(() => {
    console.log("DiscoverScreen: Refresh triggered");
    fetchSkills().catch((err) =>
      console.error("Failed to refresh skills:", err)
    );
  }, [fetchSkills]);

  const filteredSkills = useMemo(() => {
    console.log("DiscoverScreen: Computing filteredSkills");
    let filtered = [...skills];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (skill) =>
          skill.name.toLowerCase().includes(query) ||
          skill.description.toLowerCase().includes(query)
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter(
        (skill) => skill.category === selectedCategory
      );
    }

    return filtered;
  }, [skills, searchQuery, selectedCategory]);

  const handleSkillPress = useCallback((skill: Skill) => {
    router.push(`/skill/${skill.id}`);
  }, []);

  const handleCategoryPress = useCallback(
    (category: SkillCategory | null) => {
      setSelectedCategory(category === selectedCategory ? null : category);
    },
    [selectedCategory]
  );

  const renderCategoryItem = useCallback(
    ({ item }: { item: SkillCategory }) => (
      <TouchableOpacity
        style={[
          styles.categoryItem,
          selectedCategory === item && styles.selectedCategoryItem,
        ]}
        onPress={() => handleCategoryPress(item)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.categoryText,
            selectedCategory === item && styles.selectedCategoryText,
          ]}
        >
          {item.charAt(0).toUpperCase() + item.slice(1)}
        </Text>
      </TouchableOpacity>
    ),
    [selectedCategory, handleCategoryPress]
  );

  const renderSkillItem = useCallback(
    ({ item }: { item: Skill }) => (
      <SkillCard
        skill={item}
        onPress={() => handleSkillPress(item)}
      />
    ),
    [handleSkillPress]
  );

  if (isFetching && skills.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color={colors.primary}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Input
          placeholder="Search skills..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon={
            <Search
              size={20}
              color={colors.textSecondary}
            />
          }
          rightIcon={
            <Filter
              size={20}
              color={colors.textSecondary}
            />
          }
          containerStyle={styles.searchInputContainer}
        />
      </View>

      <View style={styles.categoriesContainer}>
        <FlatList
          data={categories}
          renderItem={renderCategoryItem}
          keyExtractor={(item) => item}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
          ListHeaderComponent={
            <TouchableOpacity
              style={[
                styles.categoryItem,
                selectedCategory === null && styles.selectedCategoryItem,
              ]}
              onPress={() => handleCategoryPress(null)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === null && styles.selectedCategoryText,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
          }
        />
      </View>

      <View style={styles.content}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Available Skills</Text>
          <View style={styles.headerActions}>
            <Text style={styles.sectionCount}>
              {filteredSkills.length} skills
            </Text>
            <Button
              title="Refresh"
              onPress={handleRefresh}
              variant="outline"
              size="small"
              leftIcon={
                <RefreshCw
                  size={16}
                  color={colors.primary}
                />
              }
              style={styles.refreshButton}
              isLoading={isFetching}
            />
          </View>
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        {filteredSkills.length > 0 ? (
          <FlatList
            data={filteredSkills}
            renderItem={renderSkillItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.skillsList}
          />
        ) : (
          <EmptyState
            icon={
              <Search
                size={48}
                color={colors.textLight}
              />
            }
            title="No skills found"
            message={
              searchQuery
                ? `No skills match "${searchQuery}"`
                : "No skills available in this category yet"
            }
            actionLabel="Clear Filters"
            onAction={() => {
              setSearchQuery("");
              setSelectedCategory(null);
            }}
          />
        )}
      </View>
    </View>
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
  searchContainer: {
    padding: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInputContainer: {
    marginBottom: 0,
  },
  categoriesContainer: {
    backgroundColor: colors.white,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  categoriesList: {
    paddingHorizontal: 16,
  },
  categoryItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.card,
    marginRight: 8,
  },
  selectedCategoryItem: {
    backgroundColor: colors.primary,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  selectedCategoryText: {
    color: colors.white,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  sectionTitle: {
    ...typography.h3,
  },
  sectionCount: {
    ...typography.body2,
    color: colors.textSecondary,
  },
  refreshButton: {
    minWidth: 100,
  },
  skillsList: {
    paddingBottom: 24,
  },
  errorText: {
    color: colors.error,
    ...typography.body2,
    marginBottom: 16,
  },
});
