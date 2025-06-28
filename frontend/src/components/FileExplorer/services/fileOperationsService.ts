import axios from "axios";
import { API_BASE_URL } from "../../../config/api";
import { projectApi } from "../../../services/projectApi";
import type { FileTreeItem, FileOperationsService } from "../types";

class FileOperationsServiceImpl implements FileOperationsService {
  async fetchFileStructure(projectId: string): Promise<FileTreeItem> {
    const response = await projectApi.getVMFiles(projectId);
    return this.transformFileData(response.files);
  }

  async createFile(projectId: string, path: string, content: string = ""): Promise<void> {
    await axios.post(
      `${API_BASE_URL}/api/projects/${projectId}/files/create`,
      {
        path,
        is_folder: false,
        content,
      },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      }
    );
  }

  async createFolder(projectId: string, path: string): Promise<void> {
    await axios.post(
      `${API_BASE_URL}/api/projects/${projectId}/files/create`,
      {
        path,
        is_folder: true,
      },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      }
    );
  }

  async deleteFile(
    projectId: string,
    path: string,
    isFolder: boolean,
    force: boolean = true
  ): Promise<void> {
    await projectApi.deleteFile(projectId, path, isFolder, force);
  }

  async moveFile(
    projectId: string,
    sourcePath: string,
    targetPath: string
  ): Promise<void> {
    await projectApi.moveFile(projectId, sourcePath, targetPath);
  }

  async startFileWatcher(projectId: string): Promise<void> {
    await axios.post(`${API_BASE_URL}/api/projects/${projectId}/files/watch`);
  }

  async stopFileWatcher(projectId: string): Promise<void> {
    await axios.delete(`${API_BASE_URL}/api/projects/${projectId}/files/watch`);
  }

  private transformFileData(data: {
    name: string;
    type: string;
    path?: string;
    children?: any[];
  }): FileTreeItem {
    return {
      name: data.name,
      type: data.type === "directory" ? "folder" : "file",
      path: data.path,
      children: data.children?.map((child) => this.transformFileData(child)),
    };
  }
}

export const fileOperationsService = new FileOperationsServiceImpl();