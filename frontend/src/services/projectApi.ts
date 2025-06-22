import axios from "axios";
import type {
  Project,
  ProjectCreate,
  ProjectStatus,
  ProjectUpdate,
  ProjectVMService,
  ServiceCreate,
  VMCommand,
  VMCommandResult,
} from "../types/project";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

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

export const projectApi = {
  // ============= PROJECT CRUD =============

  async createProject(projectData: ProjectCreate): Promise<Project> {
    const response = await api.post("/api/projects", projectData);
    return response.data.project;
  },

  async getProjects(): Promise<Project[]> {
    const response = await api.get("/api/projects");
    return response.data.projects;
  },

  async getProject(projectId: string): Promise<Project> {
    const response = await api.get(`/api/projects/${projectId}`);
    return response.data.project;
  },

  async updateProject(
    projectId: string,
    projectData: ProjectUpdate
  ): Promise<Project> {
    const response = await api.put(`/api/projects/${projectId}`, projectData);
    return response.data.project;
  },

  async deleteProject(projectId: string): Promise<void> {
    await api.delete(`/api/projects/${projectId}`);
  },

  // ============= VM WORKSPACE MANAGEMENT =============

  async setupVMWorkspace(
    projectId: string
  ): Promise<{ vm_info: Record<string, unknown> }> {
    const response = await api.post(`/api/projects/${projectId}/vm/setup`);
    return response.data;
  },

  async executeVMCommand(
    projectId: string,
    command: VMCommand
  ): Promise<VMCommandResult> {
    const response = await api.post(
      `/api/projects/${projectId}/vm/command`,
      command
    );
    return response.data.result;
  },

  async getProjectStatus(projectId: string): Promise<ProjectStatus> {
    const response = await api.get(`/api/projects/${projectId}/status`);
    return response.data.status;
  },

  // ============= VM SERVICES MANAGEMENT =============

  async startVMService(
    projectId: string,
    serviceData: ServiceCreate
  ): Promise<ProjectVMService> {
    const response = await api.post(
      `/api/projects/${projectId}/services`,
      serviceData
    );
    return response.data.service;
  },

  async getProjectServices(projectId: string): Promise<ProjectVMService[]> {
    const response = await api.get(`/api/projects/${projectId}/services`);
    return response.data.services;
  },

  async stopVMService(projectId: string, serviceId: string): Promise<void> {
    await api.delete(`/api/projects/${projectId}/services/${serviceId}`);
  },

  // ============= FILE MANAGEMENT =============

  async uploadFiles(
    projectId: string,
    files: FileList
  ): Promise<{ files: string[] }> {
    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append("files", file);
    });

    const response = await api.post(
      `/api/projects/${projectId}/files`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },

  async getVMFiles(
    projectId: string,
    path: string = "/workspace"
  ): Promise<{ files: any }> {
    const response = await api.get(`/api/projects/${projectId}/files`, {
      params: { path },
    });
    return response.data;
  },

  // ============= AGENT INTEGRATION =============

  async createProjectConversation(
    projectId: string,
    conversationData: { agent_ids: string[] }
  ): Promise<{ conversation_id: string }> {
    const response = await api.post(
      `/api/projects/${projectId}/conversations`,
      conversationData
    );
    return response.data;
  },

  // ============= ERROR HANDLING =============

  handleApiError(error: unknown): string {
    if (axios.isAxiosError(error)) {
      return (
        error.response?.data?.detail || error.message || "An error occurred"
      );
    }
    return String(error);
  },
};

export default projectApi;
