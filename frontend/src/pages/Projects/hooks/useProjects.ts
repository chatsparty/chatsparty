import { useCallback, useEffect, useState } from "react";
import { useToast } from "../../../hooks/useToast";
import { projectApi } from "../../../services/projectApi";
import type {
  Project,
  ProjectCreate,
  ProjectStatus,
  ProjectUpdate,
  ProjectVMService,
} from "../../../types/project";

export interface UseProjectsReturn {
  // State
  projects: Project[];
  selectedProject: Project | null;
  projectStatus: ProjectStatus | null;
  vmServices: ProjectVMService[];
  loading: boolean;
  error: string | null;

  // Actions
  loadProjects: () => Promise<void>;
  getProject: (projectId: string) => Promise<Project>;
  createProject: (projectData: ProjectCreate) => Promise<void>;
  updateProject: (
    projectId: string,
    projectData: ProjectUpdate
  ) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  selectProject: (project: Project | null) => void;

  // VM Actions
  setupVMWorkspace: (projectId: string) => Promise<void>;
  executeVMCommand: (
    projectId: string,
    command: string,
    workingDir?: string
  ) => Promise<string>;
  refreshProjectStatus: (projectId: string) => Promise<void>;

  // Service Actions
  startVMService: (
    projectId: string,
    name: string,
    command: string,
    port?: number
  ) => Promise<void>;
  stopVMService: (projectId: string, serviceId: string) => Promise<void>;
  stopServiceByPort: (projectId: string, port: number) => Promise<void>;
  refreshVMServices: (projectId: string) => Promise<void>;
}

