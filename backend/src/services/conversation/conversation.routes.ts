import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { ConversationService } from './conversation.service';
import {
  ConversationListQuery,
  AddMessageInput,
  GetMessagesQuery,
  CreateConversationInput,
  conversationSchemas,
} from './conversation.validation';
import { ConversationFilters } from './conversation.types';

import { authMiddlewares } from '../../middleware/auth-middleware';

export async function conversationRoutes(fastify: FastifyInstance) {

  const prisma = new PrismaClient();
  const conversationService = new ConversationService(prisma);

  // Create a new shared conversation
  fastify.post<{
    Body: CreateConversationInput;
  }>(
    '/conversations',
    {
      schema: conversationSchemas.createConversation,
    },
    async (
      request: FastifyRequest<{ Body: CreateConversationInput }>,
      reply: FastifyReply
    ) => {
      const userId = request.user!.userId;
      const { title, agentIds, metadata } = request.body;

      const result = await conversationService.createConversation(
        userId,
        title,
        agentIds,
        metadata
      );

      if (!result.success) {
        return reply.code(400).send(result);
      }

      return reply.code(201).send(result);
    }
  );

  // Get a specific conversation
  fastify.get<{
    Params: { conversationId: string };
  }>(
    '/conversations/:conversationId',
    {
      schema: conversationSchemas.getConversation,
    },
    async (
      request: FastifyRequest<{ Params: { conversationId: string } }>,
      reply: FastifyReply
    ) => {
      const userId = request.user!.userId;
      const { conversationId } = request.params;
      const result = await conversationService.getConversation(
        userId,
        conversationId
      );

      if (!result.success) {
        return reply.code(404).send(result);
      }

      return reply.send(result);
    }
  );

  // List conversations
  fastify.get<{
    Querystring: ConversationListQuery;
  }>(
    '/conversations',
    {
      schema: conversationSchemas.listConversations,
    },
    async (
      request: FastifyRequest<{ Querystring: ConversationListQuery }>,
      reply: FastifyReply
    ) => {
      const userId = request.user!.userId;
      const { page, limit, agentId, startDate, endDate, search } =
        request.query;

      const filters: ConversationFilters = {
        userId,
        agentId,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        search,
      };

      const result = await conversationService.listConversations(
        filters,
        page,
        limit
      );

      if (!result.success) {
        return reply.code(500).send(result);
      }

      return reply.send(result);
    }
  );

  // Delete a conversation
  fastify.delete<{
    Params: { conversationId: string };
  }>(
    '/conversations/:conversationId',
    {
      schema: conversationSchemas.deleteConversation,
    },
    async (
      request: FastifyRequest<{ Params: { conversationId: string } }>,
      reply: FastifyReply
    ) => {
      const userId = request.user!.userId;
      const { conversationId } = request.params;
      const result = await conversationService.deleteConversation(
        userId,
        conversationId
      );

      if (!result.success) {
        return reply.code(404).send(result);
      }

      return reply.send(result);
    }
  );

  // Add a message to a conversation
  fastify.post<{
    Params: { conversationId: string };
    Body: AddMessageInput;
  }>(
    '/conversations/:conversationId/messages',
    {
      schema: conversationSchemas.addMessage,
    },
    async (
      request: FastifyRequest<{
        Params: { conversationId: string };
        Body: AddMessageInput;
      }>,
      reply: FastifyReply
    ) => {
      const userId = request.user!.userId;
      const { conversationId } = request.params;
      const { message, role, agentId } = request.body;

      // Verify conversation belongs to user
      const convResult = await conversationService.getConversation(
        userId,
        conversationId
      );
      if (!convResult.success) {
        return reply.code(404).send({
          success: false,
          error: 'Conversation not found',
        });
      }

      const messageObj = {
        role,
        content: message,
        agentId,
        timestamp: Date.now(),
      };

      const result = await conversationService.addMessage(
        conversationId,
        messageObj
      );

      if (!result.success) {
        return reply.code(400).send(result);
      }

      return reply.send(result);
    }
  );

  // Get messages from a conversation
  fastify.get<{
    Params: { conversationId: string };
    Querystring: GetMessagesQuery;
  }>(
    '/conversations/:conversationId/messages',
    {
      schema: conversationSchemas.getMessages,
    },
    async (
      request: FastifyRequest<{
        Params: { conversationId: string };
        Querystring: GetMessagesQuery;
      }>,
      reply: FastifyReply
    ) => {
      const userId = request.user!.userId;
      const { conversationId } = request.params;
      const { limit, offset } = request.query;

      const result = await conversationService.getConversation(
        userId,
        conversationId
      );

      if (!result.success) {
        return reply.code(404).send(result);
      }

      const messages = result.data!.messages.slice(offset, offset + limit);

      return reply.send({
        success: true,
        data: {
          messages,
          total: result.data!.messages.length,
        },
      });
    }
  );

  // Get conversation count
  fastify.get(
    '/conversations/count',
    {},
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.userId;
      const result = await conversationService.getConversationCount(userId);

      if (!result.success) {
        return reply.code(500).send(result);
      }

      return reply.send(result);
    }
  );
}