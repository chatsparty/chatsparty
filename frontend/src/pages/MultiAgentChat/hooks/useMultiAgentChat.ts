import { useState, useEffect, useCallback } from "react";
import type { Agent, ActiveConversation } from "../types";
import type { UseMultiAgentChatReturn } from "./types";
import { DEFAULT_MAX_TURNS } from "./constants";
import {
  fetchAgents,
  fetchConversations,
  deleteConversation as apiDeleteConversation,
  postUserMessageToConversation, // Import the new API function
} from "./api";
import { createAgentHelpers } from "./helpers";
import { useConversationActions } from "./conversationActions";
import { useAuth } from "../../../contexts/AuthContext"; // For user ID
import type { ConversationMessage } from "../types"; // For optimistic update type

export const useMultiAgentChat = (
  attachedFiles?: Array<{
    id: string;
    name: string;
    extractedContent?: string;
    file: File;
  }>
): UseMultiAgentChatReturn => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [conversations, setConversations] = useState<ActiveConversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(
    null
  );
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [initialMessage, setInitialMessage] = useState("");
  const [maxTurns, setMaxTurns] = useState(DEFAULT_MAX_TURNS);
  const [isLoading, setIsLoading] = useState(false);
  const [showNewConversationForm, setShowNewConversationForm] = useState(false);
  const { user, token } = useAuth(); // Get user and token

  const { getAgentName, getAgentColor } = createAgentHelpers(agents);

  const { startConversation, stopConversation, handleSelectAgent, cleanup } =
    useConversationActions(
      agents,
      selectedAgents,
      initialMessage,
      maxTurns,
      setConversations,
      setActiveConversation,
      setShowNewConversationForm,
      setSelectedAgents,
      setInitialMessage,
      setIsLoading,
      attachedFiles
    );

  const loadAgents = useCallback(async (): Promise<void> => {
    try {
      const agentsData = await fetchAgents();
      setAgents(agentsData);
    } catch (error) {
      console.error("Failed to load agents:", error);
    }
  }, []);

  const loadConversations = useCallback(async (): Promise<void> => {
    try {
      const conversationsData = await fetchConversations(agents);
      setConversations(conversationsData);
    } catch (error) {
      console.error("Failed to load conversations:", error);
    }
  }, [agents]);

  const deleteConversation = useCallback(
    async (conversationId: string): Promise<void> => {
      try {
        await apiDeleteConversation(conversationId);
        if (activeConversation === conversationId) {
          setActiveConversation(null);
        }
        await loadConversations();
      } catch (error) {
        console.error("Failed to delete conversation:", error);
        throw error;
      }
    },
    [activeConversation, loadConversations]
  );

  useEffect(() => {
    loadAgents();

    return cleanup;
  }, [loadAgents, cleanup]);

  useEffect(() => {
    if (agents.length > 0) {
      loadConversations();
    }
  }, [agents.length, loadConversations]);

  const sendUserMessage = useCallback(
    async (messageText: string, conversationId: string): Promise<void> => {
      if (!token || !user) {
        console.error("User not authenticated to send message");
        // Optionally, show a toast or error to the user
        throw new Error("User not authenticated");
      }
      if (!messageText.trim()) return;

      const optimisticMessage: ConversationMessage = {
        speaker: "user", // Or user.first_name || user.email for more specific speaker name
        user_id: user.id,
        message: messageText,
        timestamp: Date.now() / 1000, // Convert to seconds like backend
        type: "user_message", // Custom type for optimistic user message
      };

      // Optimistic update
      setConversations((prevConvs) =>
        prevConvs.map((conv) =>
          conv.id === conversationId
            ? {
                ...conv,
                messages: [...conv.messages, optimisticMessage],
                isActive: true, // Ensure conversation is marked active
              }
            : conv
        )
      );

      // Scroll to bottom or ensure new message is visible (ChatArea handles this)

      try {
        await postUserMessageToConversation(conversationId, messageText);
        // Message sent successfully, no action needed as optimistic update is done.
        // Backend will stream agent responses via existing SSE.
      } catch (error) {
        console.error("Failed to send user message via API:", error);
        // Revert optimistic update or mark message as failed
        setConversations((prevConvs) =>
          prevConvs.map((conv) =>
            conv.id === conversationId
              ? {
                  ...conv,
                  messages: conv.messages.map((msg) =>
                    msg.timestamp === optimisticMessage.timestamp && msg.user_id === optimisticMessage.user_id
                      ? { ...msg, type: "error", message: `Failed: ${msg.message}` } // Mark as error
                      : msg
                  ),
                }
              : conv
          )
        );
        throw error; // Re-throw for ChatArea to catch and show toast
      }
    },
    [token, user, setConversations]
  );

  return {
    agents,
    conversations,
    activeConversation,
    selectedAgents,
    initialMessage,
    maxTurns,
    isLoading,
    showNewConversationForm,

    setActiveConversation,
    setInitialMessage,
    setMaxTurns,
    setShowNewConversationForm,
    startConversation,
    stopConversation,
    deleteConversation,
    handleSelectAgent,
    loadConversations,
    sendUserMessage, // Added sendUserMessage

    getAgentName,
    getAgentColor,
  };
};
