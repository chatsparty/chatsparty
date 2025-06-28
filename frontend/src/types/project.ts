export interface Project {
  id: string;
  name: string;
  description?: string;
  user_id: string;

  // VM Integration
  vm_container_id?: string;
  vm_status: "inactive" | "starting" | "active" | "error" | "stopped";
  vm_config?: Record<string, unknown>;
  vm_url?: string;

  // Storage & Files
  storage_mount_path?: string;
  storage_config?: Record<string, unknown>;

  // Project settings
  is_active: boolean;
  auto_sync_files: boolean;
  instructions?: string;

  // Timestamps
  created_at: string;
  updated_at: string;
  last_vm_activity?: string;
}

export interface ProjectFile {
  id: string;
  project_id: string;
  user_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  vm_path?: string;
  is_synced: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectVMService {
  id: string;
  project_id: string;
  service_name: string;
  command: string;
  port?: number;
  host_port?: number;
  status: "starting" | "running" | "stopped" | "error" | "exposing" | "exposure_failed";
  process_id?: number;
  service_url?: string;
  created_at: string;
  started_at?: string;
  stopped_at?: string;
}

export interface ProjectStatus {
  project_id: string;
  vm_status: string;
  vm_url?: string;
  preview_url?: string;
  sandbox_id?: string;
  services: Array<{
    name: string;
    status: string;
    url?: string;
    port?: number;
  }>;
  files: {
    total: number;
    synced: number;
  };
  last_activity?: string;
}

export interface ProjectCreate {
  name: string;
  description?: string;
  auto_sync_files?: boolean;
  auto_setup_vm?: boolean;
}

export interface ProjectUpdate {
  name?: string;
  description?: string;
  auto_sync_files?: boolean;
}

export interface VMCommand {
  command: string;
  working_dir?: string;
}

export interface VMCommandResult {
  success: boolean;
  output?: string;
  error?: string;
  exit_code?: number;
}

export interface ServiceCreate {
  name: string;
  command: string;
  port?: number;
}

export interface ProjectConversation {
  conversation_id: string;
  project_id: string;
  agent_ids: string[];
  created_at: string;
}
