import { StyleSheet } from "react-native";
import { colors } from "./colors";

export const typography = StyleSheet.create({
  h1: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: 0.3,
  },
  h2: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: 0.2,
  },
  h3: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.text,
    letterSpacing: 0.2,
  },
  h4: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    letterSpacing: 0.1,
  },
  subtitle1: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  subtitle2: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  body1: {
    fontSize: 16,
    fontWeight: "400",
    color: colors.text,
    lineHeight: 24,
  },
  body2: {
    fontSize: 14,
    fontWeight: "400",
    color: colors.text,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: "400",
    color: colors.textLight,
  },
  button: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
});
