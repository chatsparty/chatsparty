import { FastifyInstance } from 'fastify';
import { MarketplaceService } from './marketplace.service';
import {
  MarketplaceFiltersSchema,
  MarketplacePaginationInputSchema,
  ImportAgentSchema,
  AgentRatingSchema,
  PublishAgentSchema,
} from './marketplace.schemas';
import { db } from '../../config/database';

export async function marketplaceRoutes(fastify: FastifyInstance) {
  const marketplaceService = new MarketplaceService(db);

  fastify.get('/marketplace/agents', {
    schema: {
      tags: ['Marketplace'],
      description: 'Get marketplace agents with filters and pagination',
      querystring: {
        type: 'object',
        properties: {
          category: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          minRating: { type: 'number' },
          search: { type: 'string' },
          sortBy: {
            type: 'string',
            enum: ['popular', 'rating', 'newest', 'name'],
          },
          sortOrder: { type: 'string', enum: ['asc', 'desc'] },
          page: { type: 'number' },
          limit: { type: 'number' },
        },
      },
      response: {
        200: {
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
                  characteristics: { type: 'string' },
                  category: { type: 'string' },
                  tags: { type: 'array', items: { type: 'string' } },
                  rating: { type: 'number' },
                  ratingCount: { type: 'number' },
                  usageCount: { type: 'number' },
                  createdAt: { type: 'string', format: 'date-time' },
                  publishedAt: { type: 'string', format: 'date-time' },
                  user: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                    },
                  },
                },
              },
            },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'number' },
                limit: { type: 'number' },
                total: { type: 'number' },
                pages: { type: 'number' },
              },
            },
            filters: { type: 'object' },
          },
        },
      },
    },
    handler: async (request, reply) => {
      const filters = MarketplaceFiltersSchema.parse(request.query);
      const pagination = MarketplacePaginationInputSchema.parse(request.query);

      const result = await marketplaceService.getMarketplaceAgents(
        filters,
        pagination
      );

      return reply.send(result);
    },
  });

  fastify.get('/marketplace/agents/:agentId', {
    schema: {
      tags: ['Marketplace'],
      description: 'Get single marketplace agent by ID',
      params: {
        type: 'object',
        properties: {
          agentId: { type: 'string' },
        },
        required: ['agentId'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            characteristics: { type: 'string' },
            category: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            rating: { type: 'number' },
            ratingCount: { type: 'number' },
            usageCount: { type: 'number' },
            createdAt: { type: 'string', format: 'date-time' },
            publishedAt: { type: 'string', format: 'date-time' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
              },
            },
            aiConfig: { type: 'object' },
            chatStyle: { type: 'object' },
          },
        },
      },
    },
    handler: async (request, reply) => {
      const { agentId } = request.params as { agentId: string };

      const agent = await marketplaceService.getAgentById(agentId);

      return reply.send(agent);
    },
  });

  fastify.post('/marketplace/agents/import', {
    schema: {
      tags: ['Marketplace'],
      description: 'Import agent from marketplace',
      body: {
        type: 'object',
        properties: {
          agentId: { type: 'string' },
          customizations: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              characteristics: { type: 'string' },
              aiConfig: { type: 'object' },
              chatStyle: { type: 'object' },
            },
          },
        },
        required: ['agentId'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            agent: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                templateId: { type: 'string' },
                isOriginal: { type: 'boolean' },
              },
            },
            success: { type: 'boolean' },
          },
        },
      },
    },
    handler: async (request, reply) => {
      const userId = request.user!.userId;
      const importRequest = ImportAgentSchema.parse(request.body);

      const result = await marketplaceService.importAgent(
        userId,
        importRequest
      );

      return reply.send(result);
    },
  });

  fastify.post('/marketplace/agents/rate', {
    schema: {
      tags: ['Marketplace'],
      description: 'Rate marketplace agent',
      body: {
        type: 'object',
        properties: {
          agentId: { type: 'string' },
          rating: { type: 'number', minimum: 1, maximum: 5 },
          review: { type: 'string' },
        },
        required: ['agentId', 'rating'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            rating: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                rating: { type: 'number' },
                review: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' },
              },
            },
            success: { type: 'boolean' },
          },
        },
      },
    },
    handler: async (request, reply) => {
      const userId = request.user!.userId;
      const ratingRequest = AgentRatingSchema.parse(request.body);

      const result = await marketplaceService.rateAgent(userId, ratingRequest);

      return reply.send(result);
    },
  });

  fastify.post('/marketplace/agents/publish', {
    schema: {
      tags: ['Marketplace'],
      description: 'Publish agent to marketplace',
      body: {
        type: 'object',
        properties: {
          agentId: { type: 'string' },
          category: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          description: { type: 'string' },
        },
        required: ['agentId', 'category', 'tags', 'description'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
          },
        },
      },
    },
    handler: async (request, reply) => {
      const userId = request.user!.userId;
      const publishRequest = PublishAgentSchema.parse(request.body);

      await marketplaceService.publishAgent(userId, publishRequest);

      return reply.send({ success: true });
    },
  });

  fastify.get('/marketplace/categories', {
    schema: {
      tags: ['Marketplace'],
      description: 'Get marketplace categories',
      response: {
        200: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
    handler: async (_request, reply) => {
      const categories = await marketplaceService.getCategories();

      return reply.send(categories);
    },
  });

  fastify.get('/marketplace/templates/brainstorm', {
    schema: {
      tags: ['Marketplace'],
      description: 'Get brainstorm templates',
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
              category: { type: 'string' },
              duration: { type: 'string' },
              agents: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    role: { type: 'string' },
                    name: { type: 'string' },
                    description: { type: 'string' },
                    agentId: { type: 'string' },
                  },
                },
              },
              usageCount: { type: 'number' },
              rating: { type: 'number' },
            },
          },
        },
      },
    },
    handler: async (_request, reply) => {
      const templates = await marketplaceService.getBrainstormTemplates();

      return reply.send(templates);
    },
  });

  fastify.get('/marketplace/templates/usecases', {
    schema: {
      tags: ['Marketplace'],
      description: 'Get use case templates',
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
              category: { type: 'string' },
              agents: { type: 'array', items: { type: 'string' } },
              scenario: { type: 'string' },
              expectedOutcome: { type: 'string' },
              estimatedDuration: { type: 'string' },
            },
          },
        },
      },
    },
    handler: async (_request, reply) => {
      const templates = await marketplaceService.getUseCaseTemplates();

      return reply.send(templates);
    },
  });
}
