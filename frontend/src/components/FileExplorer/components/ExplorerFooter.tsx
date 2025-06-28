import React from "react";
import { FilePlus, FolderPlus } from "lucide-react";
import { Button } from "../../ui/button";

interface ExplorerFooterProps {
  isVMActive: boolean;
  onCreateFile: () => void;
  onCreateFolder: () => void;
}

export const ExplorerFooter: React.FC<ExplorerFooterProps> = ({
  isVMActive,
  onCreateFile,
  onCreateFolder,
}) => {
  if (isVMActive) {
    return (
      <div className="p-2 border-t border-border flex gap-2">
        <Button
          onClick={onCreateFile}
          variant="ghost"
          size="sm"
          className="flex-1 justify-start"
        >
          <FilePlus className="w-4 h-4 mr-2" />
          New File
        </Button>
        <Button
          onClick={onCreateFolder}
          variant="ghost"
          size="sm"
          className="flex-1 justify-start"
        >
          <FolderPlus className="w-4 h-4 mr-2" />
          New Folder
        </Button>
      </div>
    );
  }

  return (
    <div className="p-2 border-t border-border">
      <p className="text-xs text-muted-foreground text-center">
        VM must be active to create files. Start the project VM to enable file creation.
      </p>
    </div>
  );
};