import { useState, useCallback } from "react";
import { projectApi } from "../../../services/projectApi";
import type { Project } from "../../../types/project";

export interface FileTab {
  id: string;
  name: string;
  path: string;
  content: string;
  isDirty: boolean;
}

interface UseFileManagerProps {
  project: Project | null;
}

export const useFileManager = ({ project }: UseFileManagerProps) => {
  const [openFileTabs, setOpenFileTabs] = useState<FileTab[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const saveFile = useCallback(async (tabId: string): Promise<boolean> => {
    if (project?.vm_status !== "active") {
      console.error("VM not active - cannot save file");
      return false;
    }

    const fileTab = openFileTabs.find((tab) => tab.id === tabId);
    if (!fileTab) {
      console.error("File tab not found");
      return false;
    }

    try {
      await projectApi.writeFile(project.id, fileTab.path, fileTab.content);
      setOpenFileTabs((prev) =>
        prev.map((tab) =>
          tab.id === tabId ? { ...tab, isDirty: false } : tab
        )
      );
      return true;
    } catch (error) {
      console.error("Failed to save file:", error);
      return false;
    }
  }, [project, openFileTabs]);

  const openFile = useCallback(async (filePath: string, fileName: string): Promise<string> => {
    // Check if file is already open
    const existingTab = openFileTabs.find((tab) => tab.path === filePath);
    if (existingTab) {
      return existingTab.id;
    }

    // Load file content from VM
    let fileContent = "";
    if (project?.vm_status === "active") {
      try {
        const response = await projectApi.readFile(project.id, filePath);
        if (response.success) {
          fileContent = response.content;
        } else {
          fileContent = `// Error: Could not load file content\n// File: ${fileName}`;
        }
      } catch (error) {
        console.error("Failed to read file:", error);
        fileContent = `// Error loading file: ${fileName}\n// ${error}\n// Please make sure the VM is running and the file exists.`;
      }
    } else {
      fileContent = `// VM not active\n// Please start the VM to load file content for: ${fileName}`;
    }

    const newTab: FileTab = {
      id: `file-${Date.now()}`,
      name: fileName,
      path: filePath,
      content: fileContent,
      isDirty: false,
    };

    setOpenFileTabs((prev) => [...prev, newTab]);
    return newTab.id;
  }, [project, openFileTabs]);

  const closeFileTab = useCallback(async (tabId: string): Promise<boolean> => {
    const fileTab = openFileTabs.find((tab) => tab.id === tabId);
    
    // Check if file has unsaved changes
    if (fileTab?.isDirty) {
      const shouldSave = window.confirm(
        `Do you want to save the changes to ${fileTab.name}?\n\nYour changes will be lost if you don't save them.`
      );
      
      if (shouldSave) {
        const saveSuccess = await saveFile(tabId);
        if (!saveSuccess) {
          return false;
        }
      }
    }

    setOpenFileTabs((prev) => prev.filter((tab) => tab.id !== tabId));
    return true;
  }, [openFileTabs, saveFile]);

  const updateFileContent = useCallback((tabId: string, content: string) => {
    setOpenFileTabs((prev) =>
      prev.map((tab) =>
        tab.id === tabId ? { ...tab, content, isDirty: true } : tab
      )
    );
  }, []);

  const toggleFolder = useCallback((folderPath: string) => {
    setExpandedFolders((prev) => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(folderPath)) {
        newExpanded.delete(folderPath);
      } else {
        newExpanded.add(folderPath);
      }
      return newExpanded;
    });
  }, []);

  const getFileTab = useCallback((tabId: string) => {
    return openFileTabs.find((tab) => tab.id === tabId);
  }, [openFileTabs]);

  return {
    openFileTabs,
    expandedFolders,
    saveFile,
    openFile,
    closeFileTab,
    updateFileContent,
    toggleFolder,
    getFileTab,
  };
};