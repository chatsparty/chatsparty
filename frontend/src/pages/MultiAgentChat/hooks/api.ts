import axios from "axios";
import type { Agent, ActiveConversation } from "../types";
import { API_BASE_URL } from "./constants";

export const fetchAgents = async (): Promise<Agent[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/chat/agents`);
    
    // Ensure we return an array
    if (Array.isArray(response.data)) {
      return response.data;
    } else if (response.data && Array.isArray(response.data.agents)) {
      // Handle case where API returns { agents: [...] }
      return response.data.agents;
    } else if (response.data && Array.isArray(response.data.data)) {
      // Handle case where API returns { data: [...] }
      return response.data.data;
    } else {
      console.warn("Unexpected response format from agents API:", response.data);
      return [];
    }
  } catch (error) {
    console.error(
      "Failed to fetch agents:",
      error instanceof Error ? error.message : String(error)
    );
    return []; // Return empty array on error instead of throwing
  }
};

export const fetchConversations = async (
  agents: Agent[]
): Promise<ActiveConversation[]> => {
  if (agents.length === 0) return [];

  try {
    const response = await axios.get(`${API_BASE_URL}/chat/conversations`);
    const dbConversations = response.data;

    return dbConversations.map(
      (conv: {
        id: string;
        participants: string[];
        messages: Array<{
          speaker: string;
          agent_id?: string;
          message: string;
          timestamp: number;
        }>;
        isActive?: boolean;
        is_shared?: boolean;
      }) => {
        const agentNames = conv.participants.map((agentId: string) => {
          const agent = agents.find((a) => a.agent_id === agentId);
          return agent?.name || agentId;
        });

        return {
          id: conv.id,
          name:
            agentNames.length > 0
              ? agentNames.join(" & ")
              : "Unknown Conversation",
          agents: conv.participants,
          messages: conv.messages,
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
    throw error;
  }
};

export const deleteConversation = async (conversationId: string): Promise<void> => {
  try {
    await axios.delete(`${API_BASE_URL}/chat/conversations/${conversationId}`);
  } catch (error) {
    console.error(
      "Failed to delete conversation:",
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }
};
