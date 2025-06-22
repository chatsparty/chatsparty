import {
  ChevronDown,
  ChevronRight,
  File,
  FilePlus,
  Folder,
  FolderOpen,
  FolderPlus,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { Button } from "../../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { projectApi } from "../../../services/projectApi";
import type { Project } from "../../../types/project";

interface FileTreeItem {
  name: string;
  type: "file" | "folder";
  path?: string;
  children?: FileTreeItem[];
}

interface FileExplorerProps {
  project: Project;
  expandedFolders: Set<string>;
  onToggleFolder: (folderPath: string) => void;
  onOpenFile: (filePath: string, fileName: string) => void;
  onClose: () => void;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
  project,
  expandedFolders,
  onToggleFolder,
  onOpenFile,
  onClose,
}) => {
  const [fileStructure, setFileStructure] = useState<FileTreeItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createType, setCreateType] = useState<"file" | "folder">("file");
  const [newItemName, setNewItemName] = useState("");
  const [currentPath, setCurrentPath] = useState("/workspace");
  const [creating, setCreating] = useState(false);

  const fetchFileStructure = async () => {
    if (!project?.id || project?.vm_status !== "active") {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await projectApi.getVMFiles(project.id);

      // Transform the API response to FileTreeItem format
      const transformFileData = (data: {
        name: string;
        type: string;
        path?: string;
        children?: FileTreeItem[];
      }): FileTreeItem => {
        return {
          name: data.name,
          type: data.type === "directory" ? "folder" : "file",
          path: data.path,
          children: data.children?.map(transformFileData),
        };
      };

      setFileStructure(transformFileData(response.files));
    } catch (err) {
      console.error("Failed to fetch file structure:", err);
      setError("Failed to load files");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFileStructure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id, project?.vm_status]);

  useEffect(() => {
    if (project?.id) {
      setCurrentPath(`/workspace/${project.id}`);
    }
  }, [project?.id]);

  const handleCreateItem = async () => {
    if (!newItemName.trim() || !project?.id) return;

    setCreating(true);
    try {
      const fullPath = `${currentPath}/${newItemName}`;

      let result;
      if (createType === "folder") {
        // Create folder using mkdir command
        result = await projectApi.executeVMCommand(project.id, {
          command: `mkdir -p "${fullPath}"`,
          working_dir: currentPath,
        });
      } else {
        // Create empty file using touch command
        result = await projectApi.executeVMCommand(project.id, {
          command: `touch "${fullPath}"`,
          working_dir: currentPath,
        });
      }

      // Log the result for debugging
      console.log(`${createType} creation result:`, result);

      // Refresh file structure after a short delay to ensure backend is updated
      setTimeout(async () => {
        await fetchFileStructure();
      }, 500);

      // Close dialog and reset
      setShowCreateDialog(false);
      setNewItemName("");
    } catch (err) {
      console.error(`Failed to create ${createType}:`, err);
      setError(
        `Failed to create ${createType}: ${projectApi.handleApiError(err)}`
      );
    } finally {
      setCreating(false);
    }
  };

  const openCreateDialog = (type: "file" | "folder") => {
    setCreateType(type);
    setNewItemName("");
    setError(null); // Clear any previous errors
    setShowCreateDialog(true);
  };

  const renderFileTree = (
    item: FileTreeItem,
    path: string = "",
    depth: number = 0
  ) => {
    const fullPath = item.path || (path ? `${path}/${item.name}` : item.name);
    const isExpanded = expandedFolders.has(fullPath);

    if (item.type === "folder") {
      return (
        <div key={fullPath}>
          <div
            className="flex items-center gap-1 px-2 py-1 hover:bg-muted cursor-pointer text-sm"
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            onClick={() => onToggleFolder(fullPath)}
          >
            {isExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            {isExpanded ? (
              <FolderOpen className="w-4 h-4 text-blue-500" />
            ) : (
              <Folder className="w-4 h-4 text-blue-500" />
            )}
            <span className="text-foreground">{item.name}</span>
          </div>
          {isExpanded && item.children && (
            <div>
              {item.children.map((child) =>
                renderFileTree(child, fullPath, depth + 1)
              )}
            </div>
          )}
        </div>
      );
    } else {
      return (
        <div
          key={fullPath}
          className="flex items-center gap-1 px-2 py-1 hover:bg-muted cursor-pointer text-sm"
          style={{ paddingLeft: `${depth * 12 + 20}px` }}
          onClick={() => onOpenFile(fullPath, item.name)}
        >
          <File className="w-4 h-4 text-muted-foreground" />
          <span className="text-foreground">{item.name}</span>
        </div>
      );
    }
  };

  return (
    <>
      <div className="w-64 bg-muted border-r border-border flex flex-col">
        <div className="p-2 border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Explorer</h3>
            <div className="flex items-center gap-1">
              {project?.vm_status === "active" && (
                <Button
                  onClick={fetchFileStructure}
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  disabled={loading}
                >
                  <RefreshCw
                    className={`w-3 h-3 ${loading ? "animate-spin" : ""}`}
                  />
                </Button>
              )}
              <Button
                onClick={onClose}
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">
                Loading files...
              </span>
            </div>
          ) : error ? (
            <div className="p-4 text-center">
              <p className="text-sm text-red-500">{error}</p>
              <Button
                onClick={fetchFileStructure}
                variant="ghost"
                size="sm"
                className="mt-2"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Retry
              </Button>
            </div>
          ) : project?.vm_status !== "active" ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              VM must be active to view files
            </div>
          ) : fileStructure &&
            fileStructure.children &&
            fileStructure.children.length > 0 ? (
            <div>
              {fileStructure.children.map((child) =>
                renderFileTree(child, fileStructure.path || "/workspace", 0)
              )}
            </div>
          ) : (
            <div className="p-4 text-center">
              <p className="text-sm text-muted-foreground mb-2">
                No files in workspace yet
              </p>
              <p className="text-xs text-muted-foreground">
                Upload files or create them using the console
              </p>
            </div>
          )}
        </div>

        {/* Create file/folder buttons */}
        {project?.vm_status === "active" && (
          <div className="p-2 border-t border-border flex gap-2">
            <Button
              onClick={() => openCreateDialog("file")}
              variant="ghost"
              size="sm"
              className="flex-1 justify-start"
            >
              <FilePlus className="w-4 h-4 mr-2" />
              New File
            </Button>
            <Button
              onClick={() => openCreateDialog("folder")}
              variant="ghost"
              size="sm"
              className="flex-1 justify-start"
            >
              <FolderPlus className="w-4 h-4 mr-2" />
              New Folder
            </Button>
          </div>
        )}
      </div>

      {/* Create file/folder dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Create New {createType === "file" ? "File" : "Folder"}
            </DialogTitle>
            <DialogDescription>
              Enter a name for the new {createType}. It will be created in the
              current directory.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder={
                  createType === "file" ? "filename.txt" : "folder-name"
                }
                className="col-span-3"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !creating) {
                    handleCreateItem();
                  }
                }}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              Location: {currentPath}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateItem}
              disabled={!newItemName.trim() || creating}
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                `Create ${createType === "file" ? "File" : "Folder"}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
