import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { SystemDefaultConnectionService } from './system-default-connection.service';
import { authenticate } from '../../middleware/auth';

const defaultConnectionSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    description: { type: ['string', 'null'] },
    provider: { type: 'string' },
    modelName: { type: 'string' },
    baseUrl: { type: ['string', 'null'] },
    isActive: { type: 'boolean' },
    isDefault: { type: 'boolean' },
    isSystemDefault: { type: 'boolean' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
  required: [
    'id',
    'name',
    'provider',
    'modelName',
    'isActive',
    'isDefault',
    'isSystemDefault',
  ],
};

export default async function systemDefaultConnectionRoutes(
  fastify: FastifyInstance
) {
  const systemDefaultConnectionService = new SystemDefaultConnectionService();

  fastify.get(
    '/system-default-connection',
    {
      preHandler: [authenticate],
      schema: {
        description: 'Get information about the system default connection',
        tags: ['System Default Connection'],
        response: {
          200: {
            type: 'object',
            properties: {
              enabled: { type: 'boolean' },
              connection: {
                anyOf: [defaultConnectionSchema, { type: 'null' }],
              },
            },
          },
          401: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const result =
          await systemDefaultConnectionService.getSystemDefaultConnection();

        if (!result.success) {
          return reply.status(500).send({ error: result.error });
        }

        return reply.send({
          enabled:
            systemDefaultConnectionService.isDefaultConnectionAvailable(),
          connection: result.data
            ? systemDefaultConnectionService.toPublicDefaultConnection(
                result.data
              )
            : null,
        });
      } catch (error) {
        request.log.error(error, 'Error getting default connection');
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  fastify.post(
    '/system-default-connection/test',
    {
      preHandler: [authenticate],
      schema: {
        description: 'Test the system default connection',
        tags: ['System Default Connection'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              error: { type: 'string' },
            },
          },
          401: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const result =
          await systemDefaultConnectionService.testDefaultConnection();

        if (!result.success) {
          return reply.status(500).send({
            success: false,
            message: 'Failed to test connection',
            error: result.error,
          });
        }

        return reply.send({
          success: result.data || false,
          message: result.data
            ? 'Default connection is working'
            : 'Default connection test failed',
        });
      } catch (error) {
        request.log.error(error, 'Error testing default connection');
        return reply.status(500).send({
          success: false,
          message: 'Internal server error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  fastify.get(
    '/system-default-connection/config',
    {
      preHandler: [authenticate],
      schema: {
        description: 'Get configuration for using the default connection',
        tags: ['System Default Connection'],
        response: {
          200: {
            type: 'object',
            properties: {
              provider: { type: 'string' },
              modelName: { type: 'string' },
              projectId: { type: 'string' },
              location: { type: 'string' },
              baseUrl: { type: 'string' },
            },
            additionalProperties: true,
          },
          401: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
          404: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const result =
          await systemDefaultConnectionService.getDefaultConnectionConfig();

        if (!result.success) {
          return reply.status(404).send({ error: result.error });
        }

        return reply.send(result.data);
      } catch (error) {
        request.log.error(error, 'Error getting default connection config');
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );
}
