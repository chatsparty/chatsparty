import {
  findConversationById,
  findConversationsByUserId,
  createConversation,
  deleteConversation,
  addMessageToConversation,
  getMessagesFromConversation,
} from '../repository';
import {
  Conversation,
  ConversationListQuery,
  CreateConversationInput,
  Message,
  AddMessageInput,
  GetMessagesQuery,
} from '../types';
import { ServiceResponse } from '../../user/types';

export const getConversation = async (
  userId: string,
  conversationId: string
): Promise<ServiceResponse<Conversation>> => {
  try {
    const conversation = await findConversationById(conversationId);
    if (!conversation || conversation.userId !== userId) {
      return { success: false, error: 'Conversation not found' };
    }
    return { success: true, data: conversation };
  } catch (error) {
    console.error('Error getting conversation:', error);
    return { success: false, error: 'Failed to get conversation' };
  }
};

export const listConversations = async (
  userId: string,
  query: ConversationListQuery
): Promise<
  ServiceResponse<{ conversations: Conversation[]; total: number }>
> => {
  try {
    const [conversations, total] = await findConversationsByUserId(
      userId,
      query
    );
    return { success: true, data: { conversations, total } };
  } catch (error) {
    console.error('Error listing conversations:', error);
    return { success: false, error: 'Failed to list conversations' };
  }
};

export const createConversationService = async (
  userId: string,
  input: CreateConversationInput
): Promise<ServiceResponse<Conversation>> => {
  try {
    const conversation = await createConversation(userId, input);
    return { success: true, data: conversation };
  } catch (error) {
    console.error('Error creating conversation:', error);
    return { success: false, error: 'Failed to create conversation' };
  }
};

export const deleteConversationService = async (
  userId: string,
  conversationId: string
): Promise<ServiceResponse<void>> => {
  try {
    const conversation = await findConversationById(conversationId);
    if (!conversation || conversation.userId !== userId) {
      return { success: false, error: 'Conversation not found' };
    }
    await deleteConversation(conversationId);
    return { success: true };
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return { success: false, error: 'Failed to delete conversation' };
  }
};

export const addMessage = async (
  conversationId: string,
  message: AddMessageInput & { speaker: string; timestamp: number }
): Promise<ServiceResponse<Message>> => {
  try {
    const createdMessage = await addMessageToConversation(conversationId, {
      ...message,
    });
    return { success: true, data: createdMessage };
  } catch (error) {
    console.error('Error adding message:', error);
    return { success: false, error: 'Failed to add message' };
  }
};

export const getMessages = async (
  conversationId: string,
  query: GetMessagesQuery
): Promise<ServiceResponse<Message[]>> => {
  try {
    const messages = await getMessagesFromConversation(conversationId, query);
    return { success: true, data: messages };
  } catch (error) {
    console.error('Error getting messages:', error);
    return { success: false, error: 'Failed to get messages' };
  }
};
