import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { API_BASE_URL } from "../../config/api";
import { useMultiAgentChat } from "./hooks/useMultiAgentChat";
import ConversationSidebar from "./components/ConversationSidebar";
import ChatArea from "./components/ChatArea";
import FileAttachmentSidebar from "./components/FileAttachmentSidebar";
import type { AttachedFile } from "./types";
import { Button } from "../../components/ui/button";
import { Modal } from "../../components/ui/modal";
import {
  X,
  Paperclip,
  MessageCircle,
  Files,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const MultiAgentChatPage: React.FC = () => {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === "rtl";
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isFileSidebarOpen, setIsFileSidebarOpen] = useState(false);
  const [isDesktopFileSidebarOpen, setIsDesktopFileSidebarOpen] =
    useState(false);
  const [activeView, setActiveView] = useState<
    "chat" | "conversations" | "files"
  >("chat");
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [creditsError, setCreditsError] = useState<{
    required: number;
    available: number;
  } | null>(null);

  const handleCreateNewConversation = () => {
    setActiveConversation(null);
    navigate("/chat");
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
  } = useMultiAgentChat(attachedFiles, navigate);
  const [isExtractingContent, setIsExtractingContent] = useState(false);

  const handleStartConversation = useCallback(
    async (
      selectedAgents: string[],
      initialMessage: string,
      onError?: (error: string) => void
    ) => {
      await startConversation(
        selectedAgents,
        initialMessage,
        (error: string) => {
          console.log("Error in wrapped startConversation:", error);

          if (error.startsWith("insufficient_credits:")) {
            const parts = error.split(":");
            const required = parseInt(parts[1]);
            const available = parseInt(parts[2]);

            console.log("Setting credits error in parent:", {
              required,
              available,
            });
            setCreditsError({ required, available });
            setShowCreditsModal(true);
          }

          onError?.(error);
        }
      );
    },
    [startConversation]
  );

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

  useEffect(() => {
    if (conversationId && conversationId !== activeConversation) {
      setActiveConversation(conversationId);
    }
  }, [conversationId]);

  useEffect(() => {
    const brainstormData = localStorage.getItem("brainstormSession");
    const useCaseData = localStorage.getItem("useCaseSession");

    if ((brainstormData || useCaseData) && !conversationId) {
      try {
        if (brainstormData) {
          const session = JSON.parse(brainstormData);
          const sessionAge = Date.now() - session.timestamp;

          if (sessionAge < 5 * 60 * 1000) {
            localStorage.removeItem("brainstormSession");

            if (
              session.agents &&
              session.agents.length >= 2 &&
              session.initialMessage
            ) {
              handleStartConversation(
                session.agents,
                session.initialMessage,
                (error: string) => {
                  console.error("Brainstorm session error:", error);
                }
              );
            }
          } else {
            localStorage.removeItem("brainstormSession");
          }
        } else if (useCaseData) {
          const session = JSON.parse(useCaseData);
          const sessionAge = Date.now() - session.timestamp;

          if (sessionAge < 5 * 60 * 1000) {
            localStorage.removeItem("useCaseSession");

            if (
              session.agents &&
              session.agents.length >= 2 &&
              session.initialMessage
            ) {
              handleStartConversation(
                session.agents,
                session.initialMessage,
                (error: string) => {
                  console.error("Use case session error:", error);
                }
              );
            }
          } else {
            localStorage.removeItem("useCaseSession");
          }
        }
      } catch (error) {
        console.error("Failed to parse session data:", error);
        localStorage.removeItem("brainstormSession");
        localStorage.removeItem("useCaseSession");
      }
    }
  }, [conversationId]);

  useEffect(() => {
    if (activeConversation && activeConversation !== conversationId) {
      navigate(`/chat/${activeConversation}`, { replace: true });
    } else if (!activeConversation && conversationId) {
      navigate("/chat", { replace: true });
    }
  }, [activeConversation, conversationId, navigate]);

  const activeConv = conversations.find((c) => c.id === activeConversation);

  return (
    <div className="flex h-full bg-background relative">
      <div className="lg:hidden fixed top-0 inset-x-0 z-50 bg-background/98 backdrop-blur-lg border-b-2 border-border shadow-xl">
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-background to-card/90">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsSidebarOpen(!isSidebarOpen);
                setActiveView("conversations");
              }}
              className="lg:hidden text-foreground hover:text-primary hover:bg-primary/15 border border-transparent hover:border-primary/20 transition-all duration-200"
            >
              <MessageCircle className="w-5 h-5" />
              <span className="sr-only">Toggle conversations</span>
            </Button>
            <h1 className="text-lg font-bold text-foreground tracking-tight">
              {activeConv ? activeConv.name : t("chat.multiAgentChat")}
            </h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsFileSidebarOpen(!isFileSidebarOpen);
              setActiveView("files");
            }}
            className="lg:hidden text-foreground hover:text-primary hover:bg-primary/15 border border-transparent hover:border-primary/20 transition-all duration-200 relative"
          >
            <Paperclip className="w-5 h-5" />
            {attachedFiles.length > 0 && (
              <span className="ms-1 text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5 font-bold shadow-md border border-primary/20">
                {attachedFiles.length}
              </span>
            )}
          </Button>
        </div>
      </div>

      <div className="hidden lg:flex h-full w-full relative">
        <div className="fixed start-0 top-0 bottom-0 z-30">
          <div className="group w-2 h-full absolute start-0 top-0">
            <div className="w-2 h-full bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

            <div className="transform rtl:translate-x-full ltr:-translate-x-full group-hover:translate-x-0 transition-all duration-300 ease-out h-full shadow-2xl border-e border-border/20 backdrop-blur-sm absolute start-0 top-0">
              <ConversationSidebar
                agents={agents}
                conversations={conversations}
                activeConversation={activeConversation}
                onStopConversation={stopConversation}
                onSelectConversation={(conversationId) => {
                  setActiveConversation(conversationId);
                  navigate(`/chat/${conversationId}`);
                }}
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
            onStartNewConversation={handleStartConversation}
            onSendMessage={sendMessage}
            showCreditsModal={showCreditsModal}
            setShowCreditsModal={setShowCreditsModal}
            creditsError={creditsError}
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

        <div
          className="fixed top-1/2 -translate-y-1/2 z-40"
          style={{
            [isRTL ? "left" : "right"]: isDesktopFileSidebarOpen
              ? "288px"
              : "16px",
          }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setIsDesktopFileSidebarOpen(!isDesktopFileSidebarOpen)
            }
            className="h-12 w-8 p-0 bg-card/80 hover:bg-card border border-border/50 hover:border-border shadow-md transition-all duration-200 rounded-s-lg rounded-e-none"
            title={
              isDesktopFileSidebarOpen
                ? "Close file sidebar"
                : "Open file sidebar"
            }
          >
            {isDesktopFileSidebarOpen ? (
              isRTL ? (
                <ChevronLeft className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )
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
        <div
          className={`
          fixed inset-0 z-40 bg-background backdrop-blur-lg transform transition-all duration-300 pt-16 shadow-2xl border-e-2 border-border/50
          ${
            activeView === "conversations"
              ? "translate-x-0"
              : isRTL
              ? "translate-x-full"
              : "-translate-x-full"
          }
        `}
        >
          <div className="h-full flex flex-col">
            <div className="p-4 border-b-2 border-border flex items-center justify-between bg-gradient-to-r from-card/70 to-background/50">
              <h2 className="text-lg font-bold text-foreground tracking-tight">
                {t("chat.conversations")}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveView("chat")}
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
                  navigate(`/chat/${conversationId}`);
                  setActiveView("chat");
                }}
                onDeleteConversation={deleteConversation}
                onCreateNewConversation={() => {
                  handleCreateNewConversation();
                  setActiveView("chat");
                }}
                isMobile={true}
              />
            </div>
          </div>
        </div>

        <div
          className={`
          fixed inset-0 z-40 bg-background backdrop-blur-lg transform transition-all duration-300 pt-16 shadow-2xl border-s-2 border-border/50
          ${
            activeView === "files"
              ? "translate-x-0"
              : isRTL
              ? "-translate-x-full"
              : "translate-x-full"
          }
        `}
        >
          <div className="h-full flex flex-col">
            <div className="p-4 border-b-2 border-border flex items-center justify-between bg-gradient-to-r from-card/70 to-background/50">
              <h2 className="text-lg font-bold text-foreground tracking-tight">
                {t("chat.fileAttachments")}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveView("chat")}
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

        <div className="flex-1 flex flex-col bg-gradient-to-br from-background via-background/95 to-muted/30 pt-8 min-h-0">
          <ChatArea
            activeConversation={activeConv}
            agents={agents}
            getAgentName={getAgentName}
            getAgentColor={getAgentColor}
            onConversationUpdated={loadConversations}
            onStartNewConversation={handleStartConversation}
            onSendMessage={sendMessage}
            isMobile={true}
            showCreditsModal={showCreditsModal}
            setShowCreditsModal={setShowCreditsModal}
            creditsError={creditsError}
          />
        </div>
      </div>

      <Modal
        isOpen={showCreditsModal}
        onClose={() => setShowCreditsModal(false)}
        title={t("credits.insufficientCredits")}
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="text-destructive mt-0.5">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-destructive mb-1">
                  {t("credits.notEnoughCredits")}
                </h4>
                <p className="text-sm text-muted-foreground">
                  You need{" "}
                  <span className="font-bold text-foreground">
                    {creditsError?.required} credits
                  </span>{" "}
                  to start this multi-agent conversation, but you only have{" "}
                  <span className="font-bold text-foreground">
                    {creditsError?.available} credits
                  </span>{" "}
                  available.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Multi-agent conversations consume credits based on:
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start">
                <span className="text-primary me-2">•</span>
                <span className="text-muted-foreground">
                  Number of agents in the conversation
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-primary me-2">•</span>
                <span className="text-muted-foreground">
                  Maximum number of conversation turns
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-primary me-2">•</span>
                <span className="text-muted-foreground">
                  Model complexity of each agent
                </span>
              </li>
            </ul>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowCreditsModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                window.location.href = "/settings/credits";
              }}
              className="flex-1"
            >
              Get More Credits
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MultiAgentChatPage;
