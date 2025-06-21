import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  ChevronsRight,
  Edit,
  ExternalLink,
  File,
  FileUp,
  Folder,
  FolderOpen,
  Home,
  Loader2,
  MessageSquare,
  Play,
  RefreshCw,
  Send,
  Settings,
  Square,
  Terminal,
  X,
} from "lucide-react";
import React, { useState, useRef } from "react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import type {
  Project,
  ProjectStatus,
  ProjectVMService,
} from "../../../types/project";

interface ProjectDetailsProps {
  project: Project;
  projectStatus: ProjectStatus | null;
  vmServices: ProjectVMService[];
  onSetupVM: () => void;
  onExecuteCommand: (command: string, workingDir?: string) => Promise<string>;
  onRefreshStatus: () => void;
  onStopService: (serviceId: string) => void;
  onRefreshServices: () => void;
  onNavigateBack?: () => void;
  onEditProject?: () => void;
}

type LeftTab = 'chat' | string; // Allow dynamic file tab IDs
type RightTab = 'files' | 'settings' | 'services' | 'console' | 'preview';
type FileTab = {
  id: string;
  name: string;
  path: string;
  content: string;
  isDirty: boolean;
};

export const ProjectDetails: React.FC<ProjectDetailsProps> = ({
  project,
  projectStatus,
  vmServices,
  onSetupVM,
  onExecuteCommand,
  onRefreshStatus,
  onStopService,
  onRefreshServices,
  onNavigateBack,
  onEditProject,
}) => {
  const [commandInput, setCommandInput] = useState("");
  const [commandOutput, setCommandOutput] = useState("");
  const [commandLoading, setCommandLoading] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<{id: string, content: string, sender: 'user' | 'assistant'}[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [fileViewerOpen, setFileViewerOpen] = useState(false);
  const [leftTab, setLeftTab] = useState<LeftTab>('chat');
  const [rightTab, setRightTab] = useState<RightTab>('files');
  const [openLeftTabs, setOpenLeftTabs] = useState<LeftTab[]>(['chat']);
  const [openRightTabs, setOpenRightTabs] = useState<RightTab[]>(['files']);
  const [openFileTabs, setOpenFileTabs] = useState<FileTab[]>([]);
  const [splitPosition, setSplitPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  // Move useEffect before early returns to comply with Rules of Hooks
  React.useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      const newPosition = ((e.clientX - containerRect.left) / containerRect.width) * 100;
      
      // Constrain between 20% and 80%
      const clampedPosition = Math.max(20, Math.min(80, newPosition));
      setSplitPosition(clampedPosition);
    };

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDragging]);

  if (!project) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-muted-foreground mx-auto mb-4" />
          <div className="text-lg text-muted-foreground">Loading project details...</div>
        </div>
      </div>
    );
  }

  const getStatusIcon = () => {
    switch (project?.vm_status) {
      case "active":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "starting":
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Square className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (project?.vm_status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "starting":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "error":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const handleExecuteCommand = async () => {
    if (!commandInput.trim()) return;

    setCommandLoading(true);
    try {
      const output = await onExecuteCommand(commandInput);
      setCommandOutput((prev) => `$ ${commandInput}\n${output}\n\n${prev}`);
      setCommandInput("");
    } catch (error) {
      setCommandOutput(
        (prev) => `$ ${commandInput}\n❌ Error: ${error}\n\n${prev}`
      );
    } finally {
      setCommandLoading(false);
    }
  };

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    
    const newMessage = {
      id: Date.now().toString(),
      content: chatInput,
      sender: 'user' as const
    };
    
    setChatMessages(prev => [...prev, newMessage]);
    setChatInput('');
    
    // Simulate AI response (replace with actual AI integration)
    setTimeout(() => {
      const aiResponse = {
        id: (Date.now() + 1).toString(),
        content: 'I received your message about the project. How can I help you with this?',
        sender: 'assistant' as const
      };
      setChatMessages(prev => [...prev, aiResponse]);
    }, 1000);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    console.log('Files dropped:', files);
    // Handle file upload logic here
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleOpenLeftTab = (tab: LeftTab) => {
    if (!openLeftTabs.includes(tab)) {
      setOpenLeftTabs(prev => [...prev, tab]);
    }
    setLeftTab(tab);
  };

  const handleOpenRightTab = (tab: RightTab) => {
    if (!openRightTabs.includes(tab)) {
      setOpenRightTabs(prev => [...prev, tab]);
    }
    setRightTab(tab);
  };

  const handleCloseLeftTab = (tab: LeftTab, e: React.MouseEvent) => {
    e.stopPropagation();
    const newOpenTabs = openLeftTabs.filter(t => t !== tab);
    setOpenLeftTabs(newOpenTabs);
    
    // If we're closing the active tab, switch to another open tab
    if (leftTab === tab && newOpenTabs.length > 0) {
      setLeftTab(newOpenTabs[newOpenTabs.length - 1]);
    }
  };

  const handleCloseRightTab = (tab: RightTab, e: React.MouseEvent) => {
    e.stopPropagation();
    const newOpenTabs = openRightTabs.filter(t => t !== tab);
    setOpenRightTabs(newOpenTabs);
    
    // If we're closing the active tab, switch to another open tab
    if (rightTab === tab && newOpenTabs.length > 0) {
      setRightTab(newOpenTabs[newOpenTabs.length - 1]);
    }
  };

  const openFile = (filePath: string, fileName: string) => {
    // Check if file is already open in left tabs
    const existingTabIndex = openLeftTabs.findIndex(tab => tab.startsWith('file-') && openFileTabs.find(fileTab => fileTab.id === tab)?.path === filePath);
    if (existingTabIndex !== -1) {
      setLeftTab(openLeftTabs[existingTabIndex]);
      return;
    }

    // Mock file content - in real app this would come from an API
    const getFileContent = (path: string) => {
      if (path.endsWith('.tsx') || path.endsWith('.ts')) {
        return `// ${fileName}\nimport React from 'react';\n\nconst ${fileName.replace(/\.[^/.]+$/, "")} = () => {\n  return (\n    <div>\n      {/* Your component content here */}\n    </div>\n  );\n};\n\nexport default ${fileName.replace(/\.[^/.]+$/, "")};`;
      } else if (path.endsWith('.json')) {
        return `{\n  "name": "${project?.name || 'project'}",\n  "version": "1.0.0",\n  "description": "Project description"\n}`;
      } else if (path.endsWith('.md')) {
        return `# ${fileName.replace(/\.[^/.]+$/, "")}\n\nThis is a markdown file.\n\n## Getting Started\n\nAdd your content here...`;
      } else {
        return `// ${fileName}\n// File content would be loaded here...`;
      }
    };

    const newTab: FileTab = {
      id: `file-${Date.now()}`,
      name: fileName,
      path: filePath,
      content: getFileContent(filePath),
      isDirty: false
    };

    // Find if there's already an active file tab to replace
    const currentFileTabId = openLeftTabs.find(tab => tab.startsWith('file-'));
    
    if (currentFileTabId) {
      // Replace existing file tab
      setOpenFileTabs(prev => prev.map(tab => 
        tab.id === currentFileTabId ? newTab : tab
      ));
      setOpenLeftTabs(prev => prev.map(tab => 
        tab === currentFileTabId ? newTab.id : tab
      ));
      setLeftTab(newTab.id);
    } else {
      // Add first file tab
      setOpenFileTabs(prev => [...prev, newTab]);
      setOpenLeftTabs(prev => [...prev, newTab.id]);
      setLeftTab(newTab.id);
    }
  };

  const closeFileTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Remove from file tabs
    const newOpenFileTabs = openFileTabs.filter(tab => tab.id !== tabId);
    setOpenFileTabs(newOpenFileTabs);
    
    // Remove from left tabs
    const newOpenLeftTabs = openLeftTabs.filter(tab => tab !== tabId);
    setOpenLeftTabs(newOpenLeftTabs);
    
    // If we're closing the active tab, switch to another open tab
    if (leftTab === tabId && newOpenLeftTabs.length > 0) {
      setLeftTab(newOpenLeftTabs[newOpenLeftTabs.length - 1]);
    }
  };

  const updateFileContent = (tabId: string, content: string) => {
    setOpenFileTabs(prev => prev.map(tab => 
      tab.id === tabId 
        ? { ...tab, content, isDirty: true }
        : tab
    ));
  };

  const canExecuteCommands = project?.vm_status === "active";

  // Mock file structure - in real app this would come from an API
  const mockFileStructure: FileTreeItem = {
    name: project?.name || "Project",
    type: "folder" as const,
    children: [
      {
        name: "src",
        type: "folder" as const,
        children: [
          { name: "components", type: "folder" as const, children: [
            { name: "Header.tsx", type: "file" as const },
            { name: "Sidebar.tsx", type: "file" as const }
          ]},
          { name: "utils", type: "folder" as const, children: [
            { name: "helpers.ts", type: "file" as const }
          ]},
          { name: "App.tsx", type: "file" as const },
          { name: "index.tsx", type: "file" as const }
        ]
      },
      {
        name: "public",
        type: "folder" as const,
        children: [
          { name: "index.html", type: "file" as const },
          { name: "favicon.ico", type: "file" as const }
        ]
      },
      { name: "package.json", type: "file" as const },
      { name: "README.md", type: "file" as const },
      { name: ".gitignore", type: "file" as const }
    ]
  };

  const toggleFolder = (folderPath: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath);
    } else {
      newExpanded.add(folderPath);
    }
    setExpandedFolders(newExpanded);
  };

  interface FileTreeItem {
    name: string;
    type: 'file' | 'folder';
    children?: FileTreeItem[];
  }

  const renderFileTree = (item: FileTreeItem, path: string = "", depth: number = 0) => {
    const fullPath = path ? `${path}/${item.name}` : item.name;
    const isExpanded = expandedFolders.has(fullPath);
    
    if (item.type === "folder") {
      return (
        <div key={fullPath}>
          <div
            className="flex items-center gap-1 px-2 py-1 hover:bg-muted cursor-pointer text-sm"
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            onClick={() => toggleFolder(fullPath)}
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
          onClick={() => openFile(fullPath, item.name)}
        >
          <File className="w-4 h-4 text-muted-foreground" />
          <span className="text-foreground">{item.name}</span>
        </div>
      );
    }
  };

  const sidebarItems = [
    { id: 'chat', icon: MessageSquare, label: 'Chat', type: 'left' as const },
    { id: 'files', icon: FileUp, label: 'Files', type: 'right' as const },
    { id: 'settings', icon: Settings, label: 'Settings', type: 'right' as const },
    { id: 'services', icon: Play, label: 'Services', type: 'right' as const },
    { id: 'console', icon: Terminal, label: 'Console', type: 'right' as const },
  ];

  const renderLeftTabContent = () => {
    if (leftTab === 'chat') {
      return (
        <div className="flex flex-col h-full">
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
            {chatMessages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p>Start a conversation about your project</p>
              </div>
            ) : (
              chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      message.sender === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Chat Input */}
          <div className="p-3 border-t border-border flex-shrink-0">
            <div className="flex gap-2 items-stretch">
              <Textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about your project, request help, or discuss implementation..."
                className="flex-1 min-h-[60px] max-h-[120px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <Button 
                onClick={handleSendMessage}
                disabled={!chatInput.trim()}
                size="sm"
                className="px-3 self-stretch"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      );
    }

    // Handle file tabs
    const fileTab = openFileTabs.find(tab => tab.id === leftTab);
    if (fileTab) {
      return (
        <div className="h-full flex flex-col">
          <div className="p-2 border-b border-border bg-muted">
            <span className="text-xs text-muted-foreground">{fileTab.path}</span>
          </div>
          <div className="flex-1 p-3">
            <Textarea
              value={fileTab.content}
              onChange={(e) => updateFileContent(fileTab.id, e.target.value)}
              className="w-full h-full resize-none font-mono text-sm"
              placeholder="File content..."
            />
          </div>
        </div>
      );
    }

    return null;
  };

  const renderRightTabContent = () => {
    switch (rightTab) {
      case 'files':
        return (
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <FileUp className="w-5 h-5" />
              <h2 className="text-lg font-semibold">Project Files</h2>
            </div>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragOver
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <FileUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">
                Drag & drop files here or click to browse
              </p>
              <Button variant="outline" size="sm">
                Browse Files
              </Button>
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-5 h-5" />
              <h2 className="text-lg font-semibold">Project Settings</h2>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <Button
                onClick={onRefreshStatus}
                variant="ghost"
                size="sm"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
              {project?.vm_status === "inactive" && (
                <Button
                  onClick={onSetupVM}
                  variant="outline"
                  size="sm"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Setup VM
                </Button>
              )}
              {projectStatus?.vm_url && (
                <Button
                  onClick={() => window.open(projectStatus.vm_url, "_blank")}
                  variant="outline"
                  size="sm"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              )}
            </div>

            {projectStatus && (
              <Card className="p-4">
                <h3 className="text-sm font-medium mb-3">VM Status</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Services:</span>
                    <span className="font-medium">{projectStatus?.services?.length || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Files Synced:</span>
                    <span className="font-medium">
                      {projectStatus?.files?.synced || 0}/{projectStatus?.files?.total || 0}
                    </span>
                  </div>
                  {project?.e2b_sandbox_id && (
                    <div className="text-xs text-muted-foreground">
                      Sandbox: <code className="bg-muted px-1 py-0.5 rounded">
                        {project.e2b_sandbox_id.slice(0, 8)}...
                      </code>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        );

      case 'services':
        return (
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Play className="w-5 h-5" />
                <h2 className="text-lg font-semibold">Services</h2>
              </div>
              <Button onClick={onRefreshServices} variant="ghost" size="sm">
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-3">
              {vmServices.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No services running
                </p>
              ) : (
                vmServices.map((service) => (
                  <Card key={service.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium truncate">{service.service_name}</span>
                          <Badge variant={service.status === "running" ? "default" : "secondary"}>
                            {service.status}
                          </Badge>
                        </div>
                        {service.service_url && (
                          <a
                            href={service.service_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline truncate block"
                          >
                            {service.service_url}
                          </a>
                        )}
                      </div>
                      <Button
                        onClick={() => onStopService(service.id)}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 ml-2"
                      >
                        <Square className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        );

      case 'console':
        return (
          <div className="flex flex-col h-full p-4">
            {!canExecuteCommands && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-600" />
                  <p className="text-sm text-yellow-800">
                    VM must be active to execute commands
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={commandInput}
                  onChange={(e) => setCommandInput(e.target.value)}
                  placeholder="Enter command..."
                  disabled={!canExecuteCommands || commandLoading}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleExecuteCommand();
                    }
                  }}
                  className="font-mono text-sm"
                />
                <Button
                  onClick={handleExecuteCommand}
                  disabled={!canExecuteCommands || commandLoading || !commandInput.trim()}
                  size="sm"
                >
                  {commandLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Run"
                  )}
                </Button>
              </div>

              {commandOutput && (
                <div className="bg-slate-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
                  <pre className="whitespace-pre-wrap">{commandOutput}</pre>
                </div>
              )}
            </div>
          </div>
        );

      case 'preview':
        return (
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <ExternalLink className="w-5 h-5" />
              <h2 className="text-lg font-semibold">Preview</h2>
            </div>
            <div className="text-center text-muted-foreground py-8">
              <ExternalLink className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>Preview will show your running applications</p>
              <p className="text-sm mt-2">Start a service to see it here</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="px-4 py-2 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onNavigateBack && (
              <Button
                onClick={onNavigateBack}
                variant="ghost"
                size="sm"
              >
                <Home className="w-4 h-4 mr-1" />
                Home
              </Button>
            )}
            <div>
              <h1 className="text-lg font-semibold text-foreground">
                {project?.name || "Unnamed Project"}
              </h1>
              {project?.description && (
                <p className="text-sm text-muted-foreground">
                  {project?.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <Badge className={getStatusColor()}>
              {(project?.vm_status || "inactive").toUpperCase()}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {onEditProject && (
              <Button
                onClick={onEditProject}
                variant="outline"
                size="sm"
              >
                <Edit className="w-4 h-4 mr-1" />
                Edit
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Icon Sidebar */}
        <div className="w-16 bg-muted border-r border-border flex flex-col items-center py-4 transition-all duration-200">
          <Button
            onClick={() => setFileViewerOpen(!fileViewerOpen)}
            variant={fileViewerOpen ? "default" : "ghost"}
            size="sm"
            className="mb-4 w-10 h-10 p-0"
            title="Toggle File Explorer"
          >
            <ChevronsRight className="w-4 h-4" />
          </Button>
          
          <div className="flex flex-col gap-2">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = (item.type === 'left' && leftTab === item.id) || (item.type === 'right' && rightTab === item.id);
              
              return (
                <Button
                  key={item.id}
                  onClick={() => {
                    if (item.type === 'left') {
                      handleOpenLeftTab(item.id as LeftTab);
                    } else {
                      handleOpenRightTab(item.id as RightTab);
                    }
                  }}
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  className="w-10 h-10 p-0"
                  title={item.label}
                >
                  <Icon className="w-4 h-4" />
                </Button>
              );
            })}
          </div>
        </div>

        {/* File Viewer Sidebar */}
        {fileViewerOpen && (
          <div className="w-64 bg-muted border-r border-border flex flex-col">
            <div className="p-2 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Explorer</h3>
                <Button
                  onClick={() => setFileViewerOpen(false)}
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {renderFileTree(mockFileStructure)}
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div 
          ref={containerRef}
          className="flex-1 flex"
        >
          {/* Left Panel Window */}
          <div style={{ width: `${splitPosition}%` }} className="border-r border-border flex flex-col">
            <div className="h-full m-1 flex flex-col border border-border rounded-sm bg-card">
              {/* Left Window Tabs */}
              <div className="border-b border-border">
                <div className="flex overflow-x-auto">
                  {openLeftTabs.map((tab) => {
                    const isFileTab = tab.startsWith('file-');
                    const fileTab = isFileTab ? openFileTabs.find(f => f.id === tab) : null;
                    
                    return (
                      <button
                        key={tab}
                        onClick={() => setLeftTab(tab)}
                        className={`px-4 py-1.5 text-xs font-medium flex items-center gap-1 border-r border-border whitespace-nowrap ${
                          leftTab === tab
                            ? 'bg-background text-foreground'
                            : 'bg-muted text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {isFileTab ? (
                          <>
                            <File className="w-3 h-3" />
                            {fileTab?.name || 'File'}
                            {fileTab?.isDirty && <span className="w-1 h-1 bg-primary rounded-full" />}
                          </>
                        ) : (
                          <>
                            <MessageSquare className="w-3 h-3" />
                            Chat
                          </>
                        )}
                        {openLeftTabs.length > 1 && (
                          <X 
                            className="w-3 h-3 hover:text-red-500 ml-1" 
                            onClick={(e) => {
                              if (isFileTab && fileTab) {
                                closeFileTab(fileTab.id, e);
                              } else {
                                handleCloseLeftTab(tab as LeftTab, e);
                              }
                            }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              
              {/* Left Window Content */}
              <div className="flex-1 overflow-hidden">
                {openLeftTabs.length > 0 ? renderLeftTabContent() : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <p className="text-sm">No tabs open</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Resize Handle */}
          <div
            className="w-1 bg-border hover:bg-primary cursor-col-resize flex-shrink-0"
            onMouseDown={handleMouseDown}
          />

          {/* Right Panel Window */}
          <div style={{ width: `${100 - splitPosition}%` }} className="flex flex-col">
            <div className="h-full m-1 flex flex-col border border-border rounded-sm bg-card">
              {/* Right Window Tabs */}
              <div className="border-b border-border">
                <div className="flex">
                  {openRightTabs.map((tab, index) => {
                    const getTabInfo = (tabName: RightTab) => {
                      switch (tabName) {
                        case 'files': return { icon: FileUp, label: 'Files' };
                        case 'settings': return { icon: Settings, label: 'Settings' };
                        case 'services': return { icon: Play, label: 'Services' };
                        case 'console': return { icon: Terminal, label: 'Console' };
                        case 'preview': return { icon: ExternalLink, label: 'Preview' };
                        default: return { icon: FileUp, label: 'Unknown' };
                      }
                    };
                    
                    const { icon: Icon, label } = getTabInfo(tab);
                    
                    return (
                      <button
                        key={tab}
                        onClick={() => setRightTab(tab)}
                        className={`px-6 py-1.5 text-xs font-medium flex items-center gap-1 ${
                          index < openRightTabs.length - 1 ? 'border-r border-border' : ''
                        } ${
                          rightTab === tab
                            ? 'bg-background text-foreground'
                            : 'bg-muted text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <Icon className="w-3 h-3" />
                        {label}
                        {openRightTabs.length > 1 && (
                          <X 
                            className="w-3 h-3 hover:text-red-500 ml-1" 
                            onClick={(e) => handleCloseRightTab(tab, e)}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              
              {/* Right Window Content */}
              <div className="flex-1 overflow-hidden">
                {openRightTabs.length > 0 ? renderRightTabContent() : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <p className="text-sm">No tabs open</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};