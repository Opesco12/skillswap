import React from "react";
import { View, Text, StyleSheet, Image, SafeAreaView } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Button } from "../../components/Button";
import { colors } from "../../constants/colors";
import { typography } from "../../constants/typography";

export default function WelcomeScreen() {
  const router = useRouter();

  const handleLogin = () => {
    router.push("/(auth)/login");
  };

  const handleRegister = () => {
    router.push("/(auth)/register");
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Image
            source={{
              uri: "https://images.unsplash.com/photo-1521791136064-7986c2920216?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80",
            }}
            style={styles.logo}
          />
        </View>

        <Text style={styles.title}>SkillSwap</Text>
        <Text style={styles.subtitle}>Exchange skills, grow together</Text>

        <View style={styles.featuresContainer}>
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Text style={styles.featureIconText}>🔄</Text>
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Exchange Skills</Text>
              <Text style={styles.featureDescription}>
                Trade your expertise for skills you want to learn
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Text style={styles.featureIconText}>🌱</Text>
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Grow Your Network</Text>
              <Text style={styles.featureDescription}>
                Connect with like-minded people in your community
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Text style={styles.featureIconText}>⭐</Text>
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Build Reputation</Text>
              <Text style={styles.featureDescription}>
                Earn ratings and reviews for your skills
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          title="Create Account"
          onPress={handleRegister}
          variant="primary"
          size="large"
          style={styles.registerButton}
        />

        <Button
          title="Log In"
          onPress={handleLogin}
          variant="outline"
          size="large"
          style={styles.loginButton}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    overflow: "hidden",
  },
  logo: {
    width: "100%",
    height: "100%",
  },
  title: {
    ...typography.h1,
    marginBottom: 8,
    color: colors.primary,
  },
  subtitle: {
    ...typography.subtitle1,
    marginBottom: 48,
    color: colors.textSecondary,
  },
  featuresContainer: {
    width: "100%",
    marginBottom: 48,
  },
  featureItem: {
    flexDirection: "row",
    marginBottom: 24,
    alignItems: "center",
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.card,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  featureIconText: {
    fontSize: 24,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    ...typography.h4,
    marginBottom: 4,
  },
  featureDescription: {
    ...typography.body2,
    color: colors.textSecondary,
  },
  footer: {
    padding: 24,
    paddingBottom: 36,
  },
  registerButton: {
    marginBottom: 16,
  },
  loginButton: {},
});
