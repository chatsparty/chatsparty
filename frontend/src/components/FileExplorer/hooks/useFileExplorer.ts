import { useState } from "react";
import { fileOperationsService } from "../services/fileOperationsService";
import type {
  FileExplorerState,
  InlineEditingState,
  CreateDialogState,
  DeleteDialogState,
} from "../types";
import type { Project } from "../../../types/project";

interface UseFileExplorerProps {
  project: Project;
  expandedFolders: Set<string>;
  onToggleFolder: (folderPath: string) => void;
  onOpenFile: (filePath: string, fileName: string) => void;
}

export const useFileExplorer = ({
  project,
  expandedFolders,
  onToggleFolder,
  onOpenFile,
}: UseFileExplorerProps) => {
  const [state, setState] = useState<FileExplorerState>({
    fileStructure: null,
    loading: true,
    error: null,
    expandedFolders: new Set(),
    selectedFiles: new Set(),
    draggedItem: null,
    dragOverItem: null,
    currentPath: "/workspace",
  });

  const [inlineEditing, setInlineEditing] = useState<InlineEditingState | null>(
    null
  );
  const [createDialog, setCreateDialog] = useState<CreateDialogState>({
    show: false,
    type: "file",
    name: "",
    creating: false,
  });
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>({
    show: false,
    item: null,
    deleting: false,
  });

  const fetchFileStructure = async (showLoader: boolean = true) => {
    if (!project?.id || project?.vm_status !== "active") {
      setState((prev) => ({ ...prev, loading: false }));
      return;
    }

    try {
      if (showLoader) {
        setState((prev) => ({ ...prev, loading: true }));
      }
      setState((prev) => ({ ...prev, error: null }));

      const fileStructure = await fileOperationsService.fetchFileStructure(
        project.id
      );
      console.log("Fetched file structure:", fileStructure);
      if (fileStructure?.children) {
        console.log("Number of root children:", fileStructure.children.length);
        console.log(
          "Root children:",
          fileStructure.children.map((c) => ({ name: c.name, type: c.type }))
        );
      }
      setState((prev) => ({ ...prev, fileStructure }));
    } catch (err) {
      console.error("Failed to fetch file structure:", err);
      setState((prev) => ({ ...prev, error: "Failed to load files" }));
    } finally {
      if (showLoader) {
        setState((prev) => ({ ...prev, loading: false }));
      }
    }
  };

  const handleCreateItem = async (
    type: "file" | "folder",
    name: string,
    parentPath?: string
  ) => {
    if (!name.trim() || !project?.id) return;

    setCreateDialog((prev) => ({ ...prev, creating: true }));
    try {
      const fullPath = parentPath
        ? `${parentPath}/${name}`
        : `${state.currentPath}/${name}`;

      if (type === "file") {
        await fileOperationsService.createFile(project.id, fullPath, "");
      } else {
        await fileOperationsService.createFolder(project.id, fullPath);
      }

      await fetchFileStructure(false);
      setCreateDialog({ show: false, type: "file", name: "", creating: false });
      setInlineEditing(null);

      if (type === "file") {
        onOpenFile(fullPath, name);
      }
    } catch (err: any) {
      console.error(`Failed to create ${type}:`, err);
      const errorMessage =
        err.response?.data?.detail || err.message || `Failed to create ${type}`;
      setState((prev) => ({ ...prev, error: errorMessage }));
    } finally {
      setCreateDialog((prev) => ({ ...prev, creating: false }));
    }
  };

  const handleDeleteItem = async (path: string, isFolder: boolean) => {
    if (!project?.id) return;

    setDeleteDialog((prev) => ({ ...prev, deleting: true }));
    try {
      await fileOperationsService.deleteFile(project.id, path, isFolder, true);
      await fetchFileStructure(false);
      setDeleteDialog({ show: false, item: null, deleting: false });
    } catch (err: any) {
      console.error(`Failed to delete ${isFolder ? "folder" : "file"}:`, err);
      const errorMessage =
        err.response?.data?.detail ||
        err.message ||
        `Failed to delete ${isFolder ? "folder" : "file"}`;
      setState((prev) => ({ ...prev, error: errorMessage }));
    } finally {
      setDeleteDialog((prev) => ({ ...prev, deleting: false }));
    }
  };

  const handleFileSelection = (filePath: string, event: React.MouseEvent) => {
    if (event.ctrlKey || event.metaKey) {
      const newSelected = new Set(state.selectedFiles);
      if (newSelected.has(filePath)) {
        newSelected.delete(filePath);
      } else {
        newSelected.add(filePath);
      }
      setState((prev) => ({ ...prev, selectedFiles: newSelected }));
    } else if (event.shiftKey && state.selectedFiles.size > 0) {
      const newSelected = new Set(state.selectedFiles);
      newSelected.add(filePath);
      setState((prev) => ({ ...prev, selectedFiles: newSelected }));
    } else {
      setState((prev) => ({ ...prev, selectedFiles: new Set([filePath]) }));
    }
  };

  const clearSelection = () => {
    setState((prev) => ({ ...prev, selectedFiles: new Set() }));
  };

  const startInlineCreation = (parentPath: string, type: "file" | "folder") => {
    if (!expandedFolders.has(parentPath)) {
      onToggleFolder(parentPath);
    }
    setInlineEditing({ parentPath, type, name: "" });
  };

  const handleMoveFiles = async (
    draggedItems: string[],
    targetPath: string
  ) => {
    if (!project?.id) return;

    try {
      for (const sourcePath of draggedItems) {
        if (
          sourcePath === targetPath ||
          sourcePath.startsWith(targetPath + "/")
        ) {
          continue;
        }

        const fileName = sourcePath.split("/").pop();
        const newPath = `${targetPath}/${fileName}`;
        await fileOperationsService.moveFile(project.id, sourcePath, newPath);
      }

      await fetchFileStructure(false);
      setState((prev) => ({ ...prev, selectedFiles: new Set() }));
    } catch (error) {
      console.error("Failed to move files:", error);
      setState((prev) => ({ ...prev, error: "Failed to move files" }));
    }
  };

  return {
    state,
    setState,
    inlineEditing,
    setInlineEditing,
    createDialog,
    setCreateDialog,
    deleteDialog,
    setDeleteDialog,
    fetchFileStructure,
    handleCreateItem,
    handleDeleteItem,
    handleFileSelection,
    clearSelection,
    startInlineCreation,
    handleMoveFiles,
  };
};
