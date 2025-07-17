import { Conversation as PrismaConversation } from '@prisma/client';
import { Message } from '../../domains/ai/types';

export type Conversation = Omit<PrismaConversation, 'messages' | 'metadata'> & {
  messages: Message[];
  metadata?: Record<string, any>;
};

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

export interface CreateConversationData {
  userId: string;
  title: string;
  agentIds: string[];
  metadata?: Record<string, any>;
}
