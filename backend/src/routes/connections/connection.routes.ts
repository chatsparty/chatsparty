import { FastifyPluginAsync, FastifyRequest } from 'fastify';
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
  CreateConnectionRequest,
  UpdateConnectionRequest,
  TestConnectionRequest,
  ConnectionQueryOptions,
  PaginationOptions,
} from '../../domains/connections/types';
import * as connectionManager from '../../domains/connections/orchestration/connection.manager';
import * as fallbackHandler from '../../domains/connections/decision/fallback.handler';
import * as connectionTester from '../../domains/connections/providers/connection.tester';
import { PROVIDER_CONFIGS } from '../../domains/connections/providers/provider.info';

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
      const result = await connectionManager.createConnection(
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
      const result = await connectionManager.listConnections(
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
      const result = await connectionManager.getConnectionById(
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
      const result = await connectionManager.updateConnection(
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
      const result = await connectionManager.deleteConnection(
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
      const result = await connectionTester.testConnection(request.body);

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
      const result = await connectionManager.setDefaultConnection(
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
      const result = await fallbackHandler.getConnectionWithFallback(
        request.user!.userId,
        request.params.provider
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
      const providerInfo =
        PROVIDER_CONFIGS[
          request.params.provider as keyof typeof PROVIDER_CONFIGS
        ];
      if (!providerInfo) {
        return reply
          .status(404)
          .send({ error: 'Not Found', message: 'Provider not found' });
      }
      return reply.send(providerInfo);
    }
  );

  fastify.get(
    '/providers',
    {
      schema: getProvidersSchema,
    },
    async (_request, reply) => {
      return reply.send(Object.values(PROVIDER_CONFIGS));
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
      const providerInfo =
        PROVIDER_CONFIGS[
          request.params.provider as keyof typeof PROVIDER_CONFIGS
        ];
      if (!providerInfo) {
        return reply
          .status(404)
          .send({ error: 'Not Found', message: 'Provider not found' });
      }
      return reply.send(providerInfo.supportedModels);
    }
  );
};

export default connectionRoutes;
