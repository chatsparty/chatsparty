import { FastifyInstance } from 'fastify';
import { agentService } from './agent.service';
import { authMiddlewares } from '../../middleware/auth-middleware';
import {
  CreateAgentInput,
  UpdateAgentInput,
  AgentFilters,
} from './agent.types';
import { agentSchemas } from './agent.schemas';

export async function agentRoutes(fastify: FastifyInstance) {
  await authMiddlewares.requireAuth(fastify);

  fastify.post(
    '/agents',
    { schema: agentSchemas.createAgent },
    async (request, reply) => {
      const userId = request.user!.userId;
      const agent = await agentService.createAgent(userId, request.body as CreateAgentInput);
      reply.code(201).send(agent);
    }
  );

  fastify.get(
    '/agents/:agentId',
    { schema: agentSchemas.getAgent },
    async (request, reply) => {
      const userId = request.user!.userId;
      const { agentId } = request.params as { agentId: string };
      const agent = await agentService.getAgent(userId, agentId);
      reply.send(agent);
    }
  );

  fastify.get(
    '/agents',
    { schema: agentSchemas.listAgents },
    async (request, reply) => {
      const userId = request.user!.userId;
      const { page, limit, ...filters } = request.query as { page: number; limit: number } & Omit<AgentFilters, 'userId'>;
      const result = await agentService.listAgents({ userId, ...filters }, page, limit);
      reply.send(result);
    }
  );

  fastify.put(
    '/agents/:agentId',
    { schema: agentSchemas.updateAgent },
    async (request, reply) => {
      const userId = request.user!.userId;
      const { agentId } = request.params as { agentId: string };
      const agent = await agentService.updateAgent(userId, agentId, request.body as UpdateAgentInput);
      reply.send(agent);
    }
  );

  fastify.delete(
    '/agents/:agentId',
    { schema: agentSchemas.deleteAgent },
    async (request, reply) => {
      const userId = request.user!.userId;
      const { agentId } = request.params as { agentId: string };
      await agentService.deleteAgent(userId, agentId);
      reply.code(204).send();
    }
  );

}
