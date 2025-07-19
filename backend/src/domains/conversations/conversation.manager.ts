import {
  conversationRepository,
  type ConversationRepository,
} from './conversation.repository';
import {
  Conversation,
  ConversationFilters,
  ConversationListResponse,
  CreateConversationData,
  GetMessagesQuery,
  Message,
} from './types';
import { ServiceResponse } from '../../types/service.types';
import { Message as AIMessage } from '../multiagent/core/types';

export const createConversation = async (
  data: CreateConversationData,
  repository: ConversationRepository = conversationRepository
): Promise<ServiceResponse<Conversation>> => {
  try {
    const conversation = await repository.create({
      ...data,
      metadata: data.metadata || {},
    });
    return { success: true, data: conversation };
  } catch (error) {
    console.error('Error creating conversation:', error);
    return {
      success: false,
      error: 'Failed to create conversation',
    };
  }
};

export const getConversation = async (
  userId: string,
  conversationId: string,
  repository: ConversationRepository = conversationRepository
): Promise<ServiceResponse<Conversation>> => {
  try {
    const conversation = await repository.findById(conversationId);
    if (!conversation) {
      return {
        success: false,
        error: 'Conversation not found',
      };
    }
    // Verify user has access to this conversation
    if (conversation.userId !== userId) {
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
};

export const listConversations = async (
  filters: ConversationFilters,
  page: number,
  limit: number,
  repository: ConversationRepository = conversationRepository
): Promise<ServiceResponse<ConversationListResponse>> => {
  try {
    const result = await repository.list(filters, page, limit);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error listing conversations:', error);
    return {
      success: false,
      error: 'Failed to list conversations',
    };
  }
};

export const addMessage = async (
  conversationId: string,
  message: AIMessage,
  repository: ConversationRepository = conversationRepository
): Promise<ServiceResponse<void>> => {
  try {
    await repository.addMessage(conversationId, message);
    return { success: true };
  } catch (error) {
    console.error('Error adding message:', error);
    return {
      success: false,
      error: 'Failed to add message',
    };
  }
};

export const deleteConversation = async (
  userId: string,
  conversationId: string,
  repository: ConversationRepository = conversationRepository
): Promise<ServiceResponse<void>> => {
  try {
    await repository.delete(userId, conversationId);
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting conversation:', error);
    if (error.message === 'Conversation not found or access denied') {
      return {
        success: false,
        error: 'Conversation not found',
      };
    }
    return {
      success: false,
      error: 'Failed to delete conversation',
    };
  }
};

export const getConversationCount = async (
  userId: string,
  repository: ConversationRepository = conversationRepository
): Promise<ServiceResponse<number>> => {
  try {
    const count = await repository.count(userId);
    return { success: true, data: count };
  } catch (error) {
    console.error('Error getting conversation count:', error);
    return {
      success: false,
      error: 'Failed to get conversation count',
    };
  }
};

export const getMessages = async (
  conversationId: string,
  query: GetMessagesQuery,
  repository: ConversationRepository = conversationRepository
): Promise<ServiceResponse<Message[]>> => {
  try {
    const messages = await repository.getMessages(conversationId, query);
    return { success: true, data: messages };
  } catch (error) {
    console.error('Error getting messages:', error);
    return { success: false, error: 'Failed to get messages' };
  }
};

export const conversationManager = {
  createConversation,
  getConversation,
  listConversations,
  addMessage,
  deleteConversation,
  getConversationCount,
  getMessages,
};
