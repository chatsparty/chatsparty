import { useEffect } from "react";
import { fileOperationsService } from "../services/fileOperationsService";
import { useFileSystemWebSocket } from "../../../pages/Projects/hooks/useFileSystemWebSocket";
import type { Project } from "../../../types/project";

interface UseFileWatcherProps {
  project: Project;
  onFileChange: () => void;
}

export const useFileWatcher = ({ project, onFileChange }: UseFileWatcherProps) => {
  const { recentEvents, clearEvents } = useFileSystemWebSocket(project?.id || "");

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

  useEffect(() => {
    if (recentEvents.length > 0) {
      const timeoutId = setTimeout(() => {
        onFileChange();
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [recentEvents, onFileChange]);

  return { recentEvents, clearEvents };
};