import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { ChatService } from './index';
import { ConversationService } from '../conversation/conversation.service';
import { AgentService } from '../agents/agent.service';
import { ChatOrchestrationService } from './chat-orchestration.service';
import { ChatSessionService } from './chat-session.service';
import { DefaultConnectionService } from '../connections/default-connection.service';
import {
  ChatRequestInput,
  MultiAgentChatRequestInput,
  chatRequestJsonSchema,
} from './chat.validation';
import { StreamEvent } from './chat.types';
import { handleStreamingResponse } from '../../utils/sse.handler';

declare module 'fastify' {
  interface FastifyInstance {
    verifyJWT: any;
  }
}

export async function chatRoutes(fastify: FastifyInstance) {
  const prisma = new PrismaClient();
  const agentService = new AgentService(
    prisma,
    new DefaultConnectionService()
  );
  const conversationService = new ConversationService(prisma);
  const chatOrchestrationService = new ChatOrchestrationService(prisma);
  const chatSessionService = new ChatSessionService();
  const chatService = new ChatService(
    agentService,
    conversationService,
    chatOrchestrationService,
    chatSessionService
  );

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
        return handleStreamingResponse(
          reply,
          result.data as AsyncGenerator<StreamEvent>
        );
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
        return handleStreamingResponse(
          reply,
          result.data as AsyncGenerator<StreamEvent>
        );
      }

      return reply.send(result);
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
}
