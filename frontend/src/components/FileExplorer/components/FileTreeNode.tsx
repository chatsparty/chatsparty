import React from "react";
import {
  ChevronDown,
  ChevronRight,
  File,
  FilePlus,
  Folder,
  FolderOpen,
  FolderPlus,
  Trash2,
} from "lucide-react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import type { FileTreeItem, InlineEditingState } from "../types";
import type { Project } from "../../../types/project";

interface FileTreeNodeProps {
  item: FileTreeItem;
  path: string;
  depth: number;
  project: Project;
  isExpanded: boolean;
  isSelected: boolean;
  isDragOver: boolean;
  isDragged: boolean;
  expandedFolders: Set<string>;
  inlineEditing: InlineEditingState | null;
  onToggleFolder: (folderPath: string) => void;
  onOpenFile: (filePath: string, fileName: string) => void;
  onFileSelection: (filePath: string, event: React.MouseEvent) => void;
  onStartInlineCreation: (parentPath: string, type: "file" | "folder") => void;
  onDeleteItem: (name: string, path: string, isFolder: boolean) => void;
  onDragStart: (event: React.DragEvent, filePath: string) => void;
  onDragEnd: () => void;
  onDragOver: (event: React.DragEvent, targetPath: string, isFolder: boolean) => void;
  onDragLeave: () => void;
  onDrop: (event: React.DragEvent, targetPath: string, isFolder: boolean) => void;
  onInlineInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onUpdateInlineEditingName: (name: string) => void;
  onConfirmInlineCreation: () => void;
  inlineInputRef: HTMLInputElement | null;
  setInlineInputRef: (ref: HTMLInputElement | null) => void;
}

export const FileTreeNode: React.FC<FileTreeNodeProps> = ({
  item,
  path,
  depth,
  project,
  isExpanded,
  isSelected,
  isDragOver,
  isDragged,
  expandedFolders,
  inlineEditing,
  onToggleFolder,
  onOpenFile,
  onFileSelection,
  onStartInlineCreation,
  onDeleteItem,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  onInlineInputKeyDown,
  onUpdateInlineEditingName,
  onConfirmInlineCreation,
  inlineInputRef,
  setInlineInputRef,
}) => {
  const fullPath = item.path || (path ? `${path}/${item.name}` : item.name);

  const renderInlineInput = (_parentPath: string, inputDepth: number) => (
    <div
      className="flex items-center gap-1 px-2 py-1 text-sm"
      style={{ paddingLeft: `${inputDepth * 12 + 20}px` }}
    >
      {inlineEditing?.type === "folder" ? (
        <Folder className="w-4 h-4 text-blue-500" />
      ) : (
        <File className="w-4 h-4 text-muted-foreground" />
      )}
      <Input
        ref={setInlineInputRef}
        value={inlineEditing?.name || ""}
        onChange={(e) => onUpdateInlineEditingName(e.target.value)}
        onKeyDown={onInlineInputKeyDown}
        onBlur={onConfirmInlineCreation}
        className="h-6 text-sm border-none p-0 focus:ring-0 bg-transparent"
        placeholder={`New ${inlineEditing?.type} name`}
        autoFocus
      />
    </div>
  );

  if (item.type === "folder") {
    return (
      <div key={fullPath}>
        <div
          className={`flex items-center gap-1 px-2 py-1 hover:bg-muted text-sm group transition-colors ${
            isSelected ? "bg-blue-100 dark:bg-blue-900/30" : ""
          } ${
            isDragOver
              ? "bg-green-100 dark:bg-green-900/30 border-green-300 border"
              : ""
          } ${isDragged ? "opacity-50" : ""}`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          draggable={project?.vm_status === "active"}
          onDragStart={(e) => onDragStart(e, fullPath)}
          onDragEnd={onDragEnd}
          onDragOver={(e) => onDragOver(e, fullPath, true)}
          onDragLeave={onDragLeave}
          onDrop={(e) => onDrop(e, fullPath, true)}
        >
          <div
            className="flex items-center gap-1 flex-1 cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              onFileSelection(fullPath, e);
              onToggleFolder(fullPath);
            }}
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
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-blue-500 hover:text-blue-600"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartInlineCreation(fullPath, "file");
                }}
                title="New file in this folder"
              >
                <FilePlus className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-blue-500 hover:text-blue-600"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartInlineCreation(fullPath, "folder");
                }}
                title="New folder in this folder"
              >
                <FolderPlus className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteItem(item.name, fullPath, true);
                }}
                title="Delete folder"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
        {isExpanded && item.children && (
          <div>
            {item.children.map((child) => (
              <FileTreeNode
                key={child.path || `${fullPath}/${child.name}`}
                item={child}
                path={fullPath}
                depth={depth + 1}
                project={project}
                isExpanded={expandedFolders.has(child.path || `${fullPath}/${child.name}`)}
                isSelected={false}
                isDragOver={false}
                isDragged={false}
                expandedFolders={expandedFolders}
                inlineEditing={inlineEditing}
                onToggleFolder={onToggleFolder}
                onOpenFile={onOpenFile}
                onFileSelection={onFileSelection}
                onStartInlineCreation={onStartInlineCreation}
                onDeleteItem={onDeleteItem}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onInlineInputKeyDown={onInlineInputKeyDown}
                onUpdateInlineEditingName={onUpdateInlineEditingName}
                onConfirmInlineCreation={onConfirmInlineCreation}
                inlineInputRef={inlineInputRef}
                setInlineInputRef={setInlineInputRef}
              />
            ))}
            {inlineEditing && inlineEditing.parentPath === fullPath && 
              renderInlineInput(fullPath, depth + 1)}
          </div>
        )}
      </div>
    );
  } else {
    return (
      <div
        key={fullPath}
        className={`flex items-center gap-1 px-2 py-1 hover:bg-muted text-sm group transition-colors ${
          isSelected ? "bg-blue-100 dark:bg-blue-900/30" : ""
        } ${isDragged ? "opacity-50" : ""}`}
        style={{ paddingLeft: `${depth * 12 + 20}px` }}
        draggable={project?.vm_status === "active"}
        onDragStart={(e) => onDragStart(e, fullPath)}
        onDragEnd={onDragEnd}
      >
        <div
          className="flex items-center gap-1 flex-1 cursor-pointer"
          onClick={(e) => {
            e.preventDefault();
            onFileSelection(fullPath, e);
            if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
              onOpenFile(fullPath, item.name);
            }
          }}
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
              onDeleteItem(item.name, fullPath, false);
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