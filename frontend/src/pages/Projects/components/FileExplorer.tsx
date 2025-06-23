import React from "react";
import { FileExplorer as FileExplorerComponent } from "../../../components/FileExplorer";
import type { FileExplorerCallbacks } from "../../../components/FileExplorer";
import type { Project } from "../../../types/project";

interface FileExplorerProps {
  project: Project;
  expandedFolders: Set<string>;
  onToggleFolder: (folderPath: string) => void;
  onOpenFile: (filePath: string, fileName: string) => void;
  onClose: () => void;
  width?: number;
  onWidthChange?: (width: number) => void;
  onResizeStart?: () => void;
  onResizeEnd?: () => void;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
  project,
  expandedFolders,
  onToggleFolder,
  onOpenFile,
  onClose,
  width,
  onWidthChange,
  onResizeStart,
  onResizeEnd,
}) => {
  const callbacks: FileExplorerCallbacks = {
    onToggleFolder,
    onOpenFile,
    onClose,
  };

  return (
    <FileExplorerComponent
      project={project}
      expandedFolders={expandedFolders}
      callbacks={callbacks}
      width={width}
      onWidthChange={onWidthChange}
      onResizeStart={onResizeStart}
      onResizeEnd={onResizeEnd}
    />
  );
};
