import React, { useState, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { useMultiAgentChat } from "./hooks/useMultiAgentChat";
import { useSidebarState } from "./hooks/useSidebarState";
import { useFileAttachments } from "./hooks/useFileAttachments";
import { useSessionHandler } from "./hooks/useSessionHandler";

import ConversationSidebar from "./components/ConversationSidebar";
import ChatArea from "./components/ChatArea";
import FileAttachmentSidebar from "./components/FileAttachmentSidebar";
import { ResponsiveLayout } from "./components/ResponsiveLayout";
import { Modal } from "../../components/ui/modal";
import { Button } from "../../components/ui/button";

const MultiAgentChatPage: React.FC = () => {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === "rtl";

  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [creditsError, setCreditsError] = useState<{
    required: number;
    available: number;
  } | null>(null);

  const {
    attachedFiles,
    isExtractingContent,
    handleFilesAttached,
    handleFileRemoved,
    handleExtractContent,
  } = useFileAttachments();

  const {
    isDesktopFileSidebarOpen,
    activeView,
    setIsDesktopFileSidebarOpen,
    toggleConversationsSidebar,
    toggleFilesSidebar,
    closeMobileSidebars,
    setActiveView,
  } = useSidebarState();

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
          if (error.startsWith("insufficient_credits:")) {
            const parts = error.split(":");
            const required = parseInt(parts[1]);
            const available = parseInt(parts[2]);
            setCreditsError({ required, available });
            setShowCreditsModal(true);
          }
          onError?.(error);
        }
      );
    },
    [startConversation]
  );

  useSessionHandler(conversationId, handleStartConversation);

  const handleCreateNewConversation = () => {
    setActiveConversation(null);
    navigate("/chat");
  };

  useEffect(() => {
    if (conversationId && conversationId !== activeConversation) {
      setActiveConversation(conversationId);
    }
  }, [conversationId, activeConversation, setActiveConversation]);

  useEffect(() => {
    if (activeConversation && activeConversation !== conversationId) {
      navigate(`/chat/${activeConversation}`, { replace: true });
    } else if (!activeConversation && conversationId) {
      navigate("/chat", { replace: true });
    }
  }, [activeConversation, conversationId, navigate]);

  const activeConv = conversations.find((c) => c.id === activeConversation);

  return (
    <>
      <ResponsiveLayout
        isRTL={isRTL}
        activeView={activeView}
        isDesktopFileSidebarOpen={isDesktopFileSidebarOpen}
        attachedFiles={attachedFiles}
        activeConvName={activeConv?.name}
        toggleConversationsSidebar={toggleConversationsSidebar}
        toggleFilesSidebar={toggleFilesSidebar}
        closeMobileSidebars={closeMobileSidebars}
        setIsDesktopFileSidebarOpen={setIsDesktopFileSidebarOpen}
        conversationSidebar={
          <ConversationSidebar
            agents={agents}
            conversations={conversations}
            activeConversation={activeConversation}
            onStopConversation={stopConversation}
            onSelectConversation={(id: string) => {
              setActiveConversation(id);
              navigate(`/chat/${id}`);
              setActiveView("chat");
            }}
            onDeleteConversation={deleteConversation}
            onCreateNewConversation={() => {
              handleCreateNewConversation();
              setActiveView("chat");
            }}
            isMobile={activeView === "conversations"}
          />
        }
        chatArea={
          <ChatArea
            activeConversation={activeConv}
            agents={agents}
            getAgentName={getAgentName}
            getAgentColor={getAgentColor}
            onConversationUpdated={loadConversations}
            onStartNewConversation={handleStartConversation}
            onSendMessage={sendMessage}
            isMobile={activeView !== "chat"}
          />
        }
        fileAttachmentSidebar={
          <FileAttachmentSidebar
            attachedFiles={attachedFiles}
            onFilesAttached={handleFilesAttached}
            onFileRemoved={handleFileRemoved}
            onExtractContent={handleExtractContent}
            isExtractingContent={isExtractingContent}
            onCloseSidebar={() => setIsDesktopFileSidebarOpen(false)}
            isMobile={activeView === "files"}
          />
        }
      />

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
    </>
  );
};

export default MultiAgentChatPage;
