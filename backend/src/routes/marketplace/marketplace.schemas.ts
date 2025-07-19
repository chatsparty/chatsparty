import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  MarketplaceFiltersSchema,
  MarketplacePaginationInputSchema,
  ImportAgentSchema,
  AgentRatingSchema,
  PublishAgentSchema,
} from '../../domains/marketplace/schemas';

export const getMarketplaceAgentsSchema = {
  tags: ['Marketplace'],
  description: 'Get marketplace agents with filters and pagination',
  querystring: zodToJsonSchema(MarketplaceFiltersSchema.merge(MarketplacePaginationInputSchema)),
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
                required: ['id', 'name'],
              },
              chatStyle: { type: 'object', additionalProperties: true },
            },
            required: [
              'id',
              'name',
              'description',
              'characteristics',
              'category',
              'tags',
              'rating',
              'ratingCount',
              'usageCount',
              'createdAt',
              'publishedAt',
              'user',
              'chatStyle',
            ],
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
          required: ['page', 'limit', 'total', 'pages'],
        },
        filters: { type: 'object', additionalProperties: true },
      },
      required: ['agents', 'pagination', 'filters'],
    },
  },
};

export const getMarketplaceAgentByIdSchema = {
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
          required: ['id', 'name'],
        },
        chatStyle: { type: 'object' },
      },
    },
  },
};

export const importAgentSchema = {
  tags: ['Marketplace'],
  description: 'Import agent from marketplace',
  body: zodToJsonSchema(ImportAgentSchema),
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
};

export const rateAgentSchema = {
  tags: ['Marketplace'],
  description: 'Rate marketplace agent',
  body: zodToJsonSchema(AgentRatingSchema),
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
};

export const publishAgentSchema = {
  tags: ['Marketplace'],
  description: 'Publish agent to marketplace',
  body: zodToJsonSchema(PublishAgentSchema),
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
      },
    },
  },
};

export const getMarketplaceCategoriesSchema = {
  tags: ['Marketplace'],
  description: 'Get marketplace categories',
  response: {
    200: {
      type: 'array',
      items: { type: 'string' },
    },
  },
};