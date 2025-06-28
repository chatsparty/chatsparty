import { useEffect } from "react";
import { fileOperationsService } from "../services/fileOperationsService";
import type { Project } from "../../../types/project";

interface UseFileWatcherProps {
  project: Project;
  onFileChange: () => void;
}

export const useFileWatcher = ({ project }: UseFileWatcherProps) => {
  useEffect(() => {
    const startWatching = async () => {
      if (project?.id && project?.vm_status === "active") {
        try {
          await fileOperationsService.startFileWatcher(project.id);
        } catch (error) {
          console.error("Error starting file watcher:", error);
        }
      }
    };

    startWatching();

    return () => {
      if (project?.id) {
        fileOperationsService
          .stopFileWatcher(project.id)
          .catch((error) => console.error("Error stopping file watcher:", error));
      }
    };
  }, [project?.id, project?.vm_status]);

  return { recentEvents: [], clearEvents: () => {} };
};