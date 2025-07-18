import {
  Conversation as PrismaConversation,
  Message as PrismaMessage,
} from '@prisma/client';

export interface Message extends PrismaMessage {}

export interface Conversation extends Omit<PrismaConversation, 'messages'> {
  messages: Message[];
}

export interface ConversationWithMessages extends Conversation {}

export type ConversationListQuery = {
  page?: number;
  limit?: number;
  agentId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
};

export type AddMessageInput = {
  content: string;
  role: 'user' | 'assistant';
  agentId?: string;
};

export type GetMessagesQuery = {
  limit?: number;
  offset?: number;
};

export type CreateConversationInput = {
  title: string;
  agentIds: string[];
  metadata?: Record<string, any>;
  projectId?: string;
  userId: string;
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
