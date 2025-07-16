import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { theme } from "./constants/theme";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" backgroundColor={theme.colors.background} />
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
    </>
  );
}
