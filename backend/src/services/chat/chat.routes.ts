import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { ChatOrchestrationService } from './chat-orchestration.service';
import { AgentService } from '../agents/agent.service';
import { CreditService } from '../credit/credit.service';
import { ModelPricingService } from '../credit/model-pricing.service';
import { ConversationService } from '../conversation/conversation.service';
import { ChatSessionService } from './chat-session.service';
import { SystemDefaultConnectionService } from '../connections/system-default-connection.service';
import {
  ChatRequestInput,
  MultiAgentChatRequestInput,
  chatRequestJsonSchema,
} from './chat.validation';
import { StreamEvent } from './chat.types';
import { handleStreamingResponse } from '../../utils/sse.handler';

export async function chatRoutes(fastify: FastifyInstance) {
  const prisma = new PrismaClient();
  const agentService = new AgentService(
    prisma,
    new SystemDefaultConnectionService()
  );
  const creditService = new CreditService(prisma);
  const modelPricingService = new ModelPricingService(prisma);
  const conversationService = new ConversationService(prisma);
  const chatSessionService = new ChatSessionService();
  const chatOrchestrationService = new ChatOrchestrationService(
    agentService,
    creditService,
    modelPricingService,
    conversationService,
    chatSessionService
  );

  fastify.post<{
    Body: ChatRequestInput;
  }>(
    '/chat',
    {
      schema: chatRequestJsonSchema,
    },
    async (
      request: FastifyRequest<{ Body: ChatRequestInput }>,
      reply: FastifyReply
    ) => {
      const userId = request.user!.userId;
      const result = await chatOrchestrationService.chat(userId, request.body);

      if (!result.success) {
        return reply.code(400).send(result);
      }

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

  fastify.post<{
    Body: MultiAgentChatRequestInput;
  }>(
    '/chat/multi-agent',
    {},
    async (
      request: FastifyRequest<{ Body: MultiAgentChatRequestInput }>,
      reply: FastifyReply
    ) => {
      const userId = request.user!.userId;
      const result = await chatOrchestrationService.multiAgentChat(
        userId,
        request.body
      );

      if (!result.success) {
        return reply.code(400).send(result);
      }

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

  fastify.get(
    '/chat/sessions',
    {},
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.userId;
      const result = await chatOrchestrationService.getActiveSessions(userId);

      if (!result.success) {
        return reply.code(500).send(result);
      }

      return reply.send(result);
    }
  );

  fastify.post<{
    Params: { conversationId: string };
  }>(
    '/chat/sessions/:conversationId/end',
    {},
    async (
      request: FastifyRequest<{ Params: { conversationId: string } }>,
      reply: FastifyReply
    ) => {
      const userId = request.user!.userId;
      const { conversationId } = request.params;
      const result = await chatOrchestrationService.endSession(
        userId,
        conversationId
      );

      if (!result.success) {
        return reply.code(404).send(result);
      }

      return reply.send(result);
    }
  );
}
