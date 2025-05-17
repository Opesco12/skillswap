import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
  Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Mail, Lock } from "lucide-react-native";
import { Formik } from "formik";
import * as Yup from "yup";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { colors } from "../../constants/colors";
import { typography } from "../../constants/typography";
import { useAuthStore } from "../../store/auth-store";

// Define validation schema using Yup
const LoginSchema = Yup.object().shape({
  email: Yup.string().email("Email is invalid").required("Email is required"),
  password: Yup.string()
    .min(6, "Password must be at least 6 characters")
    .required("Password is required"),
});

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();

  const handleLogin = async (values: { email: string; password: string }) => {
    Keyboard.dismiss();
    try {
      await login(values.email, values.password);
    } catch (error: any) {
      const errorMessage =
        error.code === "auth/wrong-password" ||
        error.code === "auth/user-not-found"
          ? "Invalid email or password"
          : error.code === "auth/too-many-requests"
          ? "Too many attempts. Please try again later."
          : "Login failed. Please try again.";
      Alert.alert("Login Error", errorMessage);
    }
  };

  const handleRegister = () => {
    router.push("/(auth)/register");
  };

  const handleForgotPassword = () => {
    Alert.alert("Forgot Password", "This feature is coming soon!");
    // Future: Implement Firebase sendPasswordResetEmail
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <TouchableWithoutFeedback
        onPress={Keyboard.dismiss}
        accessible={false}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.keyboardAvoidingView}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <ScrollView
            contentContainerStyle={styles.scrollView}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.header}>
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>
                Log in to your SkillSwap account
              </Text>
            </View>

            <Formik
              initialValues={{ email: "", password: "" }}
              validationSchema={LoginSchema}
              onSubmit={handleLogin}
            >
              {({
                handleChange,
                handleBlur,
                handleSubmit,
                values,
                errors,
                touched,
              }) => (
                <View style={styles.form}>
                  <Input
                    label="Email"
                    placeholder="Enter your email"
                    value={values.email}
                    onChangeText={handleChange("email")}
                    onBlur={handleBlur("email")}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    leftIcon={
                      <Mail
                        size={20}
                        color={colors.textSecondary}
                      />
                    }
                    error={touched.email && errors.email}
                    accessibilityLabel="Email input"
                  />

                  <Input
                    label="Password"
                    placeholder="Enter your password"
                    value={values.password}
                    onChangeText={handleChange("password")}
                    onBlur={handleBlur("password")}
                    secureTextEntry
                    isPassword
                    leftIcon={
                      <Lock
                        size={20}
                        color={colors.textSecondary}
                      />
                    }
                    error={touched.password && errors.password}
                    accessibilityLabel="Password input"
                  />

                  <TouchableOpacity
                    onPress={handleForgotPassword}
                    style={styles.forgotPassword}
                    accessibilityRole="button"
                    accessibilityLabel="Forgot password"
                  >
                    <Text style={styles.forgotPasswordText}>
                      Forgot Password?
                    </Text>
                  </TouchableOpacity>

                  <Button
                    title="Log In"
                    onPress={handleSubmit}
                    variant="primary"
                    size="large"
                    isLoading={isLoading}
                    style={styles.loginButton}
                    disabled={isLoading}
                    accessibilityLabel="Log in button"
                  />
                </View>
              )}
            </Formik>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account?</Text>
              <TouchableOpacity
                onPress={handleRegister}
                accessibilityRole="button"
                accessibilityLabel="Sign up"
              >
                <Text style={styles.registerLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flexGrow: 1,
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 24 : 80,
  },
  header: {
    marginTop: 40,
    marginBottom: 40,
  },
  title: {
    ...typography.h1,
    marginBottom: 8,
  },
  subtitle: {
    ...typography.subtitle1,
    color: colors.textSecondary,
  },
  form: {
    marginBottom: 24,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 16,
  },
  forgotPasswordText: {
    ...typography.body2,
    color: colors.primary,
    fontWeight: "600",
  },
  loginButton: {
    marginTop: 16,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: "auto",
    marginBottom: 24,
  },
  footerText: {
    ...typography.body2,
    color: colors.textSecondary,
    marginRight: 4,
  },
  registerLink: {
    ...typography.body2,
    color: colors.primary,
    fontWeight: "600",
  },
});
