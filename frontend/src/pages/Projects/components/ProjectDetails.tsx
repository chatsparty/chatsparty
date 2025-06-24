import { File, Loader2, MessageSquare, X } from "lucide-react";
import React, { useState } from "react";
import type {
  Project,
  ProjectStatus,
  ProjectVMService,
} from "../../../types/project";
import { ChatPanel } from "./ChatPanel";
import { TerminalPanel } from "./TerminalPanel";
import { FileEditor } from "./FileEditor";
import { FileExplorerArborist } from "../../../components/FileExplorer/FileExplorerArborist";
import { FilesPanel } from "./FilesPanel";
import { IconSidebar } from "./IconSidebar";
import { PreviewPanel } from "./PreviewPanel";
import { ProjectHeader } from "./ProjectHeader";
import { ResizeHandle } from "./ResizeHandle";
import { ServicesPanel } from "./ServicesPanel";
import { SettingsPanel } from "./SettingsPanel";
import { useFileManager } from "../hooks/useFileManager";
import { useTabManager, type LeftTab, type RightTab } from "../hooks/useTabManager";
import { useChatMessages } from "../hooks/useChatMessages";
import { useResizeablePanes } from "../hooks/useResizeablePanes";
import { useDragAndDrop } from "../hooks/useDragAndDrop";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { useFileExplorerResize } from "../hooks/useFileExplorerResize";

interface ProjectDetailsProps {
  project: Project;
  projectStatus: ProjectStatus | null;
  vmServices: ProjectVMService[];
  onSetupVM: () => void;
  onRefreshStatus: () => void;
  onStopService: (serviceId: string) => void;
  onStopServiceByPort: (port: number) => void;
  onRefreshServices: () => void;
  onNavigateBack?: () => void;
  onEditProject?: () => void;
}


export const ProjectDetails: React.FC<ProjectDetailsProps> = ({
  project,
  projectStatus,
  vmServices,
  onSetupVM,
  onRefreshStatus,
  onStopService,
  onStopServiceByPort,
  onRefreshServices,
  onNavigateBack,
  onEditProject,
}) => {
  const [fileViewerOpen, setFileViewerOpen] = useState(false);

  // Custom hooks
  const fileManager = useFileManager({ project });
  const tabManager = useTabManager();
  const chatMessages = useChatMessages();
  const resizeablePanes = useResizeablePanes(50);
  const dragAndDrop = useDragAndDrop();
  const fileExplorerResize = useFileExplorerResize();

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
    return (
      <>
        <div className={tabManager.rightTab === "files" ? "block h-full" : "hidden"}>
          <FilesPanel
            dragOver={dragAndDrop.dragOver}
            onDrop={dragAndDrop.handleDrop}
            onDragOver={dragAndDrop.handleDragOver}
            onDragLeave={dragAndDrop.handleDragLeave}
          />
        </div>

        <div className={tabManager.rightTab === "settings" ? "block h-full" : "hidden"}>
          <SettingsPanel
            project={project}
            projectStatus={projectStatus}
            onRefreshStatus={onRefreshStatus}
            onSetupVM={onSetupVM}
          />
        </div>

        <div className={tabManager.rightTab === "services" ? "block h-full" : "hidden"}>
          <ServicesPanel
            vmServices={vmServices}
            onRefreshServices={onRefreshServices}
            onStopService={onStopService}
            onStopServiceByPort={onStopServiceByPort}
          />
        </div>

        <div className={tabManager.rightTab === "terminal" ? "block h-full" : "hidden"}>
          <TerminalPanel projectId={project.id} />
        </div>

        <div className={tabManager.rightTab === "preview" ? "block h-full" : "hidden"}>
          <PreviewPanel 
            projectId={project.id}
            previewUrl={projectStatus?.preview_url}
          />
        </div>
      </>
    );
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
          <div 
            style={{ width: fileExplorerResize.width }}
            className="bg-neutral-900 border-r border-border relative m-1.5 rounded-md"
          >
            <FileExplorerArborist
              projectId={project.id}
              onOpenFile={openFile}
              width={fileExplorerResize.width}
              height={window.innerHeight - 60} // Adjust for header
            />
            <ResizeHandle
              onMouseDown={fileExplorerResize.handleMouseDown}
            />
          </div>
        )}

        <div ref={resizeablePanes.containerRef} className="flex-1 flex">
          <div
            style={{ width: `${resizeablePanes.splitPosition}%` }}
            className="border-r border-border flex flex-col"
          >
            <div className="h-full m-1.5 flex flex-col rounded-md bg-card">
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
            <div className="h-full m-1.5 flex flex-col rounded-md bg-card">
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
