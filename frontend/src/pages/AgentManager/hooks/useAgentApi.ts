import { useState, useCallback } from "react";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { useToast } from "../../../hooks/useToast";
import { useTracking } from "../../../hooks/useTracking";
import { useConnections } from "../../../hooks/useConnections";
import type { FormData } from "./useAgentValidation";

interface Agent {
  id: string;
  name: string;
  characteristics?: string;
  connectionId?: string;
}

export const useAgentApi = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useTranslation();
  const { showToast } = useToast();
  const {
    trackAgentCreated,
    trackAgentUpdated,
    trackAgentDeleted,
    trackError,
  } = useTracking();
  const { connections } = useConnections();

  const fetchAgents = useCallback(async () => {
    try {
      const response = await axios.get("/agents");
      const responseData = response.data;

      console.log('🔍 Agents API response:', responseData);

      // Backend returns { agents: AgentResponse[], pagination: {...} }
      if (responseData && responseData.agents && Array.isArray(responseData.agents)) {
        console.log('🔍 Setting agents:', responseData.agents);
        setAgents(responseData.agents);
      } else {
        console.warn('🔍 Unexpected response structure:', responseData);
        setAgents([]);
      }
    } catch (error) {
      console.error("Failed to fetch agents:", error);
      setAgents([]);
      showToast(t("errors.generic"), "error");
    }
  }, [t, showToast]);

  const createAgent = useCallback(
    async (formData: FormData): Promise<boolean> => {
      setIsLoading(true);
      try {
        let connectionId = formData.connection_id;
        if (!connectionId) {
          const defaultConnection = connections.find(
            (conn) => conn.is_default || conn.id === "chatsparty-default"
          );
          connectionId = defaultConnection?.id || "default";
        }

        const connection = connections.find((conn) => conn.id === connectionId);

        if (!connection) {
          console.warn(
            `Connection not found for ID: ${connectionId}. Available connections:`,
            connections
          );
        }

        const defaultPrompt = `You are ${formData.name.trim()}, a helpful AI assistant. ${formData.characteristics.trim()}`;

        const payload = {
          name: formData.name.trim(),
          prompt: defaultPrompt,
          characteristics: formData.characteristics.trim(),
          connectionId: connectionId,

          aiConfig: {
            provider: connection?.provider || "openai",
            modelName: connection?.model_name || "gpt-3.5-turbo",
            connectionId: connectionId,
          },

          chatStyle: {
            friendliness: "friendly",
            responseLength: "medium",
            personality: "balanced",
            humor: "light",
            expertiseLevel: "expert",
          },
        };

        await axios.post("/agents", payload);

        trackAgentCreated({
          agent_name: formData.name,
          agent_type: "simple",
          provider: connection?.provider || "unknown",
          model_name: connection?.model_name || "unknown",
          chat_style_friendliness: "friendly",
          chat_style_response_length: "medium",
          chat_style_personality: "balanced",
          chat_style_humor: "light",
          chat_style_expertise_level: "expert",
        });

        showToast(t("agents.agentCreated"), "success");
        await fetchAgents();
        return true;
      } catch (error) {
        console.error("Failed to create agent:", error);
        trackError(
          "agent_creation_error",
          error instanceof Error ? error.message : "Unknown error",
          "agent_manager"
        );
        handleApiError(error, "create");
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [connections, trackAgentCreated, trackError, showToast, t, fetchAgents]
  );

  const updateAgent = useCallback(
    async (agentId: string, formData: FormData): Promise<boolean> => {
      setIsLoading(true);
      try {
        let connectionId = formData.connection_id;
        if (!connectionId) {
          const defaultConnection = connections.find(
            (conn) => conn.is_default || conn.id === "chatsparty-default"
          );
          connectionId = defaultConnection?.id || "default";
        }

        const connection = connections.find((conn) => conn.id === connectionId);

        if (!connection) {
          console.warn(
            `Connection not found for ID: ${connectionId}. Available connections:`,
            connections
          );
        }

        const defaultPrompt = `You are ${formData.name.trim()}, a helpful AI assistant. ${formData.characteristics.trim()}`;

        const payload = {
          name: formData.name.trim(),
          prompt: defaultPrompt,
          characteristics: formData.characteristics.trim(),
          connectionId: connectionId,

          aiConfig: {
            provider: connection?.provider || "openai",
            modelName: connection?.model_name || "gpt-3.5-turbo",
            connectionId: connectionId,
          },

          chatStyle: {
            friendliness: "friendly",
            responseLength: "medium",
            personality: "balanced",
            humor: "light",
            expertiseLevel: "expert",
          },
        };

        await axios.patch(`/agents/${agentId}`, payload);
        trackAgentUpdated(agentId, formData.name);
        showToast(t("agents.agentUpdated"), "success");
        await fetchAgents();
        return true;
      } catch (error) {
        console.error("Failed to update agent:", error);
        trackError(
          "agent_update_error",
          error instanceof Error ? error.message : "Unknown error",
          "agent_manager"
        );
        handleApiError(error, "update");
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [trackAgentUpdated, trackError, showToast, t, fetchAgents]
  );

  const deleteAgent = useCallback(
    async (agent: Agent): Promise<boolean> => {
      setIsLoading(true);
      try {
        await axios.delete(`/agents/${agent.id}`);
        trackAgentDeleted(agent.id, agent.name);
        showToast(t("agents.agentDeleted"), "success");
        await fetchAgents();
        return true;
      } catch (error) {
        console.error("Failed to delete agent:", error);
        trackError(
          "agent_deletion_error",
          error instanceof Error ? error.message : "Unknown error",
          "agent_manager"
        );
        handleApiError(error, "delete");
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [trackAgentDeleted, trackError, showToast, t, fetchAgents]
  );

  const handleApiError = useCallback(
    (error: any, operation: "create" | "update" | "delete") => {
      if (axios.isAxiosError(error)) {
        switch (error.response?.status) {
          case 400:
            showToast(t("errors.badRequest"), "error");
            break;
          case 404:
            showToast(t("errors.notFound"), "error");
            break;
          case 409:
            showToast(t("errors.duplicateEntry"), "error");
            break;
          case 422:
            showToast(t("errors.invalidInput"), "error");
            break;
          case 500:
            showToast(t("errors.server"), "error");
            break;
          default:
            showToast(t(`errors.${operation}Failed`), "error");
        }
      } else {
        showToast(t("errors.network"), "error");
      }
    },
    [showToast, t]
  );

  return {
    agents,
    isLoading,
    fetchAgents,
    createAgent,
    updateAgent,
    deleteAgent,
  };
};
