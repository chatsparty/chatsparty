import { useState, useEffect, useCallback } from "react";
import type { Agent, ActiveConversation } from "../types";
import type { UseMultiAgentChatReturn } from "./types";
import { DEFAULT_MAX_TURNS } from "./constants";
import { fetchAgents, fetchConversations } from "./api";
import { createAgentHelpers } from "./helpers";
import { useConversationActions } from "./conversationActions";

export const useMultiAgentChat = (): UseMultiAgentChatReturn => {
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
      setIsLoading
    );

  const loadAgents = useCallback(async (): Promise<void> => {
    try {
      const agentsData = await fetchAgents();
      setAgents(agentsData);
    } catch {}
  }, []);

  const loadConversations = useCallback(async (): Promise<void> => {
    try {
      const conversationsData = await fetchConversations(agents);
      setConversations(conversationsData);
    } catch {}
  }, [agents]);

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
    handleSelectAgent,

    getAgentName,
    getAgentColor,
  };
};
