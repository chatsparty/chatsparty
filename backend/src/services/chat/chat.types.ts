import { Agent, Message, ConversationMessage } from '../ai/types';

// Chat request types
export interface ChatRequest {
  message: string;
  agentId?: string;
  conversationId?: string;
  stream?: boolean;
}

export interface MultiAgentChatRequest {
  message: string;
  agentIds: string[];
  conversationId?: string;
  maxTurns?: number;
  stream?: boolean;
}

// Chat response types
export interface ChatResponse {
  message: string;
  agentId?: string;
  agentName?: string;
  conversationId: string;
  timestamp: number;
  creditsUsed?: number;
}

export interface MultiAgentChatResponse {
  conversationId: string;
  messages: ConversationMessage[];
  totalCreditsUsed: number;
  conversationComplete: boolean;
}

// Conversation types
export interface Conversation {
  id: string;
  userId: string;
  title: string;
  agentIds: string[];
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export interface ConversationFilters {
  userId: string;
  agentId?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}

export interface ConversationListResponse {
  conversations: Conversation[];
  total: number;
  page: number;
  limit: number;
}

// Streaming types
export interface StreamEvent {
  type: 'message' | 'error' | 'complete' | 'credit_update';
  data: any;
  timestamp: number;
}

export interface MessageStreamEvent extends StreamEvent {
  type: 'message';
  data: {
    content: string;
    agentId?: string;
    agentName?: string;
    isComplete: boolean;
  };
}

export interface ErrorStreamEvent extends StreamEvent {
  type: 'error';
  data: {
    error: string;
    code?: string;
  };
}

export interface CompleteStreamEvent extends StreamEvent {
  type: 'complete';
  data: {
    conversationId: string;
    totalCreditsUsed: number;
  };
}

export interface CreditUpdateStreamEvent extends StreamEvent {
  type: 'credit_update';
  data: {
    creditsUsed: number;
    remainingCredits: number;
  };
}

// Service response types
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Credit tracking
export interface CreditUsage {
  modelId: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  totalCredits: number;
}

// Chat session
export interface ChatSession {
  conversationId: string;
  userId: string;
  agents: Agent[];
  messages: Message[];
  totalCreditsUsed: number;
  isActive: boolean;
  startedAt: Date;
  lastActivityAt: Date;
}