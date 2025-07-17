import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { theme } from "./constants/theme";
import { AuthProvider } from "./contexts/AuthContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="auto" backgroundColor={theme.colors.background} />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.background,
          },
          headerTintColor: theme.colors.textPrimary,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
    </AuthProvider>
  );
}
