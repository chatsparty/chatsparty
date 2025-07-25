import axios from "axios";
import { API_BASE_URL } from "../config/api";

// Create axios instance with auth
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add auth interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface VSCodeSetupResult {
  success: boolean;
  ide: {
    ide_type: string;
    url: string;
    port: number;
    status: string;
  };
}

export interface VSCodeStatus {
  running: boolean;
  url?: string;
  port?: number;
  error?: string;
}

export const vscodeApi = {
  /**
   * Setup VS Code server for a project
   */
  async setupVSCode(projectId: string): Promise<VSCodeSetupResult> {
    const response = await api.post(`/projects/${projectId}/ide/setup`, {
      ide_type: "vscode"
    });
    return response.data;
  },

  /**
   * Get VS Code server status
   */
  async getVSCodeStatus(projectId: string): Promise<VSCodeStatus> {
    try {
      const response = await api.get(`/projects/${projectId}/ide/status`);
      return response.data;
    } catch (error) {
      return {
        running: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },

  /**
   * Stop VS Code server
   */
  async stopVSCode(projectId: string): Promise<{ success: boolean }> {
    const response = await api.post(`/projects/${projectId}/ide/stop`);
    return response.data;
  },

  /**
   * Check if VS Code server is healthy
   */
  async healthCheck(url: string): Promise<boolean> {
    try {
      await fetch(url, { method: 'HEAD', mode: 'no-cors' });
      return true;
    } catch {
      return false;
    }
  }
};