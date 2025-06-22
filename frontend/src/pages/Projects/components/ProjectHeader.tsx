import { AlertCircle, CheckCircle, Edit, Home, Loader2, Square } from "lucide-react";
import React from "react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import type { Project } from "../../../types/project";

interface ProjectHeaderProps {
  project: Project;
  onNavigateBack?: () => void;
  onEditProject?: () => void;
}

export const ProjectHeader: React.FC<ProjectHeaderProps> = ({
  project,
  onNavigateBack,
  onEditProject,
}) => {
  const getStatusIcon = () => {
    switch (project?.vm_status) {
      case "active":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "starting":
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Square className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (project?.vm_status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "starting":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "error":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  return (
    <div className="px-4 py-2 border-b border-border flex-shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onNavigateBack && (
            <Button onClick={onNavigateBack} variant="ghost" size="sm">
              <Home className="w-4 h-4 mr-1" />
              Home
            </Button>
          )}
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              {project?.name || "Unnamed Project"}
            </h1>
            {project?.description && (
              <p className="text-sm text-muted-foreground">
                {project?.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <Badge className={getStatusColor()}>
            {(project?.vm_status || "inactive").toUpperCase()}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {onEditProject && (
            <Button onClick={onEditProject} variant="outline" size="sm">
              <Edit className="w-4 h-4 mr-1" />
              Edit
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};