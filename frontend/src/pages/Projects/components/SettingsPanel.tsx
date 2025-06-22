import { ExternalLink, Play, RefreshCw, Settings } from "lucide-react";
import React from "react";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import type { Project, ProjectStatus } from "../../../types/project";

interface SettingsPanelProps {
  project: Project;
  projectStatus: ProjectStatus | null;
  onRefreshStatus: () => void;
  onSetupVM: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  project,
  projectStatus,
  onRefreshStatus,
  onSetupVM,
}) => {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-5 h-5" />
        <h2 className="text-lg font-semibold">Project Settings</h2>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <Button onClick={onRefreshStatus} variant="ghost" size="sm">
          <RefreshCw className="w-4 h-4" />
        </Button>
        {project?.vm_status === "inactive" && (
          <Button onClick={onSetupVM} variant="outline" size="sm">
            <Play className="w-4 h-4 mr-2" />
            Setup VM
          </Button>
        )}
        {projectStatus?.vm_url && (
          <Button
            onClick={() => window.open(projectStatus.vm_url, "_blank")}
            variant="outline"
            size="sm"
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
        )}
      </div>

      {projectStatus && (
        <Card className="p-4">
          <h3 className="text-sm font-medium mb-3">VM Status</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Services:</span>
              <span className="font-medium">
                {projectStatus?.services?.length || 0}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Files Synced:</span>
              <span className="font-medium">
                {projectStatus?.files?.synced || 0}/
                {projectStatus?.files?.total || 0}
              </span>
            </div>
            {project?.e2b_sandbox_id && (
              <div className="text-xs text-muted-foreground">
                Sandbox:{" "}
                <code className="bg-muted px-1 py-0.5 rounded">
                  {project.e2b_sandbox_id.slice(0, 8)}...
                </code>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};