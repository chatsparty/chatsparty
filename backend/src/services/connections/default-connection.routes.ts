import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { DefaultConnectionService } from './default-connection.service';
import { authenticate } from '../../middleware/auth';

// Response schemas
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

export default async function defaultConnectionRoutes(
  fastify: FastifyInstance
) {
  const defaultConnectionService = new DefaultConnectionService();

  // Get system default connection info
  fastify.get(
    '/default-connection',
    {
      preHandler: [authenticate],
      schema: {
        description: 'Get information about the system default connection',
        tags: ['Default Connection'],
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
          await defaultConnectionService.getSystemDefaultConnection();

        if (!result.success) {
          return reply.status(500).send({ error: result.error });
        }

        return reply.send({
          enabled: defaultConnectionService.isDefaultConnectionAvailable(),
          connection: result.data
            ? defaultConnectionService.toPublicDefaultConnection(result.data)
            : null,
        });
      } catch (error) {
        request.log.error(error, 'Error getting default connection');
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // Test default connection
  fastify.post(
    '/default-connection/test',
    {
      preHandler: [authenticate],
      schema: {
        description: 'Test the system default connection',
        tags: ['Default Connection'],
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
        const result = await defaultConnectionService.testDefaultConnection();

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

  // Get default connection configuration (for AI service integration)
  fastify.get(
    '/default-connection/config',
    {
      preHandler: [authenticate],
      schema: {
        description: 'Get configuration for using the default connection',
        tags: ['Default Connection'],
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
          await defaultConnectionService.getDefaultConnectionConfig();

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

  // Check if a specific provider has default connection available
  fastify.get<{
    Params: { provider: string };
  }>(
    '/default-connection/provider/:provider',
    {
      preHandler: [authenticate],
      schema: {
        description:
          'Check if a specific provider has a default connection available',
        tags: ['Default Connection'],
        params: {
          type: 'object',
          properties: {
            provider: {
              type: 'string',
              enum: [
                'openai',
                'anthropic',
                'google',
                'groq',
                'ollama',
                'vertex_ai',
              ],
            },
          },
          required: ['provider'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              available: { type: 'boolean' },
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
    async (
      request: FastifyRequest<{ Params: { provider: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { provider } = request.params;
        const result =
          await defaultConnectionService.getDefaultConnectionForProvider(
            provider as any
          );

        if (!result.success) {
          return reply.status(500).send({ error: result.error });
        }

        return reply.send({
          available: result.data !== null,
          connection: result.data
            ? defaultConnectionService.toPublicDefaultConnection(result.data)
            : null,
        });
      } catch (error) {
        request.log.error(error, 'Error checking provider default connection');
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );
}
