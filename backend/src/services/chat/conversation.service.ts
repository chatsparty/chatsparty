import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../config/database';
import {
  Conversation,
  ConversationFilters,
  ConversationListResponse,
  ServiceResponse,
} from './chat.types';
import { Message } from '../ai/types';

export class ConversationService {
  private db: PrismaClient;

  constructor(database?: PrismaClient) {
    this.db = database || db;
  }

  /**
   * Create a new conversation
   */
  async createConversation(
    userId: string,
    title: string,
    agentIds: string[],
    metadata?: Record<string, any>
  ): Promise<ServiceResponse<Conversation>> {
    try {
      const conversationId = uuidv4();
      
      // Create conversation in database
      const conversation = await this.db.conversation.create({
        data: {
          id: conversationId,
          userId,
          title,
          agentIds,
          participants: [userId, ...agentIds], // Include participants as required by schema
          messages: [],
          metadata: metadata || {},
        },
      });

      return {
        success: true,
        data: {
          id: conversation.id,
          userId: conversation.userId,
          title: conversation.title,
          agentIds: conversation.agentIds,
          messages: conversation.messages as Message[],
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
          metadata: conversation.metadata as Record<string, any>,
        },
      };
    } catch (error) {
      console.error('Error creating conversation:', error);
      return {
        success: false,
        error: 'Failed to create conversation',
      };
    }
  }

  /**
   * Get a conversation by ID
   */
  async getConversation(
    userId: string,
    conversationId: string
  ): Promise<ServiceResponse<Conversation>> {
    try {
      const conversation = await this.db.conversation.findFirst({
        where: {
          id: conversationId,
          userId,
        },
      });

      if (!conversation) {
        return {
          success: false,
          error: 'Conversation not found',
        };
      }

      return {
        success: true,
        data: {
          id: conversation.id,
          userId: conversation.userId,
          title: conversation.title,
          agentIds: conversation.agentIds,
          messages: conversation.messages as Message[],
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
          metadata: conversation.metadata as Record<string, any>,
        },
      };
    } catch (error) {
      console.error('Error getting conversation:', error);
      return {
        success: false,
        error: 'Failed to get conversation',
      };
    }
  }

  /**
   * List conversations with filters
   */
  async listConversations(
    filters: ConversationFilters,
    page: number = 1,
    limit: number = 20
  ): Promise<ServiceResponse<ConversationListResponse>> {
    try {
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
          { messages: { path: '$[*].content', string_contains: filters.search } },
        ];
      }

      const [conversations, total] = await Promise.all([
        this.db.conversation.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { updatedAt: 'desc' },
        }),
        this.db.conversation.count({ where }),
      ]);

      return {
        success: true,
        data: {
          conversations: conversations.map(conv => ({
            id: conv.id,
            userId: conv.userId,
            title: conv.title,
            agentIds: conv.agentIds,
            messages: conv.messages as Message[],
            createdAt: conv.createdAt,
            updatedAt: conv.updatedAt,
            metadata: conv.metadata as Record<string, any>,
          })),
          total,
          page,
          limit,
        },
      };
    } catch (error) {
      console.error('Error listing conversations:', error);
      return {
        success: false,
        error: 'Failed to list conversations',
      };
    }
  }

  /**
   * Add a message to a conversation
   */
  async addMessage(
    conversationId: string,
    message: Message
  ): Promise<ServiceResponse<void>> {
    try {
      await this.db.conversation.update({
        where: { id: conversationId },
        data: {
          messages: {
            push: message,
          },
          updatedAt: new Date(),
        },
      });

      return { success: true };
    } catch (error) {
      console.error('Error adding message:', error);
      return {
        success: false,
        error: 'Failed to add message',
      };
    }
  }

  /**
   * Update conversation messages
   */
  async updateMessages(
    conversationId: string,
    messages: Message[]
  ): Promise<ServiceResponse<void>> {
    try {
      await this.db.conversation.update({
        where: { id: conversationId },
        data: {
          messages,
          updatedAt: new Date(),
        },
      });

      return { success: true };
    } catch (error) {
      console.error('Error updating messages:', error);
      return {
        success: false,
        error: 'Failed to update messages',
      };
    }
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(
    userId: string,
    conversationId: string
  ): Promise<ServiceResponse<void>> {
    try {
      const conversation = await this.db.conversation.findFirst({
        where: {
          id: conversationId,
          userId,
        },
      });

      if (!conversation) {
        return {
          success: false,
          error: 'Conversation not found',
        };
      }

      await this.db.conversation.delete({
        where: { id: conversationId },
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting conversation:', error);
      return {
        success: false,
        error: 'Failed to delete conversation',
      };
    }
  }

  /**
   * Update conversation title
   */
  async updateTitle(
    conversationId: string,
    title: string
  ): Promise<ServiceResponse<void>> {
    try {
      await this.db.conversation.update({
        where: { id: conversationId },
        data: {
          title,
          updatedAt: new Date(),
        },
      });

      return { success: true };
    } catch (error) {
      console.error('Error updating title:', error);
      return {
        success: false,
        error: 'Failed to update title',
      };
    }
  }

  /**
   * Get conversation count for a user
   */
  async getConversationCount(userId: string): Promise<ServiceResponse<number>> {
    try {
      const count = await this.db.conversation.count({
        where: { userId },
      });

      return {
        success: true,
        data: count,
      };
    } catch (error) {
      console.error('Error getting conversation count:', error);
      return {
        success: false,
        error: 'Failed to get conversation count',
      };
    }
  }
}

// Create singleton instance
export const conversationService = new ConversationService();