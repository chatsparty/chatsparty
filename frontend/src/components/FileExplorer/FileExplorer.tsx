import React, { useEffect, useState } from "react";
import { File, Folder, Loader2, RefreshCw } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { ExplorerHeader } from "./components/ExplorerHeader";
import { ExplorerFooter } from "./components/ExplorerFooter";
import { FileEventsPanel } from "./components/FileEventsPanel";
import { CreateFileDialog } from "./components/CreateFileDialog";
import { DeleteConfirmDialog } from "./components/DeleteConfirmDialog";
import { FileTreeNode } from "./components/FileTreeNode";
import { useFileExplorer } from "./hooks/useFileExplorer";
import { useFileWatcher } from "./hooks/useFileWatcher";
import type { FileExplorerCallbacks } from "./types";
import type { Project } from "../../types/project";

interface FileExplorerProps {
  project: Project;
  expandedFolders: Set<string>;
  callbacks: FileExplorerCallbacks;
  width?: number;
  onWidthChange?: (width: number) => void;
  onResizeStart?: () => void;
  onResizeEnd?: () => void;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
  project,
  expandedFolders,
  callbacks,
  width = 256,
  onWidthChange,
  onResizeStart,
  onResizeEnd,
}) => {
  const [inlineInputRef, setInlineInputRef] = useState<HTMLInputElement | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);

  const {
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
  } = useFileExplorer({
    project,
    expandedFolders,
    onToggleFolder: callbacks.onToggleFolder,
    onOpenFile: callbacks.onOpenFile,
  });

  const { recentEvents, clearEvents } = useFileWatcher({
    project,
    onFileChange: () => fetchFileStructure(false),
  });

  useEffect(() => {
    fetchFileStructure();
  }, [project?.id, project?.vm_status]);

  useEffect(() => {
    if (project?.id) {
      setState(prev => ({ ...prev, currentPath: "/workspace" }));
    }
  }, [project?.id]);

  useEffect(() => {
    if (inlineEditing && inlineInputRef) {
      setTimeout(() => {
        inlineInputRef.focus();
      }, 0);
    }
  }, [inlineEditing, inlineInputRef]);

  const handleInlineInputKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      await confirmInlineCreation();
    } else if (e.key === "Escape") {
      setInlineEditing(null);
    }
  };

  const confirmInlineCreation = async () => {
    if (!inlineEditing || !inlineEditing.name.trim()) {
      setInlineEditing(null);
      return;
    }

    await handleCreateItem(inlineEditing.type, inlineEditing.name, inlineEditing.parentPath);
  };

  const updateInlineEditingName = (name: string) => {
    if (inlineEditing) {
      setInlineEditing({ ...inlineEditing, name });
    }
  };

  const openDeleteDialog = (name: string, path: string, isFolder: boolean) => {
    setDeleteDialog({
      show: true,
      item: { name, path, isFolder },
      deleting: false,
    });
    setState(prev => ({ ...prev, error: null }));
  };

  const handleDragStart = (event: React.DragEvent, filePath: string) => {
    setState(prev => ({ ...prev, draggedItem: filePath }));
    if (!state.selectedFiles.has(filePath)) {
      setState(prev => ({ ...prev, selectedFiles: new Set([filePath]) }));
    }
    const draggedItems = state.selectedFiles.has(filePath)
      ? Array.from(state.selectedFiles)
      : [filePath];
    event.dataTransfer.setData("text/plain", JSON.stringify(draggedItems));
    event.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setState(prev => ({ ...prev, draggedItem: null, dragOverItem: null }));
  };

  const handleDragOver = (
    event: React.DragEvent,
    targetPath: string,
    isFolder: boolean
  ) => {
    if (!isFolder) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setState(prev => ({ ...prev, dragOverItem: targetPath }));
  };

  const handleDragLeave = () => {
    setState(prev => ({ ...prev, dragOverItem: null }));
  };

  const handleDrop = async (
    event: React.DragEvent,
    targetPath: string,
    isFolder: boolean
  ) => {
    event.preventDefault();
    setState(prev => ({ ...prev, dragOverItem: null }));

    if (!isFolder) return;

    try {
      const draggedItems = JSON.parse(
        event.dataTransfer.getData("text/plain")
      ) as string[];

      const validItems = draggedItems.filter(
        sourcePath => sourcePath !== targetPath && !sourcePath.startsWith(targetPath + "/")
      );

      if (validItems.length > 0) {
        await handleMoveFiles(validItems, targetPath);
      }
    } catch (error) {
      console.error("Failed to move files:", error);
      setState(prev => ({ ...prev, error: "Failed to move files" }));
    }
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    setDragStartX(e.clientX);
    setStartWidth(width);
    onResizeStart?.();
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isResizing || !onWidthChange) return;

      // Calculate the difference from the starting drag position
      const deltaX = e.clientX - dragStartX;
      
      // Calculate new width based on the starting width plus the delta
      const newWidth = startWidth + deltaX;
      const clampedWidth = Math.max(250, Math.min(600, newWidth));
      onWidthChange(clampedWidth);
    };

    const handleGlobalMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        onResizeEnd?.();
      }
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleGlobalMouseMove);
      document.addEventListener("mouseup", handleGlobalMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      
      return () => {
        document.removeEventListener("mousemove", handleGlobalMouseMove);
        document.removeEventListener("mouseup", handleGlobalMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
    }
  }, [isResizing, onWidthChange, onResizeEnd, dragStartX, startWidth]);

  const getDisplayableChildren = () => {
    if (!state.fileStructure?.children) {
      console.log("No children in file structure");
      return [];
    }
    
    console.log("File structure has", state.fileStructure.children.length, "children");
    console.log("Children:", state.fileStructure.children.map(c => ({ name: c.name, type: c.type })));
    
    // If there's only one child and it's a UUID folder, show its children instead
    if (state.fileStructure.children.length === 1) {
      const child = state.fileStructure.children[0];
      const isUUIDFolder = child.type === "folder" && 
        child.name.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      
      if (isUUIDFolder && child.children && child.children.length > 0) {
        console.log("Detected UUID folder, showing its children instead");
        return child.children;
      }
    }
    
    // Otherwise, return children as-is
    return state.fileStructure.children;
  };

  const renderFileTree = () => {
    const displayChildren = getDisplayableChildren();
    
    if (displayChildren.length === 0) {
      return (
        <div className="p-4 text-center">
          <p className="text-sm text-muted-foreground mb-2">
            No files in workspace yet
          </p>
          <p className="text-xs text-muted-foreground">
            Create new files using the buttons below
          </p>
          {inlineEditing && inlineEditing.parentPath === (state.fileStructure?.path || "/workspace") && (
            <div className="flex items-center gap-1 px-2 py-1 text-sm mt-2">
              {inlineEditing.type === "folder" ? (
                <Folder className="w-4 h-4 text-blue-500" />
              ) : (
                <File className="w-4 h-4 text-muted-foreground" />
              )}
              <Input
                ref={setInlineInputRef}
                value={inlineEditing.name}
                onChange={(e) => updateInlineEditingName(e.target.value)}
                onKeyDown={handleInlineInputKeyDown}
                onBlur={confirmInlineCreation}
                className="h-6 text-sm border-none p-0 focus:ring-0 bg-transparent"
                placeholder={`New ${inlineEditing.type} name`}
                autoFocus
              />
            </div>
          )}
        </div>
      );
    }

    return (
      <div>
        {displayChildren.map((child) => (
          <FileTreeNode
            key={child.path || `${state.fileStructure?.path || "/workspace"}/${child.name}`}
            item={child}
            path={state.fileStructure?.path || "/workspace"}
            depth={0}
            project={project}
            isExpanded={expandedFolders.has(child.path || `${state.fileStructure?.path || "/workspace"}/${child.name}`)}
            isSelected={state.selectedFiles.has(child.path || `${state.fileStructure?.path || "/workspace"}/${child.name}`)}
            isDragOver={state.dragOverItem === (child.path || `${state.fileStructure?.path || "/workspace"}/${child.name}`)}
            isDragged={state.draggedItem === (child.path || `${state.fileStructure?.path || "/workspace"}/${child.name}`)}
            expandedFolders={expandedFolders}
            inlineEditing={inlineEditing}
            onToggleFolder={callbacks.onToggleFolder}
            onOpenFile={callbacks.onOpenFile}
            onFileSelection={handleFileSelection}
            onStartInlineCreation={startInlineCreation}
            onDeleteItem={openDeleteDialog}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onInlineInputKeyDown={handleInlineInputKeyDown}
            onUpdateInlineEditingName={updateInlineEditingName}
            onConfirmInlineCreation={confirmInlineCreation}
            inlineInputRef={inlineInputRef}
            setInlineInputRef={setInlineInputRef}
          />
        ))}
        {inlineEditing &&
          inlineEditing.parentPath === (state.fileStructure?.path || "/workspace") && (
            <div className="flex items-center gap-1 px-2 py-1 text-sm">
              {inlineEditing.type === "folder" ? (
                <Folder className="w-4 h-4 text-blue-500" />
              ) : (
                <File className="w-4 h-4 text-muted-foreground" />
              )}
              <Input
                ref={setInlineInputRef}
                value={inlineEditing.name}
                onChange={(e) => updateInlineEditingName(e.target.value)}
                onKeyDown={handleInlineInputKeyDown}
                onBlur={confirmInlineCreation}
                className="h-6 text-sm border-none p-0 focus:ring-0 bg-transparent"
                placeholder={`New ${inlineEditing.type} name`}
                autoFocus
              />
            </div>
          )}
      </div>
    );
  };

  const renderContent = () => {
    if (state.loading) {
      return (
        <div className="flex items-center justify-center p-4">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">
            Loading files...
          </span>
        </div>
      );
    }

    if (state.error) {
      return (
        <div className="p-4 text-center">
          <p className="text-sm text-red-500">{state.error}</p>
          <Button
            onClick={() => fetchFileStructure(true)}
            variant="ghost"
            size="sm"
            className="mt-2"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Retry
          </Button>
        </div>
      );
    }

    if (project?.vm_status !== "active") {
      return (
        <div className="p-4 text-center text-sm text-muted-foreground">
          VM must be active to view files
        </div>
      );
    }

    return renderFileTree();
  };

  return (
    <>
      <div 
        className="bg-muted border-r border-border flex flex-col relative"
        style={{ width: `${width}px` }}
      >
        <ExplorerHeader
          selectedFilesCount={state.selectedFiles.size}
          isVMActive={project?.vm_status === "active"}
          loading={state.loading}
          onRefresh={() => fetchFileStructure(true)}
          onClose={callbacks.onClose}
          onClearSelection={clearSelection}
        />

        <div
          className="flex-1 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              clearSelection();
            }
          }}
        >
          {renderContent()}
        </div>

        <FileEventsPanel events={recentEvents} onClearEvents={clearEvents} />

        <ExplorerFooter
          isVMActive={project?.vm_status === "active"}
          onCreateFile={() => startInlineCreation(state.fileStructure?.path || "/workspace", "file")}
          onCreateFolder={() => startInlineCreation(state.fileStructure?.path || "/workspace", "folder")}
        />
        
        {/* Resize Handle */}
        <div
          className="absolute top-0 right-0 w-1 h-full bg-transparent hover:bg-primary cursor-col-resize flex-shrink-0"
          onMouseDown={handleResizeMouseDown}
        />
      </div>

      <CreateFileDialog
        dialog={createDialog}
        currentPath={state.currentPath}
        onClose={() => setCreateDialog({ show: false, type: "file", name: "", creating: false })}
        onNameChange={(name) => setCreateDialog(prev => ({ ...prev, name }))}
        onCreate={() => handleCreateItem(createDialog.type, createDialog.name)}
      />

      <DeleteConfirmDialog
        dialog={deleteDialog}
        onClose={() => setDeleteDialog({ show: false, item: null, deleting: false })}
        onConfirm={() => {
          if (deleteDialog.item) {
            handleDeleteItem(deleteDialog.item.path, deleteDialog.item.isFolder);
          }
        }}
      />
    </>
  );
};