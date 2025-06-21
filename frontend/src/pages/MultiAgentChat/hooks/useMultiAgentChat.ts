import { useState, useEffect, useCallback } from "react";
import type { Agent, ActiveConversation } from "../types";
import type { UseMultiAgentChatReturn } from "./types";
import { DEFAULT_MAX_TURNS } from "./constants";
import {
  fetchAgents,
  fetchConversations,
  deleteConversation as apiDeleteConversation,
} from "./api";
import { createAgentHelpers } from "./helpers";
import { useConversationActions } from "./conversationActions";

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

    getAgentName,
    getAgentColor,
  };
};
