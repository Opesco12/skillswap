import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Star } from "lucide-react-native";
import { colors } from "../constants/colors";

interface RatingStarsProps {
  rating: number;
  maxRating?: number;
  size?: number;
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
}

export const RatingStars: React.FC<RatingStarsProps> = ({
  rating,
  maxRating = 5,
  size = 24,
  interactive = false,
  onRatingChange,
}) => {
  const handlePress = (selectedRating: number) => {
    if (interactive && onRatingChange) {
      onRatingChange(selectedRating);
    }
  };

  return (
    <View style={styles.container}>
      {Array.from({ length: maxRating }).map((_, index) => {
        const starFill =
          index < Math.floor(rating)
            ? colors.warning
            : index < rating
            ? colors.warning
            : colors.border;

        return (
          <TouchableOpacity
            key={index}
            onPress={() => handlePress(index + 1)}
            disabled={!interactive}
            style={styles.starContainer}
          >
            <Star
              size={size}
              color={starFill}
              fill={index < Math.floor(rating) ? starFill : "transparent"}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
  },
  starContainer: {
    marginRight: 4,
  },
});
