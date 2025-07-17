export const theme = {
  colors: {
    background: "#fafafa",
    surface: "#ffffff",
    surfaceSecondary: "#f4f4f5",

    primary: "#18181b",
    primaryMuted: "#71717a",

    textPrimary: "#18181b",
    textSecondary: "#71717a",
    textMuted: "#a1a1aa",
    textButtonPrimary: "#fafafa",

    success: "#22c55e",
    error: "#ef4444",
    warning: "#f59e0b",

    border: "#e4e4e7",
    borderLight: "#f4f4f5",

    card: "#ffffff",
    cardSecondary: "#f4f4f5",

    input: "#ffffff",
    inputBorder: "#e4e4e7",

    placeholder: "#a1a1aa",
    placeholderMuted: "#d4d4d8",
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },

  borderRadius: {
    sm: 6,
    md: 10,
    lg: 12,
    xl: 16,
    xxl: 24,
    full: 999,
  },

  typography: {
    fontFamily: "System",
    sizes: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 20,
      xxl: 24,
      xxxl: 28,
      xxxxl: 32,
    },
    weights: {
      normal: "400" as const,
      medium: "500" as const,
      semibold: "600" as const,
      bold: "700" as const,
    },
  },

  shadows: {
    sm: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 4,
    },
    lg: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 8,
    },
  },
} as const;

export const getStatusColor = (
  status: "active" | "ended" | "winning" | "lost"
) => {
  switch (status) {
    case "active":
      return theme.colors.success;
    case "ended":
      return theme.colors.textMuted;
    case "winning":
      return theme.colors.success;
    case "lost":
      return theme.colors.error;
    default:
      return theme.colors.textMuted;
  }
};
