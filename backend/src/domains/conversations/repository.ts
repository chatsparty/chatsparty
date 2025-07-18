import { PrismaClient } from '@prisma/client';
import { db } from '../../config/database';
import {
  Conversation,
  ConversationListQuery,
  CreateConversationInput,
  Message,
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
  return database.message.create({
    data: {
      conversationId,
      ...message,
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
