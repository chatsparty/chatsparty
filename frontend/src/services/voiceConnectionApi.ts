import axios from "axios";
import { API_BASE_URL } from "@/config/api";
import type {
  VoiceConnection,
  CreateVoiceConnectionRequest,
  UpdateVoiceConnectionRequest,
  VoiceConnectionTestResult,
} from "@/types/voice";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const voiceConnectionApi = {
  async getVoiceConnections(): Promise<VoiceConnection[]> {
    const response = await apiClient.get("/voice-connections");
    return response.data;
  },

  async getActiveVoiceConnections(): Promise<VoiceConnection[]> {
    const response = await apiClient.get("/voice-connections/active");
    return response.data;
  },

  async getVoiceConnection(id: string): Promise<VoiceConnection> {
    const response = await apiClient.get(`/voice-connections/${id}`);
    return response.data;
  },

  async createVoiceConnection(
    data: CreateVoiceConnectionRequest
  ): Promise<VoiceConnection> {
    const response = await apiClient.post("/voice-connections", data);
    return response.data;
  },

  async updateVoiceConnection(
    id: string,
    data: UpdateVoiceConnectionRequest
  ): Promise<VoiceConnection> {
    const response = await apiClient.put(`/voice-connections/${id}`, data);
    return response.data;
  },

  async deleteVoiceConnection(id: string): Promise<void> {
    await apiClient.delete(`/voice-connections/${id}`);
  },

  async testVoiceConnection(id: string): Promise<VoiceConnectionTestResult> {
    const response = await apiClient.post(`/voice-connections/${id}/test`);
    return response.data;
  },

  async testVoiceConnectionData(
    data: CreateVoiceConnectionRequest
  ): Promise<VoiceConnectionTestResult> {
    const response = await apiClient.post("/voice-connections/test", data);
    return response.data;
  },
};
