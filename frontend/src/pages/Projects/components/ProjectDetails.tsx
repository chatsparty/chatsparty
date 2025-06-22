import { File, Loader2, MessageSquare, X } from "lucide-react";
import React, { useRef, useState } from "react";
import type {
  Project,
  ProjectStatus,
  ProjectVMService,
} from "../../../types/project";
import { ChatPanel } from "./ChatPanel";
import { ConsolePanel } from "./ConsolePanel";
import { FileEditor } from "./FileEditor";
import { FileExplorer } from "./FileExplorer";
import { FilesPanel } from "./FilesPanel";
import { IconSidebar } from "./IconSidebar";
import { PreviewPanel } from "./PreviewPanel";
import { ProjectHeader } from "./ProjectHeader";
import { ResizeHandle } from "./ResizeHandle";
import { ServicesPanel } from "./ServicesPanel";
import { SettingsPanel } from "./SettingsPanel";

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

type LeftTab = "chat" | string;
type RightTab = "files" | "settings" | "services" | "console" | "preview";
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
  const [chatMessages, setChatMessages] = useState<
    { id: string; content: string; sender: "user" | "assistant" }[]
  >([]);
  const [dragOver, setDragOver] = useState(false);
  const [fileViewerOpen, setFileViewerOpen] = useState(false);
  const [leftTab, setLeftTab] = useState<LeftTab>("chat");
  const [rightTab, setRightTab] = useState<RightTab>("files");
  const [openLeftTabs, setOpenLeftTabs] = useState<LeftTab[]>(["chat"]);
  const [openRightTabs, setOpenRightTabs] = useState<RightTab[]>(["files"]);
  const [openFileTabs, setOpenFileTabs] = useState<FileTab[]>([]);
  const [splitPosition, setSplitPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );
  const containerRef = useRef<HTMLDivElement>(null);

  // Move useEffect before early returns to comply with Rules of Hooks
  React.useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      const newPosition =
        ((e.clientX - containerRect.left) / containerRect.width) * 100;

      // Constrain between 20% and 80%
      const clampedPosition = Math.max(20, Math.min(80, newPosition));
      setSplitPosition(clampedPosition);
    };

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleGlobalMouseMove);
      document.addEventListener("mouseup", handleGlobalMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleGlobalMouseMove);
        document.removeEventListener("mouseup", handleGlobalMouseUp);
      };
    }
  }, [isDragging]);

  if (!project) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-muted-foreground mx-auto mb-4" />
          <div className="text-lg text-muted-foreground">
            Loading project details...
          </div>
        </div>
      </div>
    );
  }


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
      sender: "user" as const,
    };

    setChatMessages((prev) => [...prev, newMessage]);
    setChatInput("");

    // Simulate AI response (replace with actual AI integration)
    setTimeout(() => {
      const aiResponse = {
        id: (Date.now() + 1).toString(),
        content:
          "I received your message about the project. How can I help you with this?",
        sender: "assistant" as const,
      };
      setChatMessages((prev) => [...prev, aiResponse]);
    }, 1000);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    console.log("Files dropped:", files);
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
      setOpenLeftTabs((prev) => [...prev, tab]);
    }
    setLeftTab(tab);
  };

  const handleOpenRightTab = (tab: RightTab) => {
    if (!openRightTabs.includes(tab)) {
      setOpenRightTabs((prev) => [...prev, tab]);
    }
    setRightTab(tab);
  };

  const handleCloseLeftTab = (tab: LeftTab, e: React.MouseEvent) => {
    e.stopPropagation();
    const newOpenTabs = openLeftTabs.filter((t) => t !== tab);
    setOpenLeftTabs(newOpenTabs);

    // If we're closing the active tab, switch to another open tab
    if (leftTab === tab && newOpenTabs.length > 0) {
      setLeftTab(newOpenTabs[newOpenTabs.length - 1]);
    }
  };

  const handleCloseRightTab = (tab: RightTab, e: React.MouseEvent) => {
    e.stopPropagation();
    const newOpenTabs = openRightTabs.filter((t) => t !== tab);
    setOpenRightTabs(newOpenTabs);

    // If we're closing the active tab, switch to another open tab
    if (rightTab === tab && newOpenTabs.length > 0) {
      setRightTab(newOpenTabs[newOpenTabs.length - 1]);
    }
  };

  const openFile = (filePath: string, fileName: string) => {
    // Check if file is already open in left tabs
    const existingTabIndex = openLeftTabs.findIndex(
      (tab) =>
        tab.startsWith("file-") &&
        openFileTabs.find((fileTab) => fileTab.id === tab)?.path === filePath
    );
    if (existingTabIndex !== -1) {
      setLeftTab(openLeftTabs[existingTabIndex]);
      return;
    }

    // Mock file content - in real app this would come from an API
    const getFileContent = (path: string) => {
      if (path.endsWith(".tsx") || path.endsWith(".ts")) {
        return `// ${fileName}\nimport React from 'react';\n\nconst ${fileName.replace(
          /\.[^/.]+$/,
          ""
        )} = () => {\n  return (\n    <div>\n      {/* Your component content here */}\n    </div>\n  );\n};\n\nexport default ${fileName.replace(
          /\.[^/.]+$/,
          ""
        )};`;
      } else if (path.endsWith(".json")) {
        return `{\n  "name": "${
          project?.name || "project"
        }",\n  "version": "1.0.0",\n  "description": "Project description"\n}`;
      } else if (path.endsWith(".md")) {
        return `# ${fileName.replace(
          /\.[^/.]+$/,
          ""
        )}\n\nThis is a markdown file.\n\n## Getting Started\n\nAdd your content here...`;
      } else {
        return `// ${fileName}\n// File content would be loaded here...`;
      }
    };

    const newTab: FileTab = {
      id: `file-${Date.now()}`,
      name: fileName,
      path: filePath,
      content: getFileContent(filePath),
      isDirty: false,
    };

    // Find if there's already an active file tab to replace
    const currentFileTabId = openLeftTabs.find((tab) =>
      tab.startsWith("file-")
    );

    if (currentFileTabId) {
      // Replace existing file tab
      setOpenFileTabs((prev) =>
        prev.map((tab) => (tab.id === currentFileTabId ? newTab : tab))
      );
      setOpenLeftTabs((prev) =>
        prev.map((tab) => (tab === currentFileTabId ? newTab.id : tab))
      );
      setLeftTab(newTab.id);
    } else {
      // Add first file tab
      setOpenFileTabs((prev) => [...prev, newTab]);
      setOpenLeftTabs((prev) => [...prev, newTab.id]);
      setLeftTab(newTab.id);
    }
  };

  const closeFileTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    // Remove from file tabs
    const newOpenFileTabs = openFileTabs.filter((tab) => tab.id !== tabId);
    setOpenFileTabs(newOpenFileTabs);

    // Remove from left tabs
    const newOpenLeftTabs = openLeftTabs.filter((tab) => tab !== tabId);
    setOpenLeftTabs(newOpenLeftTabs);

    // If we're closing the active tab, switch to another open tab
    if (leftTab === tabId && newOpenLeftTabs.length > 0) {
      setLeftTab(newOpenLeftTabs[newOpenLeftTabs.length - 1]);
    }
  };

  const updateFileContent = (tabId: string, content: string) => {
    setOpenFileTabs((prev) =>
      prev.map((tab) =>
        tab.id === tabId ? { ...tab, content, isDirty: true } : tab
      )
    );
  };

  const canExecuteCommands = project?.vm_status === "active";

  const toggleFolder = (folderPath: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath);
    } else {
      newExpanded.add(folderPath);
    }
    setExpandedFolders(newExpanded);
  };

  const renderLeftTabContent = () => {
    if (leftTab === "chat") {
      return (
        <ChatPanel
          chatMessages={chatMessages}
          chatInput={chatInput}
          onChatInputChange={setChatInput}
          onSendMessage={handleSendMessage}
        />
      );
    }

    // Handle file tabs
    const fileTab = openFileTabs.find((tab) => tab.id === leftTab);
    if (fileTab) {
      return (
        <FileEditor fileTab={fileTab} onUpdateContent={updateFileContent} />
      );
    }

    return null;
  };

  const renderRightTabContent = () => {
    switch (rightTab) {
      case "files":
        return (
          <FilesPanel
            dragOver={dragOver}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          />
        );

      case "settings":
        return (
          <SettingsPanel
            project={project}
            projectStatus={projectStatus}
            onRefreshStatus={onRefreshStatus}
            onSetupVM={onSetupVM}
          />
        );

      case "services":
        return (
          <ServicesPanel
            vmServices={vmServices}
            onRefreshServices={onRefreshServices}
            onStopService={onStopService}
          />
        );

      case "console":
        return (
          <ConsolePanel
            canExecuteCommands={canExecuteCommands}
            commandInput={commandInput}
            commandOutput={commandOutput}
            commandLoading={commandLoading}
            onCommandInputChange={setCommandInput}
            onExecuteCommand={handleExecuteCommand}
          />
        );

      case "preview":
        return <PreviewPanel />;

      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">
      <ProjectHeader
        project={project}
        onNavigateBack={onNavigateBack}
        onEditProject={onEditProject}
      />

      <div className="flex flex-1 min-h-0">
        <IconSidebar
          fileViewerOpen={fileViewerOpen}
          leftTab={leftTab}
          rightTab={rightTab}
          onToggleFileViewer={() => setFileViewerOpen(!fileViewerOpen)}
          onOpenLeftTab={handleOpenLeftTab}
          onOpenRightTab={handleOpenRightTab}
        />

        {fileViewerOpen && (
          <FileExplorer
            project={project}
            expandedFolders={expandedFolders}
            onToggleFolder={toggleFolder}
            onOpenFile={openFile}
            onClose={() => setFileViewerOpen(false)}
          />
        )}

        <div ref={containerRef} className="flex-1 flex">
          <div
            style={{ width: `${splitPosition}%` }}
            className="border-r border-border flex flex-col"
          >
            <div className="h-full m-1 flex flex-col border border-border rounded-sm bg-card">
              <div className="border-b border-border">
                <div className="flex overflow-x-auto">
                  {openLeftTabs.map((tab) => {
                    const isFileTab = tab.startsWith("file-");
                    const fileTab = isFileTab
                      ? openFileTabs.find((f) => f.id === tab)
                      : null;

                    return (
                      <button
                        key={tab}
                        onClick={() => setLeftTab(tab)}
                        className={`px-4 py-1.5 text-xs font-medium flex items-center gap-1 border-r border-border whitespace-nowrap ${
                          leftTab === tab
                            ? "bg-background text-foreground"
                            : "bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {isFileTab ? (
                          <>
                            <File className="w-3 h-3" />
                            {fileTab?.name || "File"}
                            {fileTab?.isDirty && (
                              <span className="w-1 h-1 bg-primary rounded-full" />
                            )}
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

              <div className="flex-1 overflow-hidden">
                {openLeftTabs.length > 0 ? (
                  renderLeftTabContent()
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <p className="text-sm">No tabs open</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <ResizeHandle onMouseDown={handleMouseDown} />

          <div
            style={{ width: `${100 - splitPosition}%` }}
            className="flex flex-col"
          >
            <div className="h-full m-1 flex flex-col border border-border rounded-sm bg-card">
              <div className="border-b border-border">
                <div className="flex">
                  {openRightTabs.map((tab, index) => {
                    const getTabInfo = (tabName: RightTab) => {
                      switch (tabName) {
                        case "files":
                          return { icon: File, label: "Files" };
                        case "settings":
                          return { icon: MessageSquare, label: "Settings" };
                        case "services":
                          return { icon: MessageSquare, label: "Services" };
                        case "console":
                          return { icon: MessageSquare, label: "Console" };
                        case "preview":
                          return { icon: MessageSquare, label: "Preview" };
                        default:
                          return { icon: File, label: "Unknown" };
                      }
                    };

                    const { icon: Icon, label } = getTabInfo(tab);

                    return (
                      <button
                        key={tab}
                        onClick={() => setRightTab(tab)}
                        className={`px-6 py-1.5 text-xs font-medium flex items-center gap-1 ${
                          index < openRightTabs.length - 1
                            ? "border-r border-border"
                            : ""
                        } ${
                          rightTab === tab
                            ? "bg-background text-foreground"
                            : "bg-muted text-muted-foreground hover:text-foreground"
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

              <div className="flex-1 overflow-hidden">
                {openRightTabs.length > 0 ? (
                  renderRightTabContent()
                ) : (
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
