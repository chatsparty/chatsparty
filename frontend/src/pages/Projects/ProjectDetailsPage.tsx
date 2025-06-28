import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, MoreHorizontal, Star } from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { useProjects } from "./hooks/useProjects";
import { ProjectConversations } from "./components/ProjectConversations";
import { ProjectKnowledge } from "./components/ProjectKnowledge";
import type { Project } from "../../types/project";

export const ProjectDetailsPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { projects, loading } = useProjects();
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    if (!loading && projects.length > 0 && projectId) {
      const foundProject = projects.find((p) => p.id === projectId);
      if (foundProject) {
        setProject(foundProject);
      } else {
        // Project not found, redirect to projects list
        navigate("/projects");
      }
    }
  }, [projects, projectId, loading, navigate]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-sm text-muted-foreground">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/projects"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              All projects
            </Link>
            <h1 className="text-xl font-semibold">{project.name}</h1>
            <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded">
              Private
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Star className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate(`/projects/${project.id}/edit`)}>
                  Edit project
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(`/projects/${project.id}/vscode`)}>
                  Open in VS Code
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">
                  Delete project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden justify-center">
        <div className="flex gap-6 w-full max-w-7xl px-6 py-6">
          {/* Left Panel - Conversations */}
          <div className="w-[60%] bg-card rounded-lg border border-border shadow-sm">
            <ProjectConversations projectId={project.id} />
          </div>

          {/* Right Panel - Project Knowledge */}
          <div className="w-[40%] bg-card rounded-lg border border-border shadow-sm">
            <ProjectKnowledge projectId={project.id} />
          </div>
        </div>
      </div>
    </div>
  );
};