import { ArrowLeft, Loader2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../../components/ui/button";
import type { Project, ProjectUpdate } from "../../types/project";
import { ProjectDetails } from "./components/ProjectDetails";
import { ProjectForm } from "./components/ProjectForm";
import { useProjects } from "./hooks/useProjects";

export const ProjectDetailsPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const {
    projectStatus,
    vmServices,
    loading,
    error,
    getProject,
    selectProject,
    updateProject,
    setupVMWorkspace,
    refreshProjectStatus,
    stopVMService,
    stopServiceByPort,
    refreshVMServices,
  } = useProjects();

  const [project, setProject] = useState<Project | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (projectId) {
      getProject(projectId)
        .then((project) => {
          setProject(project);
          selectProject(project);
        })
        .catch((err) => {
          console.error("Failed to load project:", err);
          setProject(null);
          selectProject(null);
        });
    }

    return () => {
      selectProject(null);
    };
  }, [projectId, getProject, selectProject]);

  const handleUpdateProject = async (projectData: ProjectUpdate) => {
    if (project) {
      await updateProject(project.id, projectData);
      setIsEditing(false);
      setProject({ ...project, ...projectData });
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-muted-foreground mx-auto mb-4" />
          <div className="text-lg text-muted-foreground">
            Loading project...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-24 h-24 mx-auto mb-6 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
            <ArrowLeft className="w-12 h-12 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Error Loading Project
          </h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <div className="flex gap-4 justify-center">
            <Button
              onClick={() => {
                if (projectId) {
                  getProject(projectId).then(setProject).catch(console.error);
                }
              }}
              variant="outline"
            >
              Retry
            </Button>
            <Button onClick={() => navigate("/projects")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Projects
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!loading && !project && projectId) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-24 h-24 mx-auto mb-6 bg-muted rounded-full flex items-center justify-center">
            <ArrowLeft className="w-12 h-12 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Project Not Found
          </h1>
          <p className="text-muted-foreground mb-6">
            The project you're looking for doesn't exist or may have been
            deleted.
          </p>
          <Button onClick={() => navigate("/projects")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  if (isEditing && project) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <div className="p-4 border-b border-border">
          <Button
            onClick={() => navigate("/projects")}
            variant="ghost"
            size="sm"
            className="mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>
        </div>

        <div className="flex-1 p-6 overflow-auto bg-background">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Edit Project</h1>
            <ProjectForm
              project={project}
              onSubmit={(data) => handleUpdateProject(data as ProjectUpdate)}
              onCancel={() => setIsEditing(false)}
              loading={loading}
            />
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-muted-foreground mx-auto mb-4" />
          <div className="text-lg text-muted-foreground">
            Loading project...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-background">
      <ProjectDetails
        project={project}
        projectStatus={projectStatus}
        vmServices={vmServices}
        onSetupVM={() => setupVMWorkspace(project.id)}
        onRefreshStatus={() => refreshProjectStatus(project.id)}
        onStopService={(serviceId) => stopVMService(project.id, serviceId)}
        onStopServiceByPort={(port) => stopServiceByPort(project.id, port)}
        onRefreshServices={() => refreshVMServices(project.id)}
        onNavigateBack={() => navigate("/projects")}
        onEditProject={() => setIsEditing(true)}
      />
    </div>
  );
};
