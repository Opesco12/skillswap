import React, { useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { Plus, ArrowLeftRight } from "lucide-react-native";
import { ExchangeCard } from "@/components/ExchangeCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/Button";
import { colors } from "@/constants/colors";
import { typography } from "@/constants/typography";
import { useExchanges } from "@/context/ExchangesContext";
import { useAuthStore } from "@/store/auth-store";
import { Exchange, ExchangeStatus } from "@/types";

export default function ExchangesScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const { exchanges, isLoading, fetchExchanges } = useExchanges();

  const [activeTab, setActiveTab] = React.useState<"active" | "completed">(
    "active"
  );
  const [filteredExchanges, setFilteredExchanges] = React.useState<Exchange[]>(
    []
  );

  const filterExchanges = useCallback(() => {
    if (!user) return;

    console.log("ExchangesScreen: Filtering exchanges, activeTab:", activeTab);
    const userExchanges =
      exchanges?.filter(
        (exchange) =>
          exchange.initiatorId === user.id || exchange.recipientId === user.id
      ) || [];

    const newFilteredExchanges =
      activeTab === "active"
        ? userExchanges.filter(
            (exchange) =>
              exchange.status === "pending" ||
              exchange.status === "accepted" ||
              exchange.status === "in_progress"
          )
        : userExchanges.filter(
            (exchange) =>
              exchange.status === "completed" ||
              exchange.status === "declined" ||
              exchange.status === "canceled"
          );

    // Only update state if filtered exchanges have changed
    setFilteredExchanges((prev) => {
      if (JSON.stringify(prev) !== JSON.stringify(newFilteredExchanges)) {
        return newFilteredExchanges;
      }
      return prev;
    });
  }, [user, exchanges, activeTab]);

  useEffect(() => {
    if (user?.id) {
      console.log("ExchangesScreen: Fetching exchanges for user:", user.id);
      const unsubscribe = fetchExchanges(user.id);
      return () => {
        console.log("ExchangesScreen: Unsubscribing from exchanges");
        unsubscribe();
      };
    }
  }, [user?.id, fetchExchanges]);

  useEffect(() => {
    filterExchanges();
  }, [filterExchanges]);

  const handleExchangePress = useCallback(
    (exchange: Exchange) => {
      router.push(`/exchange/${exchange?.id}`);
    },
    [router]
  );

  const renderExchangeItem = useCallback(
    ({ item }: { item: Exchange }) => (
      <ExchangeCard
        exchange={item}
        onPress={() => handleExchangePress(item)}
      />
    ),
    [handleExchangePress]
  );

  if (isLoading && exchanges?.length === 0) {
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
      <View style={styles.header}>
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "active" && styles.activeTab]}
            onPress={() => setActiveTab("active")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "active" && styles.activeTabText,
              ]}
            >
              Active
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === "completed" && styles.activeTab]}
            onPress={() => setActiveTab("completed")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "completed" && styles.activeTabText,
              ]}
            >
              History
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        {filteredExchanges?.length > 0 ? (
          <FlatList
            data={filteredExchanges}
            renderItem={renderExchangeItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.exchangesList}
          />
        ) : (
          <EmptyState
            icon={
              <ArrowLeftRight
                size={48}
                color={colors.textLight}
              />
            }
            title={
              activeTab === "active"
                ? "No active exchanges"
                : "No exchange history"
            }
            message={
              activeTab === "active"
                ? "You don't have any active skill exchanges yet"
                : "Your completed exchanges will appear here"
            }
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: colors.white,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.text,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  exchangesList: {
    paddingBottom: 24,
  },
});
