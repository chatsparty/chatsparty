import {
  AlertCircle,
  CheckCircle,
  Folder,
  Loader2,
} from "lucide-react";
import React from "react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import type { Project } from "../../../types/project";

interface ProjectCardProps {
  project: Project;
  isSelected: boolean;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  isSelected,
  onClick,
  onEdit,
  onDelete,
}) => {
  if (!project) {
    return null;
  }

  const getStatusIcon = () => {
    switch (project?.vm_status) {
      case "active":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "starting":
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Folder className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (project?.vm_status) {
      case "active":
        return "VM Active";
      case "starting":
        return "Starting...";
      case "error":
        return "Error";
      case "stopped":
        return "Stopped";
      default:
        return "Inactive";
    }
  };

  return (
    <Card className={`w-full cursor-pointer transition-all duration-200 hover:shadow-md ${
      isSelected ? "ring-2 ring-primary" : ""
    }`} onClick={onClick}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Folder className="w-5 h-5 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <CardTitle className="text-lg text-card-foreground truncate">
                {project?.name || "Unnamed Project"}
              </CardTitle>
              {project?.description && (
                <CardDescription className="mt-1 line-clamp-2">
                  {project?.description}
                </CardDescription>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={project?.vm_status === "active" ? "default" : "secondary"}>
              {getStatusText()}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="text-sm text-muted-foreground">
              {getStatusText()}
            </span>
          </div>

          {project?.auto_sync_files && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              Auto-sync enabled
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              Delete
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
