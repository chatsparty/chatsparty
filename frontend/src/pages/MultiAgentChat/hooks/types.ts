import type { Agent, ActiveConversation } from '../types';

export interface UseMultiAgentChatReturn {
  // State
  agents: Agent[];
  conversations: ActiveConversation[];
  activeConversation: string | null;
  selectedAgents: string[];
  initialMessage: string;
  maxTurns: number;
  isLoading: boolean;
  showNewConversationForm: boolean;
  
  // Actions
  setActiveConversation: (id: string | null) => void;
  setInitialMessage: (message: string) => void;
  setMaxTurns: (turns: number) => void;
  setShowNewConversationForm: (show: boolean) => void;
  startConversation: () => Promise<void>;
  stopConversation: (conversationId: string) => void;
  deleteConversation: (conversationId: string) => Promise<void>;
  handleSelectAgent: (agentId: string, checked: boolean) => void;
  loadConversations: () => Promise<void>;
  
  loadConversations: () => Promise<void>;
  sendUserMessage: (messageText: string, conversationId: string) => Promise<void>; // Added

  // Helpers
  getAgentName: (agentId: string) => string;
  getAgentColor: (agentId: string) => string;
}

export interface StreamMessage {
  type: 'message' | 'typing' | 'complete';
  speaker?: string;
  agent_id?: string;
  message?: string;
  timestamp?: number;
}