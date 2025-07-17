import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { aiService } from '../ai/ai.service';
import {
  ChatRequestInput,
  MultiAgentChatRequestInput,
  chatRequestJsonSchema,
} from './chat.validation';
import { StreamEvent } from './chat.types';
import { handleStreamingResponse } from '../../utils/sse.handler';

export async function chatRoutes(fastify: FastifyInstance) {
  fastify.post('/chat', async (request, reply) => {
    return reply.code(501).send({ error: 'Not Implemented' });
  });

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
      const { message, conversationId, ...rest } = request.body;
      const convId = conversationId || `conv_${Date.now()}`;

      const eventStream = aiService.streamMultiAgentConversation({
        userId,
        initialMessage: message,
        conversationId: convId,
        ...rest,
      });

      async function* transformStream(
        source: AsyncGenerator<import('../ai/ai.service').StreamEvent>
      ): AsyncGenerator<StreamEvent> {
        for await (const event of source) {
          if (event.type === 'thinking') continue;
          yield {
            type: event.type,
            timestamp: event.timestamp || Date.now(),
            data: {
              content: event.content,
              agentId: event.agentId,
              agentName: event.agentName,
              message: event.message,
            },
          };
        }
      }

      return handleStreamingResponse(reply, transformStream(eventStream));
    }
  );

  fastify.get(
    '/chat/sessions',
    {},
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.userId;
      const result = { success: true, data: [] };

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
      const result = { success: true, data: { message: 'Session ended' } };

      if (!result.success) {
        return reply.code(404).send(result);
      }

      return reply.send(result);
    }
  );
}
