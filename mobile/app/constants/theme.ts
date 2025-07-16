// Theme constants for consistent styling across the app
export const theme = {
  colors: {
    // Primary dark theme colors
    background: '#121712',
    surface: '#1F261C',
    surfaceSecondary: '#2E3829',

    // Accent colors
    primary: '#54D12B',
    primaryMuted: '#A6B5A1',

    // Text colors
    textPrimary: '#ffffff',
    textSecondary: '#A6B5A1',
    textMuted: '#9CA3AF',
    textButtonPrimary: 'black',

    // Status colors
    success: '#54D12B',
    error: '#FF6B6B',
    warning: '#F59E0B',

    // Border colors
    border: '#2E3829',
    borderLight: '#374151',

    // Card and component backgrounds
    card: '#1F261C',
    cardSecondary: '#2E3829',

    // Input backgrounds
    input: '#1F261C',
    inputBorder: '#2E3829',

    // Placeholder colors
    placeholder: '#6B7280',
    placeholderMuted: '#9CA3AF',
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
    md: 8,
    lg: 12,
    xl: 16,
    xxl: 24,
    full: 999,
  },

  typography: {
    fontFamily: 'Manrope',
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
      normal: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
    },
  },

  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 8,
    },
  },
} as const;

// Helper function to get status color
export const getStatusColor = (
  status: 'active' | 'ended' | 'winning' | 'lost',
) => {
  switch (status) {
    case 'active':
      return theme.colors.success;
    case 'ended':
      return theme.colors.textMuted;
    case 'winning':
      return theme.colors.success;
    case 'lost':
      return theme.colors.error;
    default:
      return theme.colors.textMuted;
  }
};
