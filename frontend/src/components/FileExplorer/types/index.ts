export interface FileTreeItem {
  name: string;
  type: "file" | "folder";
  path?: string;
  children?: FileTreeItem[];
}

export interface FileSystemEvent {
  event_type: string;
  file_path: string;
  timestamp: string;
}

export interface FileExplorerState {
  fileStructure: FileTreeItem | null;
  loading: boolean;
  error: string | null;
  expandedFolders: Set<string>;
  selectedFiles: Set<string>;
  draggedItem: string | null;
  dragOverItem: string | null;
  currentPath: string;
}

export interface InlineEditingState {
  parentPath: string;
  type: "file" | "folder";
  name: string;
}

export interface CreateDialogState {
  show: boolean;
  type: "file" | "folder";
  name: string;
  creating: boolean;
}

export interface DeleteDialogState {
  show: boolean;
  item: {
    name: string;
    path: string;
    isFolder: boolean;
  } | null;
  deleting: boolean;
}

export interface FileExplorerCallbacks {
  onToggleFolder: (folderPath: string) => void;
  onOpenFile: (filePath: string, fileName: string) => void;
  onClose: () => void;
}

export interface FileOperationsService {
  fetchFileStructure: (projectId: string) => Promise<FileTreeItem>;
  createFile: (projectId: string, path: string, content?: string) => Promise<void>;
  createFolder: (projectId: string, path: string) => Promise<void>;
  deleteFile: (projectId: string, path: string, isFolder: boolean, force?: boolean) => Promise<void>;
  moveFile: (projectId: string, sourcePath: string, targetPath: string) => Promise<void>;
  startFileWatcher: (projectId: string) => Promise<void>;
  stopFileWatcher: (projectId: string) => Promise<void>;
}