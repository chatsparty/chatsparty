import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "../../components/ui/button";
import type { ProjectCreate } from "../../types/project";
import { ProjectForm } from "./components/ProjectForm";
import { useProjects } from "./hooks/useProjects";

export const CreateProjectPage: React.FC = () => {
  const navigate = useNavigate();
  const { createProject, loading } = useProjects();

  const handleCreateProject = async (projectData: ProjectCreate) => {
    try {
      await createProject(projectData);
      navigate('/projects');
    } catch (error) {
      // Error handling is done in useProjects hook
      console.error('Failed to create project:', error);
    }
  };

  const handleCancel = () => {
    navigate('/projects');
  };

  return (
    <div className="flex-1 overflow-auto bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-4xl">
        <div className="space-y-8">
          {/* Header Section */}
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleCancel}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Projects
            </Button>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-card-foreground">
              Create New Project
            </h1>
            <p className="text-muted-foreground">
              Set up a new development project with VM workspace and environment configuration
            </p>
          </div>

          {/* Create Project Form */}
          <div className="max-w-2xl mx-auto">
            <div className="bg-card border rounded-lg p-8 shadow-sm">
              <ProjectForm
                onSubmit={(data) => handleCreateProject(data as ProjectCreate)}
                onCancel={handleCancel}
                loading={loading}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};