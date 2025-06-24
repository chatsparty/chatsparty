import { useState, useEffect, useCallback } from "react";
import axios from "axios";

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

interface ClipboardState {
  items: string[];
  operation: "copy" | "cut" | null;
}

export const useFileExplorerArborist = (projectId: string) => {
  const [data, setData] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clipboard, setClipboard] = useState<ClipboardState>({
    items: [],
    operation: null,
  });

  const updateNodeChildren = useCallback(
    (
      nodes: FileNode[],
      targetPath: string,
      newChildren: FileNode[]
    ): FileNode[] => {
      return nodes.map((node) => {
        if (node.path === targetPath) {
          return { ...node, children: newChildren };
        }
        if (node.children) {
          return {
            ...node,
            children: updateNodeChildren(
              node.children,
              targetPath,
              newChildren
            ),
          };
        }
        return node;
      });
    },
    []
  );

  const convertToArboristFormat = (fileStructure: any): FileNode[] => {
    if (!fileStructure || !fileStructure.children) return [];

    const convertNode = (node: any): FileNode => {
      const fileNode: FileNode = {
        id: node.path,
        name: node.name,
        type: node.type === "directory" ? "directory" : "file",
        path: node.path,
        size: node.size,
        modified: node.modified,
      };

      if (node.children && node.children.length > 0) {
        fileNode.children = node.children.map(convertNode);
      }

      return fileNode;
    };

    return fileStructure.children.map(convertNode);
  };

  const fetchFiles = useCallback(async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(
        `/api/projects/${projectId}/files/children`,
        {
          params: { path: "/workspace" },
        }
      );

      const children = response.data.children || [];
      console.log("[FileExplorer] API Response:", response.data);
      console.log("[FileExplorer] Fetched children:", children);

      const transformedData = children.map((item: any) => ({
        ...item,
        id: item.id || item.path,
        name: item.name,
        path: item.path,
        type: item.type === "directory" ? "directory" : "file",
        children:
          item.type === "directory"
            ? item.children === null
              ? undefined
              : item.children
            : undefined,
      }));

      console.log("[FileExplorer] Transformed data:", transformedData);
      setData(transformedData);
    } catch (err: any) {
      console.error("Failed to fetch files:", err);
      setError(err.response?.data?.detail || "Failed to load files");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const fetchDirectoryChildren = async (path: string): Promise<FileNode[]> => {
    try {
      const response = await axios.get(
        `/api/projects/${projectId}/files/children`,
        {
          params: { path },
        }
      );

      const children = response.data.children || [];
      console.log(
        `[FileExplorer] Fetched ${children.length} children for path: ${path}`,
        children
      );

      return children.map((item: any) => ({
        ...item,
        id: item.id || item.path,
        name: item.name,
        path: item.path,
        type: item.type === "directory" ? "directory" : "file",
        children:
          item.type === "directory"
            ? item.children === null
              ? undefined
              : item.children
            : undefined,
      }));
    } catch (err: any) {
      console.error("Failed to fetch directory children:", err);
      throw err;
    }
  };

  const createFile = async (
    parentPath: string,
    name: string,
    content: string = ""
  ) => {
    try {
      const filePath = `${parentPath}/${name}`;

      await axios.post(`/api/projects/${projectId}/files/create`, {
        path: filePath,
        is_folder: false,
        content,
      });

      await fetchFiles();
    } catch (err: any) {
      console.error("Failed to create file:", err);
      throw new Error(err.response?.data?.detail || "Failed to create file");
    }
  };

  const createFolder = async (parentPath: string, name: string) => {
    try {
      const folderPath = `${parentPath}/${name}`;

      await axios.post(`/api/projects/${projectId}/files/create`, {
        path: folderPath,
        is_folder: true,
      });

      await fetchFiles();
    } catch (err: any) {
      console.error("Failed to create folder:", err);
      throw new Error(err.response?.data?.detail || "Failed to create folder");
    }
  };

  const deleteItem = async (itemPath: string) => {
    try {
      const node = findNodeByPath(data, itemPath);
      if (!node) return;

      await axios.delete(`/api/projects/${projectId}/files/delete`, {
        data: {
          path: itemPath,
          is_folder: node.type === "directory",
          recursive: true,
        },
      });

      await fetchFiles();
    } catch (err: any) {
      console.error("Failed to delete item:", err);
      throw new Error(err.response?.data?.detail || "Failed to delete item");
    }
  };

  const renameItem = async (itemPath: string, newName: string) => {
    try {
      const parentPath = itemPath.substring(0, itemPath.lastIndexOf("/"));
      const newPath = `${parentPath}/${newName}`;

      await axios.post(`/api/projects/${projectId}/files/move`, {
        source_path: itemPath,
        target_path: newPath,
      });

      await fetchFiles();
    } catch (err: any) {
      console.error("Failed to rename item:", err);
      throw new Error(err.response?.data?.detail || "Failed to rename item");
    }
  };

  const moveItems = async (itemPaths: string[], targetPath: string) => {
    try {
      for (const sourcePath of itemPaths) {
        const itemName = sourcePath.substring(sourcePath.lastIndexOf("/") + 1);
        const newPath = `${targetPath}/${itemName}`;

        await axios.post(`/api/projects/${projectId}/files/move`, {
          source_path: sourcePath,
          target_path: newPath,
        });
      }

      await fetchFiles();
    } catch (err: any) {
      console.error("Failed to move items:", err);
      throw new Error(err.response?.data?.detail || "Failed to move items");
    }
  };

  const copyItems = (itemPaths: string[], cut: boolean = false) => {
    setClipboard({
      items: itemPaths,
      operation: cut ? "cut" : "copy",
    });
  };

  const pasteItems = async (targetPath: string) => {
    if (clipboard.items.length === 0) return;

    try {
      if (clipboard.operation === "cut") {
        await moveItems(clipboard.items, targetPath);
        setClipboard({ items: [], operation: null });
      } else {
        throw new Error("Copy operation not yet implemented");
      }
    } catch (err: any) {
      console.error("Failed to paste items:", err);
      throw err;
    }
  };

  const findNodeByPath = (nodes: FileNode[], path: string): FileNode | null => {
    for (const node of nodes) {
      if (node.path === path) return node;
      if (node.children) {
        const found = findNodeByPath(node.children, path);
        if (found) return found;
      }
    }
    return null;
  };

  const updateNodeChildrenRecursive = (
    nodes: FileNode[],
    targetPath: string,
    newChildren: FileNode[]
  ): FileNode[] => {
    return nodes.map((node) => {
      if (node.path === targetPath) {
        console.log("[FileExplorer] Found target node, updating children:", {
          path: targetPath,
          oldChildrenCount: node.children?.length || 0,
          newChildrenCount: newChildren.length,
        });
        return { ...node, children: newChildren };
      }
      if (node.children) {
        return {
          ...node,
          children: updateNodeChildrenRecursive(
            node.children,
            targetPath,
            newChildren
          ),
        };
      }
      return node;
    });
  };

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  return {
    data,
    loading,
    error,
    refreshFiles: fetchFiles,
    fetchDirectoryChildren,
    createFile,
    createFolder,
    deleteItem,
    renameItem,
    moveItems,
    copyItems,
    pasteItems,
    clipboard,
    updateNodeChildren: (targetPath: string, newChildren: FileNode[]) => {
      setData((prevData) =>
        updateNodeChildrenRecursive(prevData, targetPath, newChildren)
      );
    },
  };
};
