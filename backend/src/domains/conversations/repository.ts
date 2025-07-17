import {
  PrismaClient,
  Conversation as PrismaConversation,
} from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../config/database';
import {
  Conversation,
  ConversationFilters,
  ConversationListResponse,
  CreateConversationData,
} from './types';
import { Message } from '../ai/types';

export class ConversationRepository {
  private db: PrismaClient;

  constructor(database?: PrismaClient) {
    this.db = database || db;
  }

  /**
   * Create a new conversation
   */
  async create(data: CreateConversationData): Promise<Conversation> {
    const conversationId = uuidv4();
    const conversation = await this.db.conversation.create({
      data: {
        id: conversationId,
        ...data,
        participants: [data.userId, ...data.agentIds],
        messages: [],
        metadata: data.metadata || {},
      },
    });
    return {
      ...conversation,
      messages: [],
      metadata: conversation.metadata as Record<string, any> | undefined,
    };
  }

  /**
   * Get a conversation by ID
   */
  async findById(
    userId: string,
    conversationId: string
  ): Promise<Conversation | null> {
    const conversation = await this.db.conversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
    });

    if (!conversation) {
      return null;
    }

    return {
      ...conversation,
      messages: conversation.messages as unknown as Message[],
      metadata: conversation.metadata as Record<string, any> | undefined,
    };
  }

  /**
   * List conversations with filters
   */
  async list(
    filters: ConversationFilters,
    page: number = 1,
    limit: number = 20
  ): Promise<ConversationListResponse> {
    const where: any = {
      userId: filters.userId,
    };

    if (filters.agentId) {
      where.agentIds = {
        has: filters.agentId,
      };
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        {
          messages: {
            path: '$[*].content',
            string_contains: filters.search,
          },
        },
      ];
    }

    const [conversationRecords, total] = await Promise.all([
      this.db.conversation.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
      this.db.conversation.count({ where }),
    ]);

    const conversations: Conversation[] = conversationRecords.map(
      (conv: PrismaConversation) => {
        return {
          ...(conv as any),
          messages: conv.messages as unknown as Message[],
          metadata: conv.metadata as unknown as Record<string, any> | undefined,
        };
      }
    );

    return {
      conversations,
      total,
      page,
      limit,
    };
  }

  /**
   * Add a message to a conversation
   */
  async addMessage(conversationId: string, message: Message): Promise<void> {
    const conversation = await this.db.conversation.findUnique({
      where: { id: conversationId },
      select: { messages: true },
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const currentMessages =
      (conversation.messages as unknown as Message[]) || [];
    const updatedMessages = [...currentMessages, message];

    await this.db.conversation.update({
      where: { id: conversationId },
      data: {
        messages: updatedMessages as any,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Update conversation messages
   */
  async updateMessages(
    conversationId: string,
    messages: Message[]
  ): Promise<void> {
    await this.db.conversation.update({
      where: { id: conversationId },
      data: {
        messages: messages as any,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Delete a conversation
   */
  async delete(userId: string, conversationId: string): Promise<void> {
    const conversation = await this.db.conversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    await this.db.conversation.delete({
      where: { id: conversationId },
    });
  }

  /**
   * Update conversation title
   */
  async updateTitle(conversationId: string, title: string): Promise<void> {
    await this.db.conversation.update({
      where: { id: conversationId },
      data: {
        title,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Get conversation count for a user
   */
  async count(userId: string): Promise<number> {
    return this.db.conversation.count({
      where: { userId },
    });
  }
}

export const conversationRepository = new ConversationRepository();
