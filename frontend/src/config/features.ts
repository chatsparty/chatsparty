// Feature flags configuration
export const FEATURES = {
  // Enable credit system (for cloud deployments)
  CREDITS: import.meta.env.VITE_ENABLE_CREDITS === 'true',
  
  // Enable projects feature
  PROJECTS: import.meta.env.VITE_ENABLE_PROJECTS !== 'false',
  
  // Enable MCP (Model Context Protocol) feature
  MCP: import.meta.env.VITE_ENABLE_MCP !== 'false',
  
  // Add more feature flags here as needed
  // ANALYTICS: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  // BILLING: import.meta.env.VITE_ENABLE_BILLING === 'true',
};

// Export individual flags for convenience
export const CREDITS_ENABLED = FEATURES.CREDITS;
export const PROJECTS_ENABLED = FEATURES.PROJECTS;
export const MCP_ENABLED = FEATURES.MCP;