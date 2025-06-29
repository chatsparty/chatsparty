import React, { useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../../config/api";
import { useMultiAgentChat } from "./hooks/useMultiAgentChat";
import ConversationSidebar from "./components/ConversationSidebar";
import ChatArea from "./components/ChatArea";
import FileAttachmentSidebar from "./components/FileAttachmentSidebar";
import type { AttachedFile } from "./types";
import { Button } from "../../components/ui/button";
import { X, Paperclip, MessageCircle, Files, ChevronRight, ChevronLeft } from "lucide-react";

const MultiAgentChatPage: React.FC = () => {
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isFileSidebarOpen, setIsFileSidebarOpen] = useState(false);
  const [isDesktopFileSidebarOpen, setIsDesktopFileSidebarOpen] = useState(true);
  const [activeView, setActiveView] = useState<'chat' | 'conversations' | 'files'>('chat');

  const handleCreateNewConversation = () => {
    // Clear current conversation to show empty state
    setActiveConversation(null);
  };

  const {
    agents,
    conversations,
    activeConversation,
    setActiveConversation,
    startConversation,
    stopConversation,
    sendMessage,
    deleteConversation,
    getAgentName,
    getAgentColor,
    loadConversations,
  } = useMultiAgentChat(attachedFiles);
  const [isExtractingContent, setIsExtractingContent] = useState(false);

  const handleFilesAttached = (files: AttachedFile[]) => {
    setAttachedFiles(files);
  };

  const handleFileRemoved = (fileId: string) => {
    setAttachedFiles((prev) => prev.filter((file) => file.id !== fileId));
  };

  const handleExtractContent = async (fileId: string): Promise<string> => {
    setIsExtractingContent(true);

    try {
      const file = attachedFiles.find((f) => f.id === fileId);
      if (!file) throw new Error("File not found");

      setAttachedFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, isExtracting: true } : f))
      );

      const formData = new FormData();
      formData.append("file", file.file);

      const response = await axios.post(
        `${API_BASE_URL}/files/extract-content`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      return response.data.content || "";
    } catch (error) {
      console.error("Error extracting content:", error);
      throw error;
    } finally {
      setIsExtractingContent(false);
    }
  };

  const activeConv = conversations.find((c) => c.id === activeConversation);

  return (
    <div className="flex h-full bg-background relative">
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-background/98 backdrop-blur-lg border-b-2 border-border shadow-xl">
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-background to-card/90">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsSidebarOpen(!isSidebarOpen);
                setActiveView('conversations');
              }}
              className="lg:hidden text-foreground hover:text-primary hover:bg-primary/15 border border-transparent hover:border-primary/20 transition-all duration-200"
            >
              <MessageCircle className="w-5 h-5" />
              <span className="sr-only">Toggle conversations</span>
            </Button>
            <h1 className="text-lg font-bold text-foreground tracking-tight">Multi-Agent Chat</h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsFileSidebarOpen(!isFileSidebarOpen);
              setActiveView('files');
            }}
            className="lg:hidden text-foreground hover:text-primary hover:bg-primary/15 border border-transparent hover:border-primary/20 transition-all duration-200 relative"
          >
            <Paperclip className="w-5 h-5" />
            {attachedFiles.length > 0 && (
              <span className="ml-1 text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5 font-bold shadow-md border border-primary/20">
                {attachedFiles.length}
              </span>
            )}
          </Button>
        </div>
      </div>

      <div className="hidden lg:flex h-full w-full relative">
        {/* Hover trigger and sidebar */}
        <div className="fixed left-0 top-0 bottom-0 z-30">
          {/* Very narrow hover trigger area - only first 8px */}
          <div className="group w-2 h-full absolute left-0 top-0">
            <div className="w-2 h-full bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            {/* Enhanced sidebar that slides in on hover */}
            <div className="transform -translate-x-full group-hover:translate-x-0 transition-all duration-300 ease-out h-full shadow-2xl border-r border-border/20 backdrop-blur-sm absolute left-0 top-0">
              <ConversationSidebar
                agents={agents}
                conversations={conversations}
                activeConversation={activeConversation}
                onStopConversation={stopConversation}
                onSelectConversation={setActiveConversation}
                onDeleteConversation={deleteConversation}
                onCreateNewConversation={handleCreateNewConversation}
              />
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-gradient-to-br from-background via-background/95 to-muted/30">
          <ChatArea
            activeConversation={activeConv}
            agents={agents}
            getAgentName={getAgentName}
            getAgentColor={getAgentColor}
            onConversationUpdated={loadConversations}
            onStartNewConversation={startConversation}
            onSendMessage={sendMessage}
          />
        </div>

        {isDesktopFileSidebarOpen && (
          <FileAttachmentSidebar
            attachedFiles={attachedFiles}
            onFilesAttached={handleFilesAttached}
            onFileRemoved={handleFileRemoved}
            onExtractContent={handleExtractContent}
            isExtractingContent={isExtractingContent}
            onCloseSidebar={() => setIsDesktopFileSidebarOpen(false)}
          />
        )}

        {/* Desktop File Sidebar Toggle Button */}
        <div className="fixed top-1/2 -translate-y-1/2 z-40" style={{ right: isDesktopFileSidebarOpen ? '288px' : '16px' }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDesktopFileSidebarOpen(!isDesktopFileSidebarOpen)}
            className="h-12 w-8 p-0 bg-card/80 hover:bg-card border border-border/50 hover:border-border shadow-md transition-all duration-200 rounded-l-lg rounded-r-none"
            title={isDesktopFileSidebarOpen ? "Close file sidebar" : "Open file sidebar"}
          >
            {isDesktopFileSidebarOpen ? (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            ) : (
              <div className="flex flex-col items-center gap-1">
                <Files className="w-4 h-4 text-muted-foreground" />
                {attachedFiles.length > 0 && (
                  <span className="text-xs bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center font-medium">
                    {attachedFiles.length}
                  </span>
                )}
              </div>
            )}
          </Button>
        </div>
      </div>

      <div className="lg:hidden flex h-full w-full">
        <div className={`
          fixed inset-0 z-40 bg-background backdrop-blur-lg transform transition-all duration-300 pt-16 shadow-2xl border-r-2 border-border/50
          ${activeView === 'conversations' ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="h-full flex flex-col">
            <div className="p-4 border-b-2 border-border flex items-center justify-between bg-gradient-to-r from-card/70 to-background/50">
              <h2 className="text-lg font-bold text-foreground tracking-tight">Conversations</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveView('chat')}
                className="text-muted-foreground hover:text-foreground hover:bg-muted/70 border border-transparent hover:border-border transition-all duration-200"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ConversationSidebar
                agents={agents}
                conversations={conversations}
                activeConversation={activeConversation}
                onStopConversation={stopConversation}
                onSelectConversation={(conversationId) => {
                  setActiveConversation(conversationId);
                  setActiveView('chat');
                }}
                onDeleteConversation={deleteConversation}
                onCreateNewConversation={() => {
                  handleCreateNewConversation();
                  setActiveView('chat');
                }}
                isMobile={true}
              />
            </div>
          </div>
        </div>

        <div className={`
          fixed inset-0 z-40 bg-background backdrop-blur-lg transform transition-all duration-300 pt-16 shadow-2xl border-r-2 border-border/50
          ${activeView === 'files' ? 'translate-x-0' : 'translate-x-full'}
        `}>
          <div className="h-full flex flex-col">
            <div className="p-4 border-b-2 border-border flex items-center justify-between bg-gradient-to-r from-card/70 to-background/50">
              <h2 className="text-lg font-bold text-foreground tracking-tight">File Attachments</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveView('chat')}
                className="text-muted-foreground hover:text-foreground hover:bg-muted/70 border border-transparent hover:border-border transition-all duration-200"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-hidden">
              <FileAttachmentSidebar
                attachedFiles={attachedFiles}
                onFilesAttached={handleFilesAttached}
                onFileRemoved={handleFileRemoved}
                onExtractContent={handleExtractContent}
                isExtractingContent={isExtractingContent}
                isMobile={true}
              />
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-gradient-to-br from-background via-background/95 to-muted/30 pt-8">
          <ChatArea
            activeConversation={activeConv}
            agents={agents}
            getAgentName={getAgentName}
            getAgentColor={getAgentColor}
            onConversationUpdated={loadConversations}
            onStartNewConversation={startConversation}
            onSendMessage={sendMessage}
            isMobile={true}
          />
        </div>
      </div>
    </div>
  );
};

export default MultiAgentChatPage;
