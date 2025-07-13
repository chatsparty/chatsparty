export interface SystemConfig {
  vm_workspace_enabled: boolean;
}

export const systemApi = {
  getConfig: async (): Promise<SystemConfig> => {
    // Return hardcoded config instead of fetching from backend
    return {
      vm_workspace_enabled: true,
    };
  },
};