export const useProjects = (): UseProjectsReturn => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectStatus, setProjectStatus] = useState<ProjectStatus | null>(
    null
  );
  const [vmServices, setVmServices] = useState<ProjectVMService[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  // ============= PROJECT MANAGEMENT =============

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const projectsData = await projectApi.getProjects();
      setProjects(projectsData);
    } catch (err) {
      const errorMessage = projectApi.handleApiError(err);
      setError(errorMessage);
      showToast(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const getProject = useCallback(async (projectId: string): Promise<Project> => {
    try {
      setLoading(true);
      setError(null);
      const project = await projectApi.getProject(projectId);
      return project;
    } catch (err) {
      const errorMessage = projectApi.handleApiError(err);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createProject = useCallback(
    async (projectData: ProjectCreate) => {
      try {
        setLoading(true);
        const newProject = await projectApi.createProject(projectData);
        setProjects((prev) => [newProject, ...prev]);
        setSelectedProject(newProject);
        showToast(
          `Project "${newProject.name}" created successfully!`,
          "success"
        );

        // Auto-setup VM if requested
        if (projectData.auto_setup_vm) {
          await setupVMWorkspace(newProject.id);
        }
      } catch (err) {
        const errorMessage = projectApi.handleApiError(err);
        setError(errorMessage);
        showToast(errorMessage, "error");
      } finally {
        setLoading(false);
      }
    },
    [showToast]
  );

  const updateProject = useCallback(
    async (projectId: string, projectData: ProjectUpdate) => {
      try {
        setLoading(true);
        const updatedProject = await projectApi.updateProject(
          projectId,
          projectData
        );
        setProjects((prev) =>
          prev.map((p) => (p.id === projectId ? updatedProject : p))
        );
        if (selectedProject?.id === projectId) {
          setSelectedProject(updatedProject);
        }
        showToast(
          `Project "${updatedProject.name}" updated successfully!`,
          "success"
        );
      } catch (err) {
        const errorMessage = projectApi.handleApiError(err);
        setError(errorMessage);
        showToast(errorMessage, "error");
      } finally {
        setLoading(false);
      }
    },
    [selectedProject, showToast]
  );

  const deleteProject = useCallback(
    async (projectId: string) => {
      try {
        setLoading(true);
        await projectApi.deleteProject(projectId);
        setProjects((prev) => prev.filter((p) => p.id !== projectId));
        if (selectedProject?.id === projectId) {
          setSelectedProject(null);
          setProjectStatus(null);
          setVmServices([]);
        }
        showToast("Project deleted successfully!", "success");
      } catch (err) {
        const errorMessage = projectApi.handleApiError(err);
        setError(errorMessage);
        showToast(errorMessage, "error");
      } finally {
        setLoading(false);
      }
    },
    [selectedProject, showToast]
  );

  const selectProject = useCallback((project: Project | null) => {
    setSelectedProject(project);
    setProjectStatus(null);
    setVmServices([]);

    if (project) {
      // Auto-load project status and services
      refreshProjectStatus(project.id);
      refreshVMServices(project.id);
    }
  }, []);

  // ============= VM WORKSPACE MANAGEMENT =============

  const setupVMWorkspace = useCallback(
    async (projectId: string) => {
      try {
        setLoading(true);
        await projectApi.setupVMWorkspace(projectId);
        showToast("VM workspace setup completed!", "success");

        // Refresh project status
        await refreshProjectStatus(projectId);
      } catch (err) {
        const errorMessage = projectApi.handleApiError(err);
        setError(errorMessage);
        showToast(errorMessage, "error");
      } finally {
        setLoading(false);
      }
    },
    [showToast]
  );

  const executeVMCommand = useCallback(
    async (
      projectId: string,
      command: string,
      workingDir?: string
    ): Promise<string> => {
      try {
        const result = await projectApi.executeVMCommand(projectId, {
          command,
          working_dir: workingDir,
        });

        if (!result.success && result.error) {
          throw new Error(result.error);
        }

        return result.output || "";
      } catch (err) {
        const errorMessage = projectApi.handleApiError(err);
        setError(errorMessage);
        showToast(`Command failed: ${errorMessage}`, "error");
        throw err;
      }
    },
    [showToast]
  );

  const refreshProjectStatus = useCallback(async (projectId: string) => {
    try {
      const status = await projectApi.getProjectStatus(projectId);
      setProjectStatus(status);

      // Update the project in the list with latest VM status
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? {
                ...p,
                vm_status: status.vm_status as Project["vm_status"],
              }
            : p
        )
      );
    } catch (err) {
      console.error(
        "Failed to refresh project status:",
        projectApi.handleApiError(err)
      );
    }
  }, []);

  // ============= VM SERVICES MANAGEMENT =============

  const startVMService = useCallback(
    async (projectId: string, name: string, command: string, port?: number) => {
      try {
        setLoading(true);
        await projectApi.startVMService(projectId, { name, command, port });
        showToast(`Service "${name}" started successfully!`, "success");

        // Refresh services list
        await refreshVMServices(projectId);
      } catch (err) {
        const errorMessage = projectApi.handleApiError(err);
        setError(errorMessage);
        showToast(errorMessage, "error");
      } finally {
        setLoading(false);
      }
    },
    [showToast]
  );

  const stopVMService = useCallback(
    async (projectId: string, serviceId: string) => {
      try {
        setLoading(true);
        await projectApi.stopVMService(projectId, serviceId);
        showToast("Service stopped successfully!", "success");

        // Refresh services list
        await refreshVMServices(projectId);
      } catch (err) {
        const errorMessage = projectApi.handleApiError(err);
        setError(errorMessage);
        showToast(errorMessage, "error");
      } finally {
        setLoading(false);
      }
    },
    [showToast]
  );

  const stopServiceByPort = useCallback(
    async (projectId: string, port: number) => {
      try {
        setLoading(true);
        const result = await projectApi.stopServiceByPort(projectId, port);
        if (result.success) {
          showToast("Service stopped successfully!", "success");
        } else {
          showToast(result.message || "Failed to stop service", "error");
        }

        // Refresh services list
        await refreshVMServices(projectId);
      } catch (err) {
        const errorMessage = projectApi.handleApiError(err);
        setError(errorMessage);
        showToast(errorMessage, "error");
      } finally {
        setLoading(false);
      }
    },
    [showToast]
  );

  const refreshVMServices = useCallback(async (projectId: string) => {
    try {
      // Get both manually started services and discovered active services
      const [services, activeServices] = await Promise.all([
        projectApi.getProjectServices(projectId),
        projectApi.getActiveServices(projectId)
      ]);
      
      // Merge the services - active services take precedence
      const allServices = [...services];
      
      // Add discovered services that aren't already in the list
      activeServices.forEach(activeService => {
        const existing = services.find(s => s.port === activeService.port);
        if (!existing) {
          allServices.push(activeService);
        }
      });
      
      setVmServices(allServices);
    } catch (err) {
      console.error(
        "Failed to refresh VM services:",
        projectApi.handleApiError(err)
      );
    }
  }, []);

  // ============= EFFECTS =============

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Auto-refresh project status every 30 seconds for active projects
  useEffect(() => {
    if (!selectedProject || selectedProject.vm_status === "inactive") return;

    const interval = setInterval(() => {
      refreshProjectStatus(selectedProject.id);
    }, 30000);

    return () => clearInterval(interval);
  }, [selectedProject, refreshProjectStatus]);

  return {
    // State
    projects,
    selectedProject,
    projectStatus,
    vmServices,
    loading,
    error,

    // Actions
    loadProjects,
    getProject,
    createProject,
    updateProject,
    deleteProject,
    selectProject,

    // VM Actions
    setupVMWorkspace,
    executeVMCommand,
    refreshProjectStatus,

    // Service Actions
    startVMService,
    stopVMService,
    stopServiceByPort,
    refreshVMServices,
  };
};
