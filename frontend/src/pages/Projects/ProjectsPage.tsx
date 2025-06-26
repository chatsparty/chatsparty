import { Loader2 } from "lucide-react";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import type { Project, ProjectCreate } from "../../types/project";
import { ProjectCard } from "./components/ProjectCard";
import { ProjectForm } from "./components/ProjectForm";
import { useProjects } from "./hooks/useProjects";

export const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    projects,
    loading,
    error,
    createProject,
    deleteProject,
  } = useProjects();

  const [showCreateForm, setShowCreateForm] = useState(false);

  const handleCreateProject = async (projectData: ProjectCreate) => {
    await createProject(projectData);
    setShowCreateForm(false);
  };



  const handleProjectClick = (project: Project) => {
    navigate(`/projects/${project.id}/vscode`);
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
    <div className="flex-1 p-6 overflow-auto bg-background">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-card-foreground">
              Projects
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your development projects and VM workspaces
            </p>
          </div>
          {!showCreateForm && (
            <Button onClick={() => setShowCreateForm(true)}>
              Create New Project
            </Button>
          )}
        </div>

        {showCreateForm && (
          <div className="mb-6">
            <ProjectForm
              onSubmit={(data) => handleCreateProject(data as ProjectCreate)}
              onCancel={() => setShowCreateForm(false)}
              loading={loading}
            />
          </div>
        )}

        {projects && projects.length === 0 && !loading && !error ? (
          <div className="text-center py-12">
            <div className="text-muted-foreground mb-4">
              No projects configured yet
            </div>
            {!showCreateForm && (
              <Button onClick={() => setShowCreateForm(true)}>
                Create Your First Project
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects &&
              projects.length > 0 &&
              projects
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
        )}

      </div>

 
    </div>
  );
};
