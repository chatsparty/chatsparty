import { conversationRepository, ConversationRepository } from '../repository';
import {
  Conversation,
  ConversationFilters,
  ConversationListResponse,
  CreateConversationData,
} from '../types';
import { ServiceResponse } from '../../../types/service.types';
import { Message } from '../../ai/types';

export class ConversationManager {
  private repository: ConversationRepository;

  constructor(repository: ConversationRepository = conversationRepository) {
    this.repository = repository;
  }

  async createConversation(
    data: CreateConversationData
  ): Promise<ServiceResponse<Conversation>> {
    try {
      const conversation = await this.repository.create(data);
      return { success: true, data: conversation };
    } catch (error) {
      console.error('Error creating conversation:', error);
      return {
        success: false,
        error: 'Failed to create conversation',
      };
    }
  }

  async getConversation(
    userId: string,
    conversationId: string
  ): Promise<ServiceResponse<Conversation>> {
    try {
      const conversation = await this.repository.findById(
        userId,
        conversationId
      );
      if (!conversation) {
        return {
          success: false,
          error: 'Conversation not found',
        };
      }
      return { success: true, data: conversation };
    } catch (error) {
      console.error('Error getting conversation:', error);
      return {
        success: false,
        error: 'Failed to get conversation',
      };
    }
  }

  async listConversations(
    filters: ConversationFilters,
    page: number,
    limit: number
  ): Promise<ServiceResponse<ConversationListResponse>> {
    try {
      const result = await this.repository.list(filters, page, limit);
      return { success: true, data: result };
    } catch (error) {
      console.error('Error listing conversations:', error);
      return {
        success: false,
        error: 'Failed to list conversations',
      };
    }
  }

  async addMessage(
    conversationId: string,
    message: Message
  ): Promise<ServiceResponse<void>> {
    try {
      await this.repository.addMessage(conversationId, message);
      return { success: true };
    } catch (error) {
      console.error('Error adding message:', error);
      return {
        success: false,
        error: 'Failed to add message',
      };
    }
  }

  async deleteConversation(
    userId: string,
    conversationId: string
  ): Promise<ServiceResponse<void>> {
    try {
      await this.repository.delete(userId, conversationId);
      return { success: true };
    } catch (error) {
      console.error('Error deleting conversation:', error);
      return {
        success: false,
        error: 'Failed to delete conversation',
      };
    }
  }

  async getConversationCount(userId: string): Promise<ServiceResponse<number>> {
    try {
      const count = await this.repository.count(userId);
      return { success: true, data: count };
    } catch (error) {
      console.error('Error getting conversation count:', error);
      return {
        success: false,
        error: 'Failed to get conversation count',
      };
    }
  }
}

export const conversationManager = new ConversationManager();
