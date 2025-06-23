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
  Trash2,
  X,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import axios from "axios";
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
import { useFileSystemWebSocket } from "../hooks/useFileSystemWebSocket";
import { API_BASE_URL } from "../../../config/api";
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{
    name: string;
    path: string;
    isFolder: boolean;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // WebSocket integration for real-time file system events
  const { recentEvents, clearEvents } = useFileSystemWebSocket(
    project?.id || ""
  );

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

  // Refresh file structure when WebSocket events occur
  useEffect(() => {
    if (recentEvents.length > 0) {
      // Debounce file structure refresh to avoid too many API calls
      const timeoutId = setTimeout(() => {
        fetchFileStructure();
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [recentEvents]);

  useEffect(() => {
    if (project?.id) {
      setCurrentPath(`/workspace`);
    }
  }, [project?.id]);

  // Start file watching when component mounts
  useEffect(() => {
    const startWatching = async () => {
      if (project?.id && project?.vm_status === "active") {
        try {
          await axios.post(
            `${API_BASE_URL}/api/projects/${project.id}/files/watch`
          );
        } catch (error) {
          console.error("Error starting file watcher:", error);
        }
      }
    };

    startWatching();

    return () => {
      // Stop watching when component unmounts
      if (project?.id) {
        axios
          .delete(`${API_BASE_URL}/api/projects/${project.id}/files/watch`)
          .catch((error) =>
            console.error("Error stopping file watcher:", error)
          );
      }
    };
  }, [project?.id, project?.vm_status]);

  const handleCreateItem = async () => {
    if (!newItemName.trim() || !project?.id) return;

    setCreating(true);
    try {
      const fullPath = `${currentPath}/${newItemName}`;

      // Use the new WebSocket-enabled file creation API
      await axios.post(
        `${API_BASE_URL}/api/projects/${project.id}/files/create`,
        {
          path: fullPath,
          is_folder: createType === "folder",
          content: createType === "file" ? "# New File\n\nContent here..." : "",
        }
      );

      // Close dialog and reset
      setShowCreateDialog(false);
      setNewItemName("");

      // Note: File structure will be automatically updated via WebSocket events
    } catch (err: any) {
      console.error(`Failed to create ${createType}:`, err);

      // Extract error message from response
      let errorMessage = `Failed to create ${createType}`;
      if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
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

  const openDeleteDialog = (name: string, path: string, isFolder: boolean) => {
    setItemToDelete({ name, path, isFolder });
    setError(null); // Clear any previous errors
    setShowDeleteDialog(true);
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete || !project?.id) return;

    setDeleting(true);
    try {
      // Convert relative path to full path
      const fullPath = itemToDelete.path.startsWith("/workspace")
        ? itemToDelete.path
        : `${currentPath}/${itemToDelete.name}`;

      console.log(`[DELETE] Starting delete operation:`);
      console.log(`- Project ID: ${project.id}`);
      console.log(`- Item name: ${itemToDelete.name}`);
      console.log(`- Original path: ${itemToDelete.path}`);
      console.log(`- Full path: ${fullPath}`);
      console.log(`- Is folder: ${itemToDelete.isFolder}`);

      const result = await projectApi.deleteFile(
        project.id,
        fullPath,
        itemToDelete.isFolder,
        true // recursive deletion for folders
      );

      console.log(`[DELETE] ✅ API call successful:`, result);

      // Close dialog and reset
      setShowDeleteDialog(false);
      setItemToDelete(null);

      // Note: File structure will be automatically updated via WebSocket events
    } catch (err: any) {
      console.error(
        `[DELETE] ❌ Failed to delete ${itemToDelete.isFolder ? "folder" : "file"}:`,
        err
      );
      console.error(`[DELETE] Full error object:`, err);
      console.error(`[DELETE] Response data:`, err.response?.data);
      console.error(`[DELETE] Response status:`, err.response?.status);

      // Extract error message from response
      let errorMessage = `Failed to delete ${
        itemToDelete.isFolder ? "folder" : "file"
      }`;
      if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setDeleting(false);
    }
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
            className="flex items-center gap-1 px-2 py-1 hover:bg-muted text-sm group"
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
          >
            <div
              className="flex items-center gap-1 flex-1 cursor-pointer"
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
            {project?.vm_status === "active" && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700"
                onClick={(e) => {
                  e.stopPropagation();
                  openDeleteDialog(item.name, fullPath, true);
                }}
                title="Delete folder"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
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
          className="flex items-center gap-1 px-2 py-1 hover:bg-muted text-sm group"
          style={{ paddingLeft: `${depth * 12 + 20}px` }}
        >
          <div
            className="flex items-center gap-1 flex-1 cursor-pointer"
            onClick={() => onOpenFile(fullPath, item.name)}
          >
            <File className="w-4 h-4 text-muted-foreground" />
            <span className="text-foreground">{item.name}</span>
          </div>
          {project?.vm_status === "active" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700"
              onClick={(e) => {
                e.stopPropagation();
                openDeleteDialog(item.name, fullPath, false);
              }}
              title="Delete file"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
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

        {/* Recent Events Panel */}
        {recentEvents.length > 0 && (
          <div className="border-t border-border bg-muted/50">
            <div className="p-2">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-xs font-medium text-foreground">
                  Recent File Events
                </h4>
                <Button
                  onClick={clearEvents}
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear
                </Button>
              </div>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {recentEvents.map((event, index) => (
                  <div key={index} className="text-xs text-muted-foreground">
                    <span className="font-mono bg-muted px-1 rounded">
                      {event.event_type}
                    </span>
                    : {event.file_path}
                    <span className="text-muted-foreground/70 ml-2">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Create file/folder buttons */}
        {project?.vm_status === "active" ? (
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
        ) : (
          <div className="p-2 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              VM must be active to create files. Start the project VM to enable
              file creation.
            </p>
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

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Delete {itemToDelete?.isFolder ? "Folder" : "File"}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{itemToDelete?.name}"?
              {itemToDelete?.isFolder && (
                <span className="block mt-2 text-red-600 font-medium">
                  This will permanently delete the folder and all its contents.
                </span>
              )}
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteItem}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                `Delete ${itemToDelete?.isFolder ? "Folder" : "File"}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
