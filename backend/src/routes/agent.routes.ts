import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { AgentService } from '../services/agents';
// Note: Schema validation imports removed as they are not used in route handlers
// import { 
//   createAgentSchema,
//   updateAgentSchema,
//   deleteAgentSchema,
//   getAgentSchema,
//   listAgentsQuerySchema,
// } from '../services/agents/agent.validation';
import { 
  CreateAgentInput, 
  UpdateAgentInput,
  AgentFilters
} from '../services/agents/agent.types';

declare module 'fastify' {
  interface FastifyInstance {
    verifyJWT: any;
  }
}

export async function agentRoutes(fastify: FastifyInstance) {
  const prisma = new PrismaClient();
  const agentService = new AgentService(prisma);

  // Create a new agent
  fastify.post<{
    Body: CreateAgentInput;
  }>(
    '/agents',
    {
      schema: {
        description: 'Create a new agent',
        tags: ['Agents'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['name', 'characteristics'],
          properties: {
            name: { type: 'string' },
            characteristics: { type: 'string' },
            gender: { type: 'string' },
            connectionId: { type: 'string' },
            aiConfig: { type: 'object' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  characteristics: { type: 'string' },
                  createdAt: { type: 'string' },
                  updatedAt: { type: 'string' },
                },
              },
            },
          },
        },
      },
      preHandler: fastify.auth([fastify.verifyJWT]),
    },
    async (request: FastifyRequest<{ Body: CreateAgentInput }>, reply: FastifyReply) => {
      const userId = request.user!.userId;
      const result = await agentService.createAgent(userId, request.body);

      if (!result.success) {
        return reply.code(400).send(result);
      }

      return reply.send(result);
    }
  );

  // Get a specific agent
  fastify.get<{
    Params: { agentId: string };
  }>(
    '/agents/:agentId',
    {
      schema: {
        description: 'Get a specific agent by ID',
        tags: ['Agents'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            agentId: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  characteristics: { type: 'string' },
                  createdAt: { type: 'string' },
                  updatedAt: { type: 'string' },
                },
              },
            },
          },
        },
      },
      preHandler: fastify.auth([fastify.verifyJWT]),
    },
    async (request: FastifyRequest<{ Params: { agentId: string } }>, reply: FastifyReply) => {
      const userId = request.user!.userId;
      const { agentId } = request.params;
      const result = await agentService.getAgent(userId, agentId);

      if (!result.success) {
        return reply.code(404).send(result);
      }

      return reply.send(result);
    }
  );

  // List agents with filters
  fastify.get<{
    Querystring: {
      page?: number;
      limit?: number;
      name?: string;
      connectionId?: string;
      voiceEnabled?: string;
    };
  }>(
    '/agents',
    {
      schema: {
        description: 'List agents with optional filters',
        tags: ['Agents'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'integer', minimum: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100 },
            name: { type: 'string' },
            connectionId: { type: 'string' },
            voiceEnabled: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  agents: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        description: { type: 'string' },
                        createdAt: { type: 'string' },
                        updatedAt: { type: 'string' },
                      },
                    },
                  },
                  pagination: {
                    type: 'object',
                    properties: {
                      page: { type: 'integer' },
                      limit: { type: 'integer' },
                      total: { type: 'integer' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      preHandler: fastify.auth([fastify.verifyJWT]),
    },
    async (request: FastifyRequest<{ 
      Querystring: {
        page?: number;
        limit?: number;
        name?: string;
        connectionId?: string;
        voiceEnabled?: string;
      };
    }>, reply: FastifyReply) => {
      const userId = request.user!.userId;
      const { page = 1, limit = 20, name, connectionId, voiceEnabled } = request.query;

      const filters: AgentFilters = {
        userId,
        name,
        connectionId,
        voiceEnabled: voiceEnabled === 'true' ? true : voiceEnabled === 'false' ? false : undefined,
      };

      const result = await agentService.listAgents(filters, page, limit);

      if (!result.success) {
        return reply.code(500).send(result);
      }

      return reply.send(result);
    }
  );

  // Update an agent
  fastify.put<{
    Params: { agentId: string };
    Body: UpdateAgentInput;
  }>(
    '/agents/:agentId',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
    },
    async (request: FastifyRequest<{ 
      Params: { agentId: string };
      Body: UpdateAgentInput;
    }>, reply: FastifyReply) => {
      const userId = request.user!.userId;
      const { agentId } = request.params;
      const result = await agentService.updateAgent(userId, agentId, request.body);

      if (!result.success) {
        const statusCode = result.error === 'Agent not found' ? 404 : 400;
        return reply.code(statusCode).send(result);
      }

      return reply.send(result);
    }
  );

  // Delete an agent
  fastify.delete<{
    Params: { agentId: string };
  }>(
    '/agents/:agentId',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
    },
    async (request: FastifyRequest<{ Params: { agentId: string } }>, reply: FastifyReply) => {
      const userId = request.user!.userId;
      const { agentId } = request.params;
      const result = await agentService.deleteAgent(userId, agentId);

      if (!result.success) {
        return reply.code(404).send(result);
      }

      return reply.send(result);
    }
  );

  // Get agents by connection
  fastify.get<{
    Params: { connectionId: string };
  }>(
    '/connections/:connectionId/agents',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
    },
    async (request: FastifyRequest<{ Params: { connectionId: string } }>, reply: FastifyReply) => {
      const userId = request.user!.userId;
      const { connectionId } = request.params;
      const result = await agentService.getAgentsByConnection(userId, connectionId);

      if (!result.success) {
        return reply.code(500).send(result);
      }

      return reply.send(result);
    }
  );

  // Duplicate an agent
  fastify.post<{
    Params: { agentId: string };
    Body: { name?: string };
  }>(
    '/agents/:agentId/duplicate',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
    },
    async (request: FastifyRequest<{
      Params: { agentId: string };
      Body: { name?: string };
    }>, reply: FastifyReply) => {
      const userId = request.user!.userId;
      const { agentId } = request.params;
      const { name } = request.body;
      const result = await agentService.duplicateAgent(userId, agentId, name);

      if (!result.success) {
        const statusCode = result.error === 'Agent not found' ? 404 : 400;
        return reply.code(statusCode).send(result);
      }

      return reply.send(result);
    }
  );
}