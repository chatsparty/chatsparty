import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import * as connectionService from './connection.service';
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

const connectionRoutes: FastifyPluginAsync = async fastify => {
  fastify.post(
    '/',
    {
      schema: createConnectionSchema,
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

  fastify.get(
    '/',
    {
      schema: listConnectionsSchema,
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

      if (result.data) {
        return reply.send({
          success: true,
          data: result.data.connections,
        });
      }
    }
  );

  fastify.get(
    '/:id',
    {
      schema: getConnectionSchema,
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

  fastify.patch(
    '/:id',
    {
      schema: updateConnectionSchema,
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

  fastify.delete(
    '/:id',
    {
      schema: deleteConnectionSchema,
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

  fastify.post(
    '/test',
    {
      schema: testConnectionSchema,
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

  fastify.post(
    '/default',
    {
      schema: setDefaultConnectionSchema,
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

  fastify.get(
    '/default/:provider',
    {
      schema: getDefaultConnectionSchema,
    },
    async (
      request: FastifyRequest<{ Params: { provider: string } }>,
      reply
    ) => {
      // This needs to be refactored to use the new fallback logic
      const result = await connectionService.getConnectionWithFallback(
        request.user!.userId,
        'default'
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

  fastify.get(
    '/providers/:provider',
    {
      schema: getProviderInfoSchema,
    },
    async (
      request: FastifyRequest<{ Params: { provider: string } }>,
      reply
    ) => {
      // This logic needs to be moved to a domain helper
      const providerInfo = {};

      return reply.send(providerInfo);
    }
  );

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
      ].map(provider => {});

      return reply.send(providers);
    }
  );

  fastify.get(
    '/providers/:provider/models',
    {
      schema: getProviderModelsSchema,
    },
    async (
      request: FastifyRequest<{ Params: { provider: string } }>,
      reply
    ) => {
      // This logic needs to be moved to a domain helper
      const models: any[] = [];

      return reply.send(models);
    }
  );
};

export default connectionRoutes;
