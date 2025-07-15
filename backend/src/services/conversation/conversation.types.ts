import { Message } from '../ai/types';

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
