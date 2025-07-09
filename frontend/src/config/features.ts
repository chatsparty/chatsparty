// Feature flags configuration
export const FEATURES = {
  // Enable credit system (for cloud deployments)
  CREDITS: import.meta.env.VITE_ENABLE_CREDITS === 'true',
  
  // Add more feature flags here as needed
  // ANALYTICS: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  // BILLING: import.meta.env.VITE_ENABLE_BILLING === 'true',
};

// Export individual flags for convenience
export const CREDITS_ENABLED = FEATURES.CREDITS;