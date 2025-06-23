import { File, Loader2, MessageSquare, X } from "lucide-react";
import React, { useState } from "react";
import type {
  Project,
  ProjectStatus,
  ProjectVMService,
} from "../../../types/project";
import { ChatPanel } from "./ChatPanel";
import { ConsolePanel } from "./ConsolePanel";
import { TerminalPanel } from "./TerminalPanel";
import { FileEditor } from "./FileEditor";
import { FileExplorer } from "./FileExplorer";
import { FilesPanel } from "./FilesPanel";
import { IconSidebar } from "./IconSidebar";
import { PreviewPanel } from "./PreviewPanel";
import { ProjectHeader } from "./ProjectHeader";
import { ResizeHandle } from "./ResizeHandle";
import { ServicesPanel } from "./ServicesPanel";
import { SettingsPanel } from "./SettingsPanel";
import { useFileManager } from "../hooks/useFileManager";
import { useTabManager, type LeftTab, type RightTab } from "../hooks/useTabManager";
import { useCommandExecution } from "../hooks/useCommandExecution";
import { useChatMessages } from "../hooks/useChatMessages";
import { useResizeablePanes } from "../hooks/useResizeablePanes";
import { useDragAndDrop } from "../hooks/useDragAndDrop";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";

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
  const [fileViewerOpen, setFileViewerOpen] = useState(false);

  // Custom hooks
  const fileManager = useFileManager({ project });
  const tabManager = useTabManager();
  const commandExecution = useCommandExecution({ onExecuteCommand });
  const chatMessages = useChatMessages();
  const resizeablePanes = useResizeablePanes(50);
  const dragAndDrop = useDragAndDrop();

  // Keyboard shortcuts
  useKeyboardShortcuts({
    openFileTabs: fileManager.openFileTabs,
    activeTabId: tabManager.leftTab,
    onSaveFile: fileManager.saveFile,
  });



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



  const handleCloseLeftTab = (tab: LeftTab, e: React.MouseEvent) => {
    e.stopPropagation();
    tabManager.handleCloseLeftTab(tab);
  };

  const handleCloseRightTab = (tab: RightTab, e: React.MouseEvent) => {
    e.stopPropagation();
    tabManager.handleCloseRightTab(tab);
  };

  const openFile = async (filePath: string, fileName: string) => {
    // Check if file is already open
    const existingTab = fileManager.openFileTabs.find((tab) => tab.path === filePath);
    if (existingTab) {
      tabManager.switchToExistingFileTab(existingTab.id);
      return;
    }

    // Open new file
    const fileTabId = await fileManager.openFile(filePath, fileName);
    tabManager.addFileTabToLeft(fileTabId);
  };

  const closeFileTab = async (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const success = await fileManager.closeFileTab(tabId);
    if (success) {
      tabManager.removeFileTabFromLeft(tabId);
    }
  };

  const canExecuteCommands = project?.vm_status === "active";

  const renderLeftTabContent = () => {
    if (tabManager.leftTab === "chat") {
      return (
        <ChatPanel
          chatMessages={chatMessages.chatMessages}
          chatInput={chatMessages.chatInput}
          onChatInputChange={chatMessages.setChatInput}
          onSendMessage={chatMessages.handleSendMessage}
        />
      );
    }

    // Handle file tabs
    const fileTab = fileManager.getFileTab(tabManager.leftTab);
    if (fileTab) {
      return (
        <FileEditor 
          fileTab={fileTab} 
          onUpdateContent={fileManager.updateFileContent} 
          onSave={fileManager.saveFile}
        />
      );
    }

    return null;
  };

  const renderRightTabContent = () => {
    switch (tabManager.rightTab) {
      case "files":
        return (
          <FilesPanel
            dragOver={dragAndDrop.dragOver}
            onDrop={dragAndDrop.handleDrop}
            onDragOver={dragAndDrop.handleDragOver}
            onDragLeave={dragAndDrop.handleDragLeave}
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
            commandInput={commandExecution.commandInput}
            commandOutput={commandExecution.commandOutput}
            commandLoading={commandExecution.commandLoading}
            onCommandInputChange={commandExecution.setCommandInput}
            onExecuteCommand={commandExecution.handleExecuteCommand}
          />
        );

      case "terminal":
        return <TerminalPanel projectId={project.id} />;

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
          leftTab={tabManager.leftTab}
          rightTab={tabManager.rightTab}
          onToggleFileViewer={() => setFileViewerOpen(!fileViewerOpen)}
          onOpenLeftTab={tabManager.handleOpenLeftTab}
          onOpenRightTab={tabManager.handleOpenRightTab}
        />

        {fileViewerOpen && (
          <FileExplorer
            project={project}
            expandedFolders={fileManager.expandedFolders}
            onToggleFolder={fileManager.toggleFolder}
            onOpenFile={openFile}
            onClose={() => setFileViewerOpen(false)}
          />
        )}

        <div ref={resizeablePanes.containerRef} className="flex-1 flex">
          <div
            style={{ width: `${resizeablePanes.splitPosition}%` }}
            className="border-r border-border flex flex-col"
          >
            <div className="h-full m-1 flex flex-col border border-border rounded-sm bg-card">
              <div className="border-b border-border">
                <div className="flex overflow-x-auto">
                  {tabManager.openLeftTabs.map((tab) => {
                    const isFileTab = tab.startsWith("file-");
                    const fileTab = isFileTab
                      ? fileManager.openFileTabs.find((f) => f.id === tab)
                      : null;

                    return (
                      <button
                        key={tab}
                        onClick={() => tabManager.setLeftTab(tab)}
                        className={`px-4 py-1.5 text-xs font-medium flex items-center gap-1 border-r border-border whitespace-nowrap ${
                          tabManager.leftTab === tab
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
                        {tabManager.openLeftTabs.length > 1 && (
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
                {tabManager.openLeftTabs.length > 0 ? (
                  renderLeftTabContent()
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <p className="text-sm">No tabs open</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <ResizeHandle onMouseDown={resizeablePanes.handleMouseDown} />

          <div
            style={{ width: `${100 - resizeablePanes.splitPosition}%` }}
            className="flex flex-col"
          >
            <div className="h-full m-1 flex flex-col border border-border rounded-sm bg-card">
              <div className="border-b border-border">
                <div className="flex">
                  {tabManager.openRightTabs.map((tab, index) => {
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
                        case "terminal":
                          return { icon: MessageSquare, label: "Terminal" };
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
                        onClick={() => tabManager.setRightTab(tab)}
                        className={`px-6 py-1.5 text-xs font-medium flex items-center gap-1 ${
                          index < tabManager.openRightTabs.length - 1
                            ? "border-r border-border"
                            : ""
                        } ${
                          tabManager.rightTab === tab
                            ? "bg-background text-foreground"
                            : "bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Icon className="w-3 h-3" />
                        {label}
                        {tabManager.openRightTabs.length > 1 && (
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
                {tabManager.openRightTabs.length > 0 ? (
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
