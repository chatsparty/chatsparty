import axios from "axios";
import type { Agent, ActiveConversation } from "../types";

export const fetchAgents = async (): Promise<Agent[]> => {
  try {
    console.log("🔵 fetchAgents called, fetching from:", "/chat/agents");
    const response = await axios.get("/agents");
    console.log("🟡 fetchAgents response:", response.data);

    if (
      response.data &&
      response.data.success &&
      response.data.data &&
      Array.isArray(response.data.data.agents)
    ) {
      return response.data.data.agents;
    } else if (Array.isArray(response.data)) {
      return response.data;
    } else if (response.data && Array.isArray(response.data.agents)) {
      return response.data.agents;
    } else if (response.data && Array.isArray(response.data.data)) {
      return response.data.data;
    } else {
      console.warn(
        "Unexpected response format from agents API:",
        response.data
      );
      return [];
    }
  } catch (error) {
    console.error(
      "Failed to fetch agents:",
      error instanceof Error ? error.message : String(error)
    );
    return [];
  }
};

export const fetchConversations = async (
  agents: Agent[]
): Promise<ActiveConversation[]> => {
  if (agents.length === 0) return [];

  try {
    console.log(
      "🔵 fetchConversations called, fetching from:",
      "/chat/conversations"
    );
    const response = await axios.get("/conversations");
    console.log("🟡 fetchConversations response:", response.data);

    let dbConversations: any[] = [];

    if (
      response.data &&
      response.data.success &&
      response.data.data &&
      Array.isArray(response.data.data.conversations)
    ) {
      dbConversations = response.data.data.conversations;
    } else if (
      response.data &&
      response.data.success &&
      Array.isArray(response.data.data)
    ) {
      dbConversations = response.data.data;
    } else if (Array.isArray(response.data)) {
      dbConversations = response.data;
    } else if (response.data && Array.isArray(response.data.conversations)) {
      dbConversations = response.data.conversations;
    } else if (response.data && Array.isArray(response.data.data)) {
      dbConversations = response.data.data;
    } else {
      console.warn(
        "Unexpected response format from conversations API:",
        response.data
      );
      return [];
    }

    console.log("🟡 Processing conversations array:", dbConversations);
    console.log("🟡 dbConversations type:", typeof dbConversations);
    console.log("🟡 dbConversations is array:", Array.isArray(dbConversations));
    console.log("🟡 dbConversations length:", dbConversations?.length);

    if (!dbConversations || !Array.isArray(dbConversations)) {
      console.warn("🔴 dbConversations is not an array:", dbConversations);
      return [];
    }

    return dbConversations.map(
      (conv: {
        id: string;
        title: string;
        agentIds: string[];
        messages: Array<{
          role: string;
          content: string;
          agentId?: string;
          timestamp: number;
        }>;
        isActive?: boolean;
        is_shared?: boolean;
      }) => {
        const agentNames =
          conv.agentIds?.map((agentId: string) => {
            const agent = agents.find((a) => a.id === agentId);
            return agent?.name || agentId;
          }) || [];

        const frontendMessages = (conv.messages || []).map((msg) => ({
          speaker: msg.agentId
            ? agents.find((a) => a.id === msg.agentId)?.name || msg.agentId
            : "User",
          agent_id: msg.agentId,
          message: msg.content,
          timestamp: msg.timestamp,
        }));

        return {
          id: conv.id,
          name:
            conv.title ||
            (agentNames.length > 0
              ? agentNames.join(" & ")
              : "Unknown Conversation"),
          agents: conv.agentIds || [],
          messages: frontendMessages,
          isActive: conv.isActive || false,
          is_shared: conv.is_shared || false,
        };
      }
    );
  } catch (error) {
    console.error(
      "Failed to fetch conversations:",
      error instanceof Error ? error.message : String(error)
    );
    return [];
  }
};

export const deleteConversation = async (
  conversationId: string
): Promise<void> => {
  try {
    await axios.delete(`/conversations/${conversationId}`);
  } catch (error) {
    console.error(
      "Failed to delete conversation:",
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }
};
