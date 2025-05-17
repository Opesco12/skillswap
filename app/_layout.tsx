import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useFonts } from "expo-font";
import { router, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { SafeAreaView, StatusBar } from "react-native";

import { ErrorBoundary } from "./error-boundary";
import { useAuthStore } from "@/store/auth-store";
import { colors } from "@/constants/colors";
import { AuthProvider } from "@/context/AuthContext";
import { SkillsProvider } from "@/context/SkillsContext";
import { MessagesProvider } from "@/context/MessagesContext";
import { ExchangesProvider } from "@/context/ExchangesContext";
import { NotificationsProvider } from "@/context/NotificationsContext";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) {
      console.error(error);
      throw error;
    }
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ErrorBoundary>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={colors.white}
          translucent={false}
        />
        <RootLayoutNav />
      </SafeAreaView>
    </ErrorBoundary>
  );
}

function RootLayoutNav() {
  const isAuthenticated = useAuthStore((state) => state?.isAuthenticated);

  // Handle navigation based on authentication status
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/(auth)/login");
    } else {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated]);

  return (
    <AuthProvider>
      <NotificationsProvider>
        <ExchangesProvider>
          <SkillsProvider>
            <MessagesProvider>
              <Stack
                screenOptions={{
                  headerShown: true,
                  headerBackTitle: "Back",
                  headerStyle: {
                    backgroundColor: colors.white,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  },
                  headerTintColor: colors.primary,
                  headerTitleStyle: {
                    fontWeight: "600",
                    fontSize: 18,
                  },
                  headerTitleAlign: "center",
                  contentStyle: {
                    backgroundColor: colors.background,
                  },
                }}
              >
                {/* Authenticated Routes */}
                <Stack.Screen
                  name="(tabs)"
                  options={{
                    headerShown: false,
                  }}
                />
                <Stack.Screen
                  name="skill/[id]"
                  options={{
                    title: "Skill Details",
                    headerShown: true,
                    presentation: "card",
                  }}
                />
                <Stack.Screen
                  name="exchange/[id]"
                  options={{
                    title: "Exchange Details",
                    headerShown: true,
                    presentation: "card",
                  }}
                />
                <Stack.Screen
                  name="chat/[id]"
                  options={{
                    title: "Chat",
                    headerShown: true,
                    presentation: "card",
                  }}
                />
                <Stack.Screen
                  name="profile/[id]"
                  options={{
                    title: "User Profile",
                    headerShown: true,
                    presentation: "card",
                  }}
                />

                {/* Unauthenticated Routes */}
                <Stack.Screen
                  name="(auth)/login"
                  options={{
                    title: "Login",
                    headerShown: true,
                    presentation: "modal",
                  }}
                />
                <Stack.Screen
                  name="(auth)/register"
                  options={{
                    title: "Register",
                    headerShown: true,
                    presentation: "modal",
                  }}
                />
                <Stack.Screen
                  name="(auth)/welcome"
                  options={{
                    title: "Welcome",
                    headerShown: true,
                    presentation: "modal",
                  }}
                />
              </Stack>
            </MessagesProvider>
          </SkillsProvider>
        </ExchangesProvider>
      </NotificationsProvider>
    </AuthProvider>
  );
}
