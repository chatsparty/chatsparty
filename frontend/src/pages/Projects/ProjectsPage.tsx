import { Loader2 } from "lucide-react";
import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import type { Project } from "../../types/project";
import { ProjectCard } from "./components/ProjectCard";
import { useProjects } from "./hooks/useProjects";

export const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    projects,
    loading,
    error,
    deleteProject,
  } = useProjects();

  const handleProjectClick = (project: Project) => {
    navigate(`/projects/${project.id}`);
  };

  const handleDeleteProject = async (projectId: string) => {
    if (
      confirm(
        "Are you sure you want to delete this project? This action cannot be undone."
      )
    ) {
      await deleteProject(projectId);
    }
  };

  if (loading && (!projects || projects.length === 0)) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mr-2" />
        <div className="text-muted-foreground">Loading projects...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-destructive">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
        <div className="space-y-8">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold text-card-foreground">
                Projects
              </h1>
              <p className="text-muted-foreground">
                Manage your development projects and VM workspaces
              </p>
            </div>
            <Button 
              onClick={() => navigate('/projects/new')}
              className="w-full sm:w-auto"
            >
              Create New Project
            </Button>
          </div>

          {/* Projects Grid Section */}
          {projects && projects.length === 0 && !loading && !error ? (
            <div className="text-center py-16">
              <div className="max-w-md mx-auto">
                <div className="text-muted-foreground mb-6 text-lg">
                  No projects configured yet
                </div>
                <p className="text-sm text-muted-foreground mb-6">
                  Create your first project to get started with VM workspaces and development environments.
                </p>
                <Button 
                  onClick={() => navigate('/projects/new')}
                  size="lg"
                >
                  Create Your First Project
                </Button>
              </div>
            </div>
          ) : (
            projects && projects.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium">Your Projects</h2>
                  <span className="text-sm text-muted-foreground">
                    {projects.length} project{projects.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {projects
                    .filter((project) => project && project.id)
                    .map((project) => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        isSelected={false}
                        onClick={() => handleProjectClick(project)}
                        onEdit={() => handleProjectClick(project)}
                        onDelete={() => handleDeleteProject(project.id)}
                      />
                    ))}
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
