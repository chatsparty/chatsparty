import { useState, useEffect, useCallback } from "react";
import { useToast } from "../../../hooks/useToast";
import type { ActiveConversation, Agent } from "../types";

export const useMessageSender = (
  activeConversation: ActiveConversation | undefined,
  agents: Agent[],
  onStartNewConversation: (
    selectedAgents: string[],
    initialMessage: string,
    onError?: (error: string) => void
  ) => Promise<void>,
  onSendMessage?: (
    conversationId: string,
    message: string,
    selectedAgents: string[]
  ) => Promise<void>
) => {
  const { showToast } = useToast();
  const [messageInput, setMessageInput] = useState("");
  const [selectedAgentsForMessage, setSelectedAgentsForMessage] = useState<
    string[]
  >([]);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [agentSearchQuery, setAgentSearchQuery] = useState("");

  useEffect(() => {
    if (activeConversation) {
      setSelectedAgentsForMessage(activeConversation.agents);
    } else if (selectedAgentsForMessage.length === 0) {
      const defaultAgents = (agents || []).slice(0, 2).map((a) => a.id);
      setSelectedAgentsForMessage(defaultAgents);
    }
  }, [activeConversation, agents]);

  const handleSendMessage = useCallback(async () => {
    if (!messageInput.trim() || selectedAgentsForMessage.length < 2) {
      return;
    }

    setIsSendingMessage(true);

    if (!activeConversation) {
      let errorHandled = false;
      try {
        await onStartNewConversation(
          selectedAgentsForMessage,
          messageInput,
          (error: string) => {
            errorHandled = true;
            console.error("Socket error during conversation start:", error);
            if (!error.startsWith("insufficient_credits:")) {
              showToast("Failed to start conversation.", "error");
            }
            setIsSendingMessage(false);
          }
        );
        setMessageInput("");
      } catch (error) {
        console.error("Failed to start conversation:", error);
        if (!errorHandled) {
          showToast("Failed to start conversation. Please try again.", "error");
        }
      } finally {
        setIsSendingMessage(false);
      }
    } else if (onSendMessage) {
      try {
        await onSendMessage(
          activeConversation.id,
          messageInput,
          selectedAgentsForMessage
        );
        setMessageInput("");
      } catch (error) {
        console.error("Failed to send message:", error);
        showToast("Failed to send message.", "error");
      } finally {
        setIsSendingMessage(false);
      }
    }
  }, [
    messageInput,
    selectedAgentsForMessage,
    activeConversation,
    onStartNewConversation,
    onSendMessage,
    showToast,
  ]);

  const toggleAgentSelection = (agentId: string) => {
    setSelectedAgentsForMessage((prev) => {
      if (prev.includes(agentId)) {
        return prev.filter((id) => id !== agentId);
      }
      return [...prev, agentId];
    });
  };

  return {
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
  };
};
