import { FastifyPluginAsync } from 'fastify';
import { authenticate } from '../middleware/auth';
import { ConnectionService } from '../services/connections/connection.service';
// Note: Schema validation imports removed as they are not used in route handlers
// import {
//   createConnectionSchema,
//   updateConnectionSchema,
//   testConnectionSchema,
//   connectionIdSchema,
//   setDefaultSchema,
//   connectionQuerySchema,
//   paginationSchema,
// } from '../services/connections/connection.validation';
import { AIProvider } from '../services/connections/connection.types';

// Connection routes plugin
const connectionRoutes: FastifyPluginAsync = async (fastify) => {
  const connectionService = new ConnectionService();

  // Create a new connection
  fastify.post(
    '/',
    {
      schema: {
        description: 'Create a new AI connection',
        tags: ['Connections'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['name', 'provider'],
          properties: {
            name: { type: 'string' },
            provider: { type: 'string', enum: ['openai', 'anthropic', 'vertex_ai'] },
            config: { type: 'object' },
            isDefault: { type: 'boolean' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              provider: { type: 'string' },
              createdAt: { type: 'string' },
              updatedAt: { type: 'string' },
            },
          },
        },
      },
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const result = await connectionService.createConnection(
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

  // List connections
  fastify.get(
    '/',
    {
      schema: {
        description: 'List user connections',
        tags: ['Connections'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'integer', minimum: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100 },
            provider: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    provider: { type: 'string' },
                    isDefault: { type: 'boolean' },
                    createdAt: { type: 'string' },
                    updatedAt: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const result = await connectionService.listConnections(
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

  // Get a specific connection
  fastify.get(
    '/:id',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const result = await connectionService.getConnectionById(
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

  // Update a connection
  fastify.patch(
    '/:id',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const result = await connectionService.updateConnection(
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

  // Delete a connection
  fastify.delete(
    '/:id',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const result = await connectionService.deleteConnection(
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

  // Test a connection
  fastify.post(
    '/test',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const result = await connectionService.testConnection(request.body);

      if (!result.success) {
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: result.error,
        });
      }

      return reply.send(result.data);
    }
  );

  // Set default connection
  fastify.post(
    '/default',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const result = await connectionService.setDefaultConnection(
        request.user!.userId,
        request.body.connectionId
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

  // Get default connection for a provider
  fastify.get(
    '/default/:provider',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const result = await connectionService.getDefaultConnection(
        request.user!.userId,
        request.params.provider as AIProvider
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

  // Get provider information
  fastify.get(
    '/providers/:provider',
    async (request, reply) => {
      const providerInfo = connectionService.getProviderInfo(
        request.params.provider as AIProvider
      );

      return reply.send(providerInfo);
    }
  );

  // Get available providers
  fastify.get('/providers', async (request, reply) => {
    const providers = ['openai', 'anthropic', 'google', 'groq', 'ollama', 'vertex_ai'].map(
      (provider) => connectionService.getProviderInfo(provider as AIProvider)
    );

    return reply.send(providers);
  });

  // Get models for a provider
  fastify.get(
    '/providers/:provider/models',
    async (request, reply) => {
      const models = connectionService.getProviderModels(
        request.params.provider as AIProvider
      );

      return reply.send(models);
    }
  );
};

export default connectionRoutes;