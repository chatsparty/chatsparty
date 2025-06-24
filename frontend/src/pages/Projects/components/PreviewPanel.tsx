import React from "react";
import MinimalBrowserWithAutoUpdate from "../../../components/MinimalBrowserWithAutoUpdate";

interface PreviewPanelProps {
  projectId: string;
  previewUrl?: string;
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({ 
  projectId, 
  previewUrl 
}) => {
  return (
    <div className="h-full">
      <MinimalBrowserWithAutoUpdate 
        projectId={projectId}
        initialUrl={previewUrl}
        className="h-full no-border"
      />
    </div>
  );
};