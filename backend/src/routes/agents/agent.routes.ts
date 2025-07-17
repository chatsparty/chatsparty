import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import {
  createAgentSchema,
  listAgentsSchema,
  getAgentSchema,
  updateAgentSchema,
  deleteAgentSchema,
} from './agent.schemas';
import {
  CreateAgentRequest,
  UpdateAgentRequest,
  AgentQueryOptions,
  PaginationOptions,
} from '../../domains/agents/types';
import * as agentManager from '../../domains/agents/orchestration/agent.manager';

const agentRoutes: FastifyPluginAsync = async fastify => {
  fastify.post(
    '/',
    {
      schema: createAgentSchema,
    },
    async (request: FastifyRequest<{ Body: CreateAgentRequest }>, reply) => {
      const result = await agentManager.createAgent(
        request.user!.userId,
        request.body
      );

      if (!result.success) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: result.error,
        });
      }

      return reply.status(201).send(result.data);
    }
  );

  fastify.get(
    '/',
    {
      schema: listAgentsSchema,
    },
    async (
      request: FastifyRequest<{
        Querystring: AgentQueryOptions & PaginationOptions;
      }>,
      reply
    ) => {
      const result = await agentManager.listAgents(
        request.user!.userId,
        request.query
      );

      if (!result.success) {
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: result.error,
        });
      }

      return reply.send(result.data);
    }
  );

  fastify.get(
    '/:id',
    {
      schema: getAgentSchema,
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
      const result = await agentManager.getAgentById(
        request.user!.userId,
        request.params.id
      );

      if (!result.success) {
        return reply.status(404).send({
          error: 'Not Found',
          message: result.error,
        });
      }

      return reply.send(result.data);
    }
  );

  fastify.patch(
    '/:id',
    {
      schema: updateAgentSchema,
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: UpdateAgentRequest;
      }>,
      reply
    ) => {
      const result = await agentManager.updateAgent(
        request.user!.userId,
        request.params.id,
        request.body
      );

      if (!result.success) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: result.error,
        });
      }

      return reply.send(result.data);
    }
  );

  fastify.delete(
    '/:id',
    {
      schema: deleteAgentSchema,
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
      const result = await agentManager.deleteAgent(
        request.user!.userId,
        request.params.id
      );

      if (!result.success) {
        return reply.status(404).send({
          error: 'Not Found',
          message: result.error,
        });
      }

      return reply.status(204).send();
    }
  );
};

export default agentRoutes;
