import React, { useRef, useState, useEffect } from "react";
import { Tree, NodeApi, TreeApi } from "react-arborist";
import {
  Folder,
  FileText,
  FolderPlus,
  Trash2,
  Edit2,
  Copy,
  Scissors,
  Clipboard,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import { FileIcon, defaultStyles } from "react-file-icon";
import { useFileExplorerArborist } from "./hooks/useFileExplorerArborist";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "../ui/context-menu";
import "./FileExplorerArborist.css";

interface FileExplorerArboristProps {
  projectId: string;
  onOpenFile: (path: string, name: string) => void;
  width?: number;
  height?: number;
}

interface FileNode {
  id: string;
  name: string;
  type: "file" | "directory";
  path: string;
  children?: FileNode[] | null;
  size?: number;
  modified?: string;
  is_directory?: boolean;
  is_file?: boolean;
}

export const FileExplorerArborist: React.FC<FileExplorerArboristProps> = ({
  projectId,
  onOpenFile,
  width = 300,
  height = 600,
}) => {
  const treeRef = useRef<TreeApi<FileNode>>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isTreeReady, setIsTreeReady] = useState(false);

  const {
    data,
    loading,
    error,
    refreshFiles,
    fetchDirectoryChildren,
    createFile,
    createFolder,
    deleteItem,
    renameItem,
    moveItems,
    copyItems,
    pasteItems,
    clipboard,
    updateNodeChildren,
  } = useFileExplorerArborist(projectId);

  useEffect(() => {
    console.log("[FileExplorerArborist] Data state:", {
      dataLength: data?.length,
      loading,
      isTreeReady,
      data: data,
    });

    if (data && data.length > 0 && !loading) {
      const timer = setTimeout(() => {
        setIsTreeReady(true);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setIsTreeReady(false);
    }
  }, [data, loading]);

  const handleSelect = (nodes: NodeApi<FileNode>[]) => {
    const node = nodes[0];
    if (node && node.data.type === "file") {
      onOpenFile(node.data.path, node.data.name);
    }
  };

  const handleMove = async (args: {
    dragIds: string[];
    parentId: string | null;
    index: number;
  }) => {
    const targetNode = args.parentId
      ? treeRef.current?.get(args.parentId)
      : null;
    if (targetNode && targetNode.data.type === "directory") {
      await moveItems(args.dragIds, targetNode.data.path);
    }
  };

  const handleRename = async (args: { id: string; name: string }) => {
    await renameItem(args.id, args.name);
  };

  const handleDelete = async (args: { ids: string[] }) => {
    for (const id of args.ids) {
      await deleteItem(id);
    }
  };

  const getFileExtension = (filename: string): string => {
    const lastDot = filename.lastIndexOf(".");
    return lastDot > 0 ? filename.substring(lastDot + 1).toLowerCase() : "";
  };

  const Node = ({
    node,
    style,
    dragHandle,
  }: {
    node: NodeApi<FileNode>;
    style: React.CSSProperties;
    dragHandle?: (el: HTMLDivElement | null) => void;
  }) => {
    const isDirectory = node.data.type === "directory";

    // For files, get extension and use react-file-icon
    const fileExtension = !isDirectory ? getFileExtension(node.data.name) : "";

    const iconColor = isDirectory ? "text-blue-500" : "text-gray-400";
    const hasOrMightHaveChildren =
      isDirectory &&
      (node.data.children === undefined ||
        (Array.isArray(node.data.children) && node.data.children.length > 0));

    return (
      <ContextMenu>
        <ContextMenuTrigger>
          <div
            ref={dragHandle}
            style={style}
            className={cn(
              "flex items-center gap-1 px-2 py-1 text-sm cursor-pointer hover:bg-accent rounded",
              "group",
              node.isSelected && "bg-accent",
              node.isEditing && "bg-accent"
            )}
            onClick={() => {
              console.log("[FileExplorer] Node clicked:", {
                id: node.id,
                name: node.data.name,
                type: node.data.type,
                isInternal: node.isInternal,
                isOpen: node.isOpen,
                children: node.data.children,
                hasChildren: node.children?.length,
              });
              if (isDirectory) {
                node.toggle();
              } else if (node.data.type === "file") {
                onOpenFile(node.data.path, node.data.name);
              }
            }}
          >
            {hasOrMightHaveChildren && (
              <ChevronRight
                className={cn(
                  "w-4 h-4 transition-transform flex-shrink-0",
                  node.isOpen && "rotate-90"
                )}
              />
            )}
            {!hasOrMightHaveChildren && isDirectory && (
              <span className="inline-flex w-4 h-4" />
            )}
            {isDirectory ? (
              <Folder className={cn("w-4 h-4 flex-shrink-0", iconColor)} />
            ) : (
              <div className="w-4 h-4 flex-shrink-0">
                <FileIcon
                  extension={fileExtension}
                  {...(defaultStyles[
                    fileExtension as keyof typeof defaultStyles
                  ] || defaultStyles.txt)}
                />
              </div>
            )}
            <span className="truncate flex-1">
              {node.isEditing ? (
                <Input
                  type="text"
                  defaultValue={node.data.name}
                  onFocus={(e) => e.currentTarget.select()}
                  onBlur={() => node.reset()}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") node.reset();
                    if (e.key === "Enter") {
                      e.preventDefault();
                      node.submit(e.currentTarget.value);
                    }
                  }}
                  className="h-5 px-1 py-0 text-sm"
                  autoFocus
                />
              ) : (
                node.data.name
              )}
            </span>
            {node.data.type === "directory" &&
              node.children &&
              node.children.length > 0 && (
                <span className="text-xs text-muted-foreground ml-1">
                  {node.children.length}
                </span>
              )}
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent>
          {node.data.type === "directory" && (
            <>
              <ContextMenuItem
                onClick={() => {
                  treeRef.current?.create({
                    parentId: node.id,
                    index: 0,
                    type: "leaf",
                  });
                }}
              >
                <FileText className="w-4 h-4 mr-2" />
                New File
              </ContextMenuItem>
              <ContextMenuItem
                onClick={() => {
                  treeRef.current?.create({
                    parentId: node.id,
                    index: 0,
                    type: "internal",
                  });
                }}
              >
                <FolderPlus className="w-4 h-4 mr-2" />
                New Folder
              </ContextMenuItem>
              <ContextMenuSeparator />
            </>
          )}

          <ContextMenuItem onClick={() => node.edit()}>
            <Edit2 className="w-4 h-4 mr-2" />
            Rename
          </ContextMenuItem>

          <ContextMenuItem onClick={() => copyItems([node.id])}>
            <Copy className="w-4 h-4 mr-2" />
            Copy
          </ContextMenuItem>

          <ContextMenuItem onClick={() => copyItems([node.id], true)}>
            <Scissors className="w-4 h-4 mr-2" />
            Cut
          </ContextMenuItem>

          {node.data.type === "directory" && clipboard.items.length > 0 && (
            <ContextMenuItem onClick={() => pasteItems(node.data.path)}>
              <Clipboard className="w-4 h-4 mr-2" />
              Paste
            </ContextMenuItem>
          )}

          <ContextMenuSeparator />

          <ContextMenuItem
            onClick={() => treeRef.current?.delete(node.id)}
            className="text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-sm text-destructive mb-2">Error loading files</p>
        <Button size="sm" variant="outline" onClick={refreshFiles}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-2">
      <div className="p-2 border-b">
        <Input
          type="text"
          placeholder="Search files..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-8 text-sm"
        />
      </div>

      <div className="flex-1 overflow-hidden">
        {isTreeReady && data && data.length > 0 ? (
          <Tree<FileNode>
            ref={treeRef}
            data={data}
            openByDefault={false}
            width={width}
            height={height - 100}
            indent={20}
            rowHeight={28}
            overscanCount={1}
            searchTerm={searchTerm}
            searchMatch={(node, term) =>
              node.data.name.toLowerCase().includes(term.toLowerCase())
            }
            childrenAccessor={(node) => {
              if (node.type === "directory") {
                return node.children || null;
              }
              return null;
            }}
            onSelect={handleSelect}
            onMove={handleMove}
            onRename={handleRename}
            onCreate={async (args) => {
              const parentNode = args.parentId
                ? treeRef.current?.get(args.parentId)
                : null;
              const parentPath = parentNode
                ? parentNode.data.path
                : "/workspace";

              const name = prompt(
                `Enter name for new ${
                  args.type === "internal" ? "folder" : "file"
                }:`
              );
              if (!name) return null;

              try {
                if (args.type === "internal") {
                  await createFolder(parentPath, name);
                } else {
                  await createFile(parentPath, name);
                }

                const newPath = `${parentPath}/${name}`;
                return { id: newPath };
              } catch (error) {
                console.error("Failed to create item:", error);
                return null;
              }
            }}
            onDelete={handleDelete}
            onToggle={async (nodeId) => {
              const node = treeRef.current?.get(nodeId);
              if (node && node.data.type === "directory") {
                if (node.data.children === undefined) {
                  try {
                    console.log(
                      `[FileExplorer] Loading children for: ${node.data.path}`
                    );
                    const children = await fetchDirectoryChildren(
                      node.data.path
                    );
                    if (children) {
                      console.log(
                        `[FileExplorer] Loaded ${children.length} children for: ${node.data.path}`
                      );
                      updateNodeChildren(node.data.path, children);
                    }
                  } catch (error) {
                    console.error("Failed to load directory children:", error);
                  }
                }
              }
            }}
            disableDrag={false}
            disableDrop={false}
            disableEdit={false}
          >
            {Node}
          </Tree>
        ) : !loading && (!data || data.length === 0) ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">No files found</p>
          </div>
        ) : null}
      </div>

      <div className="p-2 border-t flex gap-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            treeRef.current?.create({
              parentId: null,
              index: 0,
              type: "leaf",
            });
          }}
          title="New File"
        >
          <FileText className="w-4 h-4" />
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            treeRef.current?.create({
              parentId: null,
              index: 0,
              type: "internal",
            });
          }}
          title="New Folder"
        >
          <FolderPlus className="w-4 h-4" />
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={refreshFiles}
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
