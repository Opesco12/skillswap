import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import {
  Mail,
  Lock,
  User,
  Info,
  MapPin,
  Image as ImageIcon,
} from "lucide-react-native";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { colors } from "@/constants/colors";
import { typography } from "@/constants/typography";
import { useAuthStore } from "@/store/auth-store";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import {
  CLOUDINARY_API_URL,
  CLOUDINARY_UPLOAD_PRESET,
  CLOUDINARY_CLOUD_NAME,
} from "../../constants/cloudinary";

export default function RegisterScreen() {
  const router = useRouter();
  const { register, isLoading, error } = useAuthStore();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
  const [validationErrors, setValidationErrors] = useState({
    username: "",
    email: "",
    displayName: "",
    bio: "",
    city: "",
    country: "",
    password: "",
    confirmPassword: "",
    avatar: "",
  });
  const [isUploading, setIsUploading] = useState(false);

  const defaultAvatar = "https://via.placeholder.com/100";

  const handlePickImage = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        setValidationErrors((prev) => ({
          ...prev,
          avatar: "Permission to access gallery was denied",
        }));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        exif: false,
      });

      if (result.canceled) {
        console.log("User cancelled image picker");
        return;
      }

      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
        setValidationErrors((prev) => ({
          ...prev,
          avatar: "Image size must be less than 5MB",
        }));
        return;
      }

      setSelectedImage(asset);
      setAvatar(asset.uri);
      setValidationErrors((prev) => ({ ...prev, avatar: "" }));
    } catch (error: any) {
      console.error("ImagePicker Error:", error);
      setValidationErrors((prev) => ({
        ...prev,
        avatar: `Failed to pick image: ${error.message}`,
      }));
    }
  };

  const validateForm = () => {
    const errors = {
      username: "",
      email: "",
      displayName: "",
      bio: "",
      city: "",
      country: "",
      password: "",
      confirmPassword: "",
      avatar: "",
    };

    if (!username) {
      errors.username = "Username is required";
    } else if (username.length < 3) {
      errors.username = "Username must be at least 3 characters";
    }

    if (!email) {
      errors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = "Email is invalid";
    }

    if (!displayName) {
      errors.displayName = "Display name is required";
    } else if (displayName.length < 2) {
      errors.displayName = "Display name must be at least 2 characters";
    }

    if (!bio) {
      errors.bio = "Bio is required";
    } else if (bio.length < 10) {
      errors.bio = "Bio must be at least 10 characters";
    }

    if (!city) {
      errors.city = "City is required";
    }

    if (!country) {
      errors.country = "Country is required";
    }

    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    setValidationErrors(errors);

    return (
      !errors.username &&
      !errors.email &&
      !errors.displayName &&
      !errors.bio &&
      !errors.city &&
      !errors.country &&
      !errors.password &&
      !errors.confirmPassword &&
      !errors.avatar
    );
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    setIsUploading(true);
    try {
      let avatarUrl: string | null = defaultAvatar;
      if (selectedImage && selectedImage.uri) {
        const mimeType = selectedImage.mimeType || "image/jpeg";
        const formData = new FormData();
        formData.append("file", {
          uri: selectedImage.uri,
          type: mimeType,
          name: `avatar_temp_${Date.now()}.${mimeType.split("/")[1]}`,
        } as any);
        formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
        formData.append("cloud_name", CLOUDINARY_CLOUD_NAME);
        formData.append("public_id", `avatars/temp_${Date.now()}`);

        const response = await axios.post(CLOUDINARY_API_URL, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        if (response.data.secure_url) {
          avatarUrl = response.data.secure_url;
          console.log(
            "handleRegister: Image uploaded to Cloudinary, URL:",
            avatarUrl
          );
        } else {
          throw new Error("Failed to retrieve secure URL from Cloudinary");
        }
      }

      await register(
        email,
        password,
        username,
        displayName,
        bio,
        city,
        country,
        avatarUrl
      );
      router.replace("/(tabs)/exchanges");
    } catch (err: any) {
      console.error("handleRegister: Error:", err.response?.data || err);
      setValidationErrors((prev) => ({
        ...prev,
        avatar:
          err.response?.data?.error?.message ||
          err.message ||
          "Failed to register",
      }));
    } finally {
      setIsUploading(false);
    }
  };

  const handleLogin = () => {
    router.push("/(auth)/login");
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView contentContainerStyle={styles.scrollView}>
          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Join SkillSwap and start exchanging skills
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.imagePickerContainer}>
              {selectedImage ? (
                <Image
                  source={{ uri: selectedImage.uri }}
                  style={styles.imagePreview}
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <ImageIcon
                    size={24}
                    color={colors.textLight}
                  />
                </View>
              )}
              <Button
                title="Pick Avatar from Gallery"
                onPress={handlePickImage}
                variant="outline"
                size="small"
                leftIcon={
                  <ImageIcon
                    size={16}
                    color={colors.primary}
                  />
                }
                style={styles.imagePickerButton}
                accessibilityLabel="Pick avatar from gallery"
              />
              {validationErrors.avatar && (
                <Text style={styles.errorText}>{validationErrors.avatar}</Text>
              )}
            </View>

            <Input
              label="Username"
              placeholder="Choose a username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              leftIcon={
                <User
                  size={20}
                  color={colors.textSecondary}
                />
              }
              error={validationErrors.username}
            />

            <Input
              label="Display Name"
              placeholder="Enter your full name"
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
              leftIcon={
                <User
                  size={20}
                  color={colors.textSecondary}
                />
              }
              error={validationErrors.displayName}
            />

            <Input
              label="Email"
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon={
                <Mail
                  size={20}
                  color={colors.textSecondary}
                />
              }
              error={validationErrors.email}
            />

            <Input
              label="Bio"
              placeholder="Tell us about yourself"
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={4}
              leftIcon={
                <Info
                  size={20}
                  color={colors.textSecondary}
                />
              }
              error={validationErrors.bio}
            />

            <Input
              label="City"
              placeholder="Enter your city"
              value={city}
              onChangeText={setCity}
              autoCapitalize="words"
              leftIcon={
                <MapPin
                  size={20}
                  color={colors.textSecondary}
                />
              }
              error={validationErrors.city}
            />

            <Input
              label="Country"
              placeholder="Enter your country"
              value={country}
              onChangeText={setCountry}
              autoCapitalize="words"
              leftIcon={
                <MapPin
                  size={20}
                  color={colors.textSecondary}
                />
              }
              error={validationErrors.country}
            />

            <Input
              label="Password"
              placeholder="Create a password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              isPassword
              leftIcon={
                <Lock
                  size={20}
                  color={colors.textSecondary}
                />
              }
              error={validationErrors.password}
            />

            <Input
              label="Confirm Password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              isPassword
              leftIcon={
                <Lock
                  size={20}
                  color={colors.textSecondary}
                />
              }
              error={validationErrors.confirmPassword}
            />

            {error && <Text style={styles.errorText}>{error}</Text>}

            <Button
              title="Create Account"
              onPress={handleRegister}
              variant="primary"
              size="large"
              isLoading={isLoading || isUploading}
              style={styles.registerButton}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <TouchableOpacity onPress={handleLogin}>
              <Text style={styles.loginLink}>Log In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  errorText: {
    color: colors.error,
    ...typography.body2,
    marginBottom: 16,
  },
  registerButton: {
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
  loginLink: {
    ...typography.body2,
    color: colors.primary,
    fontWeight: "600",
  },
  imagePickerContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 8,
  },
  imagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.card,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  imagePickerButton: {
    minWidth: 200,
  },
});
