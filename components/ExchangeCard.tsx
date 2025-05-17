import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Exchange, ExchangeStatus } from "@/types";
import { colors } from "../constants/colors";
import { formatDate } from "@/utils/date-utils";
import { ArrowLeftRight, Calendar, Clock, MapPin } from "lucide-react-native";

interface ExchangeCardProps {
  exchange: Exchange;
  onPress?: () => void;
  compact?: boolean;
}

export const ExchangeCard: React.FC<ExchangeCardProps> = ({
  exchange,
  onPress,
  compact = false,
}) => {
  const { status, proposedDate, proposedDuration, proposedLocation, notes } =
    exchange;

  const getStatusColor = () => {
    switch (status) {
      case "pending":
        return colors.warning;
      case "accepted":
        return colors.info;
      case "declined":
        return colors.error;
      case "canceled":
        return colors.error;
      case "completed":
        return colors.success;
      case "in_progress":
        return colors.primary;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "pending":
        return "Pending";
      case "accepted":
        return "Accepted";
      case "declined":
        return "Declined";
      case "canceled":
        return "Canceled";
      case "completed":
        return "Completed";
      case "in_progress":
        return "In Progress";
      default:
        return status;
    }
  };

  if (compact) {
    return (
      <TouchableOpacity
        style={styles.compactContainer}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.compactStatusIndicator,
            { backgroundColor: getStatusColor() },
          ]}
        />
        <View style={styles.compactContent}>
          <View style={styles.compactHeader}>
            <ArrowLeftRight
              size={16}
              color={colors.primary}
              style={styles.compactIcon}
            />
            <Text
              style={styles.compactTitle}
              numberOfLines={1}
            >
              Skill Exchange
            </Text>
            <View
              style={[
                styles.compactStatusContainer,
                { backgroundColor: getStatusColor() + "20" },
              ]}
            >
              <Text style={[styles.compactStatus, { color: getStatusColor() }]}>
                {getStatusText()}
              </Text>
            </View>
          </View>
          <View style={styles.compactDetails}>
            <View style={styles.compactDetailItem}>
              <Calendar
                size={14}
                color={colors.textLight}
              />
              <Text style={styles.compactDetailText}>
                {formatDate(proposedDate)}
              </Text>
            </View>
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
        <View style={styles.titleContainer}>
          <ArrowLeftRight
            size={20}
            color={colors.primary}
            style={styles.icon}
          />
          <Text style={styles.title}>Skill Exchange</Text>
        </View>
        <View
          style={[
            styles.statusContainer,
            { backgroundColor: getStatusColor() + "20" },
          ]}
        >
          <Text style={[styles.status, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
        </View>
      </View>

      <View style={styles.details}>
        <View style={styles.detailItem}>
          <Calendar
            size={16}
            color={colors.textSecondary}
            style={styles.detailIcon}
          />
          <Text style={styles.detailText}>{formatDate(proposedDate)}</Text>
        </View>

        <View style={styles.detailItem}>
          <Clock
            size={16}
            color={colors.textSecondary}
            style={styles.detailIcon}
          />
          <Text style={styles.detailText}>{proposedDuration} minutes</Text>
        </View>

        <View style={styles.detailItem}>
          <MapPin
            size={16}
            color={colors.textSecondary}
            style={styles.detailIcon}
          />
          <Text style={styles.detailText}>{proposedLocation}</Text>
        </View>
      </View>

      {notes && (
        <View style={styles.notesContainer}>
          <Text style={styles.notesLabel}>Notes:</Text>
          <Text
            style={styles.notes}
            numberOfLines={2}
          >
            {notes}
          </Text>
        </View>
      )}
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
    justifyContent: "space-between",
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    marginRight: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
  },
  statusContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  status: {
    fontSize: 12,
    fontWeight: "600",
  },
  details: {
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  detailIcon: {
    marginRight: 8,
  },
  detailText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  notesContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text,
    marginBottom: 4,
  },
  notes: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  // Compact styles
  compactContainer: {
    flexDirection: "row",
    backgroundColor: colors.white,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    overflow: "hidden",
  },
  compactStatusIndicator: {
    width: 4,
    height: "100%",
  },
  compactContent: {
    flex: 1,
    padding: 12,
  },
  compactHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  compactIcon: {
    marginRight: 6,
  },
  compactTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: colors.text,
  },
  compactStatusContainer: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  compactStatus: {
    fontSize: 10,
    fontWeight: "600",
  },
  compactDetails: {
    flexDirection: "row",
    alignItems: "center",
  },
  compactDetailItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
  },
  compactDetailText: {
    fontSize: 12,
    color: colors.textLight,
    marginLeft: 4,
  },
});
