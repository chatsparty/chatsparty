import { PrismaClient } from '@prisma/client';
import { db } from '../../config/database';
import {
  Conversation,
  ConversationListQuery,
  CreateConversationInput,
  Message,
  ConversationFilters,
  ConversationListResponse,
  GetMessagesQuery,
} from './types';

export const findConversationById = async (
  conversationId: string,
  database: PrismaClient = db
): Promise<Conversation | null> => {
  const conversation = await database.conversation.findUnique({
    where: { id: conversationId },
  });
  if (!conversation) return null;
  const messages = await getMessagesFromConversation(
    conversationId,
    {},
    database
  );
  return { ...conversation, messages };
};

export const findConversationsByUserId = async (
  userId: string,
  query: ConversationListQuery,
  database: PrismaClient = db
): Promise<[Conversation[], number]> => {
  const { page = 1, limit = 20, agentId, startDate, endDate, search } = query;
  const where: any = { userId };

  if (agentId) {
    where.agentIds = { has: agentId };
  }
  if (startDate) {
    where.createdAt = { gte: new Date(startDate) };
  }
  if (endDate) {
    where.createdAt = { ...where.createdAt, lte: new Date(endDate) };
  }
  if (search) {
    where.title = { contains: search, mode: 'insensitive' };
  }

  const conversationsData = await database.conversation.findMany({
    where,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { createdAt: 'desc' },
  });

  const conversations = await Promise.all(
    conversationsData.map(async c => {
      const messages = await getMessagesFromConversation(c.id, {}, database);
      return { ...c, messages };
    })
  );

  const total = await database.conversation.count({ where });

  return [conversations, total];
};

export const createConversation = async (
  userId: string,
  input: CreateConversationInput,
  database: PrismaClient = db
): Promise<Conversation> => {
  const conversation = await database.conversation.create({
    data: {
      userId,
      title: input.title,
      agentIds: input.agentIds,
      metadata: input.metadata || {},
      projectId: input.projectId,
      participants: {},
      messages: {},
    },
  });
  return { ...conversation, messages: [] };
};

export const deleteConversation = async (
  conversationId: string,
  database: PrismaClient = db
): Promise<void> => {
  await database.conversation.delete({ where: { id: conversationId } });
};

export const addMessageToConversation = async (
  conversationId: string,
  message: {
    role: 'user' | 'assistant';
    content: string;
    speaker: string;
    timestamp: number;
    agentId?: string;
  },
  database: PrismaClient = db
): Promise<Message> => {
  const { timestamp, ...messageData } = message;
  return database.message.create({
    data: {
      conversationId,
      ...messageData,
      createdAt: new Date(timestamp),
    },
  });
};

export const getMessagesFromConversation = async (
  conversationId: string,
  options: { limit?: number; offset?: number },
  database: PrismaClient = db
): Promise<Message[]> => {
  return database.message.findMany({
    where: { conversationId },
    take: options.limit,
    skip: options.offset,
    orderBy: { createdAt: 'asc' },
  });
};

export interface ConversationRepository {
  findById: (conversationId: string) => Promise<Conversation | null>;
  list: (
    filters: ConversationFilters,
    page: number,
    limit: number
  ) => Promise<ConversationListResponse>;
  create: (input: CreateConversationInput) => Promise<Conversation>;
  delete: (userId: string, conversationId: string) => Promise<void>;
  addMessage: (conversationId: string, message: any) => Promise<Message>;
  count: (userId: string) => Promise<number>;
  getMessages: (
    conversationId: string,
    query: GetMessagesQuery
  ) => Promise<Message[]>;
}

const createRepository = (
  database: PrismaClient = db
): ConversationRepository => ({
  findById: (conversationId: string) =>
    findConversationById(conversationId, database),

  list: async (
    filters: ConversationFilters,
    page: number = 1,
    limit: number = 20
  ) => {
    const query: ConversationListQuery = {
      page,
      limit,
      agentId: filters.agentId,
      startDate: filters.startDate?.toISOString(),
      endDate: filters.endDate?.toISOString(),
      search: filters.search,
    };

    const [conversations, total] = await findConversationsByUserId(
      filters.userId,
      query,
      database
    );

    return {
      conversations,
      total,
      page,
      limit,
    };
  },

  create: (input: CreateConversationInput) =>
    createConversation(input.userId, input, database),

  delete: async (userId: string, conversationId: string) => {
    const conversation = await database.conversation.findFirst({
      where: {
        id: conversationId,
        userId: userId,
      },
    });

    if (!conversation) {
      throw new Error('Conversation not found or access denied');
    }

    return deleteConversation(conversationId, database);
  },

  addMessage: (conversationId: string, message: any) =>
    addMessageToConversation(conversationId, message, database),

  count: (userId: string) => database.conversation.count({ where: { userId } }),

  getMessages: (conversationId: string, query: GetMessagesQuery) =>
    getMessagesFromConversation(conversationId, query, database),
});

export const conversationRepository = createRepository();
