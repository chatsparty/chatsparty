import React from "react";
import type { ActiveConversation, Agent } from "../types";
import { useToast } from "../../../hooks/useToast";
import { useShareConversation } from "../hooks/useShareConversation";
import { useMessageSender } from "../hooks/useMessageSender";
import { NewConversationView } from "./NewConversationView";
import { ActiveConversationView } from "./ActiveConversationView";

interface ChatAreaProps {
  activeConversation: ActiveConversation | undefined;
  agents: Agent[];
  getAgentName: (agentId: string) => string;
  getAgentColor: (agentId: string) => string;
  onConversationUpdated: () => Promise<void>;
  onStartNewConversation: (
    selectedAgents: string[],
    initialMessage: string,
    onError?: (error: string) => void
  ) => Promise<void>;
  onSendMessage?: (
    conversationId: string,
    message: string,
    selectedAgents: string[]
  ) => Promise<void>;
  isMobile?: boolean;
}

const ChatArea: React.FC<ChatAreaProps> = ({
  activeConversation,
  agents,
  getAgentColor,
  onConversationUpdated,
  onStartNewConversation,
  onSendMessage,
  isMobile = false,
}) => {
  const { toasts, removeToast } = useToast();

  const {
    isSharing,
    isShared,
    showShareModal,
    shareUrl,
    handleOpenShareModal,
    handleToggleShare,
    handleCopyLink,
    setShowShareModal,
  } = useShareConversation(activeConversation, onConversationUpdated);

  const {
    messageInput,
    setMessageInput,
    selectedAgentsForMessage,
    showAgentModal,
    setShowAgentModal,
    isSendingMessage,
    agentSearchQuery,
    setAgentSearchQuery,
    handleSendMessage,
    toggleAgentSelection,
  } = useMessageSender(
    activeConversation,
    agents,
    onStartNewConversation,
    onSendMessage
  );

  if (!activeConversation) {
    return (
      <NewConversationView
        agents={agents}
        getAgentColor={getAgentColor}
        isMobile={isMobile}
        messageInput={messageInput}
        setMessageInput={setMessageInput}
        selectedAgentsForMessage={selectedAgentsForMessage}
        showAgentModal={showAgentModal}
        setShowAgentModal={setShowAgentModal}
        isSendingMessage={isSendingMessage}
        agentSearchQuery={agentSearchQuery}
        setAgentSearchQuery={setAgentSearchQuery}
        handleSendMessage={handleSendMessage}
        toggleAgentSelection={toggleAgentSelection}
      />
    );
  }

  return (
    <ActiveConversationView
      activeConversation={activeConversation}
      agents={agents}
      getAgentColor={getAgentColor}
      isMobile={isMobile}
      messageInput={messageInput}
      setMessageInput={setMessageInput}
      selectedAgentsForMessage={selectedAgentsForMessage}
      showAgentModal={showAgentModal}
      setShowAgentModal={setShowAgentModal}
      isSendingMessage={isSendingMessage}
      agentSearchQuery={agentSearchQuery}
      setAgentSearchQuery={setAgentSearchQuery}
      handleSendMessage={handleSendMessage}
      toggleAgentSelection={toggleAgentSelection}
      isSharing={isSharing}
      isShared={isShared}
      showShareModal={showShareModal}
      shareUrl={shareUrl}
      handleOpenShareModal={handleOpenShareModal}
      handleToggleShare={handleToggleShare}
      handleCopyLink={handleCopyLink}
      setShowShareModal={setShowShareModal}
      toasts={toasts}
      removeToast={removeToast}
    />
  );
};

export default ChatArea;
