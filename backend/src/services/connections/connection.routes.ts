import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { authenticate } from '../../middleware/auth';
import { ConnectionService } from './connection.service';
import {
  createConnectionSchema,
  listConnectionsSchema,
  getConnectionSchema,
  updateConnectionSchema,
  deleteConnectionSchema,
  testConnectionSchema,
  setDefaultConnectionSchema,
  getDefaultConnectionSchema,
  getProviderInfoSchema,
  getProvidersSchema,
  getProviderModelsSchema,
} from './connection.schemas';
import {
  AIProvider,
  CreateConnectionRequest,
  UpdateConnectionRequest,
  TestConnectionRequest,
  ConnectionQueryOptions,
  PaginationOptions,
} from './connection.types';

// Connection routes plugin
const connectionRoutes: FastifyPluginAsync = async fastify => {
  const connectionService = new ConnectionService();

  // Create a new connection
  fastify.post(
    '/',
    {
      schema: createConnectionSchema,
      preHandler: [authenticate],
    },
    async (
      request: FastifyRequest<{ Body: CreateConnectionRequest }>,
      reply
    ) => {
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
      schema: listConnectionsSchema,
      preHandler: [authenticate],
    },
    async (
      request: FastifyRequest<{
        Querystring: ConnectionQueryOptions & PaginationOptions;
      }>,
      reply
    ) => {
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
      schema: getConnectionSchema,
      preHandler: [authenticate],
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
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
      schema: updateConnectionSchema,
      preHandler: [authenticate],
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: UpdateConnectionRequest;
      }>,
      reply
    ) => {
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
      schema: deleteConnectionSchema,
      preHandler: [authenticate],
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
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
      schema: testConnectionSchema,
      preHandler: [authenticate],
    },
    async (request: FastifyRequest<{ Body: TestConnectionRequest }>, reply) => {
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
      schema: setDefaultConnectionSchema,
      preHandler: [authenticate],
    },
    async (
      request: FastifyRequest<{ Body: { connectionId: string } }>,
      reply
    ) => {
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
      schema: getDefaultConnectionSchema,
      preHandler: [authenticate],
    },
    async (
      request: FastifyRequest<{ Params: { provider: string } }>,
      reply
    ) => {
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
    {
      schema: getProviderInfoSchema,
    },
    async (
      request: FastifyRequest<{ Params: { provider: string } }>,
      reply
    ) => {
      const providerInfo = connectionService.getProviderInfo(
        request.params.provider as AIProvider
      );

      return reply.send(providerInfo);
    }
  );

  // Get available providers
  fastify.get(
    '/providers',
    {
      schema: getProvidersSchema,
    },
    async (_request, reply) => {
      const providers = [
        'openai',
        'anthropic',
        'google',
        'groq',
        'ollama',
        'vertex_ai',
      ].map(provider =>
        connectionService.getProviderInfo(provider as AIProvider)
      );

      return reply.send(providers);
    }
  );

  // Get models for a provider
  fastify.get(
    '/providers/:provider/models',
    {
      schema: getProviderModelsSchema,
    },
    async (
      request: FastifyRequest<{ Params: { provider: string } }>,
      reply
    ) => {
      const models = connectionService.getProviderModels(
        request.params.provider as AIProvider
      );

      return reply.send(models);
    }
  );
};

export default connectionRoutes;
