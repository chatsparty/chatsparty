import { ExternalLink } from "./components/ExternalLink";
import { AntDesign } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { theme } from "./constants/theme";
import { useAuth } from "./hooks/use-auth";

export default function LoginScreen() {
  const authContext = useAuth();
  const { isAuthenticated, isLoading, loginWithGoogle } = authContext;
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated]);

  const handleGoogleSignIn = async () => {
    try {
      setSigningIn(true);

      if (!loginWithGoogle) {
        throw new Error(
          "Login function not available. Please check the authentication setup."
        );
      }

      await loginWithGoogle();
    } catch (error) {
      console.error("Login error:", error);
      Alert.alert(
        "Sign In Failed",
        error instanceof Error
          ? error.message
          : "An unexpected error occurred. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setSigningIn(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <View style={styles.brandSection}>
            <Text style={styles.appTitle}>ChatsParty</Text>
          </View>

          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeTitle}>Welcome</Text>
            <Text style={styles.welcomeSubtitle}>
              Sign in to start chatting with AI assistants
            </Text>
          </View>

          <View style={styles.actionSection}>
            <TouchableOpacity
              style={[
                styles.googleButton,
                signingIn && styles.googleButtonDisabled,
              ]}
              onPress={handleGoogleSignIn}
              disabled={signingIn}
              activeOpacity={0.7}
            >
              {signingIn ? (
                <>
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.googleButtonText,
                      styles.googleButtonTextDisabled,
                    ]}
                  >
                    Signing in...
                  </Text>
                </>
              ) : (
                <>
                  <AntDesign name="google" size={20} color="#4285F4" />
                  <Text style={styles.googleButtonText}>
                    Continue with Google
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.legalSection}>
          <Text style={styles.legalText}>
            By continuing, you agree to our{" "}
            <ExternalLink href="/terms" style={styles.legalLink}>
              Terms of Service
            </ExternalLink>
            {" and "}
            <ExternalLink href="/privacy" style={styles.legalLink}>
              Privacy Policy
            </ExternalLink>
          </Text>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 24,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 120,
  },
  brandSection: {
    marginBottom: 64,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    letterSpacing: -0.3,
    textAlign: "center",
  },
  welcomeSection: {
    marginBottom: 48,
    alignItems: "center",
  },
  welcomeTitle: {
    fontSize: 40,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    letterSpacing: -0.8,
    marginBottom: 16,
    textAlign: "center",
  },
  welcomeSubtitle: {
    fontSize: 17,
    color: theme.colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    fontWeight: "400",
    paddingHorizontal: 32,
  },
  actionSection: {
    width: "100%",
    alignItems: "center",
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 12,
    width: "100%",
    maxWidth: 320,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: theme.colors.textPrimary,
  },
  googleButtonDisabled: {
    opacity: 0.6,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  googleButtonTextDisabled: {
    color: theme.colors.textSecondary,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  legalSection: {
    position: "absolute",
    bottom: 48,
    left: 24,
    right: 24,
    alignItems: "center",
  },
  legalText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
    fontWeight: "400",
  },
  legalLink: {
    color: theme.colors.textSecondary,
    fontWeight: "500",
    textDecorationLine: "underline",
  },
});
