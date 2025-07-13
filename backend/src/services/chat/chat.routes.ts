import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { ChatService, ConversationService } from './index';
import {
  ChatRequestInput,
  MultiAgentChatRequestInput,
  ConversationListQuery,
  AddMessageInput,
  GetMessagesQuery,
  CreateConversationInput,
  chatRequestJsonSchema,
} from './chat.validation';
import { ConversationFilters, StreamEvent } from './chat.types';

declare module 'fastify' {
  interface FastifyInstance {
    verifyJWT: any;
  }
}

export async function chatRoutes(fastify: FastifyInstance) {
  const prisma = new PrismaClient();
  const chatService = new ChatService(prisma);
  const conversationService = new ConversationService(prisma);

  // Single agent chat
  fastify.post<{
    Body: ChatRequestInput;
  }>(
    '/chat',
    {
      schema: chatRequestJsonSchema,
      preHandler: fastify.auth([fastify.verifyJWT]),
    },
    async (
      request: FastifyRequest<{ Body: ChatRequestInput }>,
      reply: FastifyReply
    ) => {
      const userId = request.user!.userId;
      const result = await chatService.chat(userId, request.body);

      if (!result.success) {
        return reply.code(400).send(result);
      }

      // Handle streaming response
      if (
        request.body.stream &&
        result.data &&
        typeof result.data === 'object' &&
        Symbol.asyncIterator in result.data
      ) {
        reply.raw.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        });

        try {
          for await (const event of result.data as AsyncGenerator<StreamEvent>) {
            reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
          }
        } catch (error) {
          console.error('Streaming error:', error);
        } finally {
          reply.raw.end();
        }

        return;
      }

      return reply.send(result);
    }
  );

  // Multi-agent chat
  fastify.post<{
    Body: MultiAgentChatRequestInput;
  }>(
    '/chat/multi-agent',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
    },
    async (
      request: FastifyRequest<{ Body: MultiAgentChatRequestInput }>,
      reply: FastifyReply
    ) => {
      const userId = request.user!.userId;
      const result = await chatService.multiAgentChat(userId, request.body);

      if (!result.success) {
        return reply.code(400).send(result);
      }

      // Handle streaming response
      if (
        request.body.stream &&
        result.data &&
        typeof result.data === 'object' &&
        Symbol.asyncIterator in result.data
      ) {
        reply.raw.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        });

        try {
          for await (const event of result.data as AsyncGenerator<StreamEvent>) {
            reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
          }
        } catch (error) {
          console.error('Streaming error:', error);
        } finally {
          reply.raw.end();
        }

        return;
      }

      return reply.send(result);
    }
  );

  // Create a new shared conversation
  fastify.post<{
    Body: CreateConversationInput;
  }>(
    '/conversations',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
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
      preHandler: fastify.auth([fastify.verifyJWT]),
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
      preHandler: fastify.auth([fastify.verifyJWT]),
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
      preHandler: fastify.auth([fastify.verifyJWT]),
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
      preHandler: fastify.auth([fastify.verifyJWT]),
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
      preHandler: fastify.auth([fastify.verifyJWT]),
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

  // Get active chat sessions
  fastify.get(
    '/chat/sessions',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.userId;
      const result = await chatService.getActiveSessions(userId);

      if (!result.success) {
        return reply.code(500).send(result);
      }

      return reply.send(result);
    }
  );

  // End a chat session
  fastify.post<{
    Params: { conversationId: string };
  }>(
    '/chat/sessions/:conversationId/end',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
    },
    async (
      request: FastifyRequest<{ Params: { conversationId: string } }>,
      reply: FastifyReply
    ) => {
      const userId = request.user!.userId;
      const { conversationId } = request.params;
      const result = await chatService.endSession(userId, conversationId);

      if (!result.success) {
        return reply.code(404).send(result);
      }

      return reply.send(result);
    }
  );

  // Get conversation count
  fastify.get(
    '/conversations/count',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
    },
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
