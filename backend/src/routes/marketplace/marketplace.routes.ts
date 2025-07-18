import { FastifyInstance } from 'fastify';
import * as marketplaceManager from '../../domains/marketplace/orchestration/manager';
import {
  MarketplaceFiltersSchema,
  MarketplacePaginationInputSchema,
  ImportAgentSchema,
  AgentRatingSchema,
  PublishAgentSchema,
} from '../../domains/marketplace/schemas';
import {
  getMarketplaceAgentsSchema,
  getMarketplaceAgentByIdSchema,
  importAgentSchema,
  rateAgentSchema,
  publishAgentSchema,
  getMarketplaceCategoriesSchema,
} from './marketplace.schemas';

export async function marketplaceRoutes(fastify: FastifyInstance) {

  fastify.get('/marketplace/agents', {
    schema: getMarketplaceAgentsSchema,
    handler: async (request, reply) => {
      const filters = MarketplaceFiltersSchema.parse(request.query);
      const pagination = MarketplacePaginationInputSchema.parse(request.query);

      const result = await marketplaceManager.getMarketplaceAgents(
        filters,
        pagination
      );

      return reply.send(result);
    },
  });

  fastify.get('/marketplace/agents/:agentId', {
    schema: getMarketplaceAgentByIdSchema,
    handler: async (request, reply) => {
      const { agentId } = request.params as { agentId: string };

      const agent = await marketplaceManager.getAgentById(agentId);

      return reply.send(agent);
    },
  });

  fastify.post('/marketplace/agents/import', {
    schema: importAgentSchema,
    handler: async (request, reply) => {
      const userId = request.user!.userId;
      const importRequest = ImportAgentSchema.parse(request.body);

      const result = await marketplaceManager.importAgent(
        userId,
        importRequest
      );

      return reply.send(result);
    },
  });

  fastify.post('/marketplace/agents/rate', {
    schema: rateAgentSchema,
    handler: async (request, reply) => {
      const userId = request.user!.userId;
      const ratingRequest = AgentRatingSchema.parse(request.body);

      const result = await marketplaceManager.rateAgent(userId, ratingRequest);

      return reply.send(result);
    },
  });

  fastify.post('/marketplace/agents/publish', {
    schema: publishAgentSchema,
    handler: async (request, reply) => {
      const userId = request.user!.userId;
      const publishRequest = PublishAgentSchema.parse(request.body);

      await marketplaceManager.publishAgent(userId, publishRequest);

      return reply.send({ success: true });
    },
  });

  fastify.get('/marketplace/categories', {
    schema: getMarketplaceCategoriesSchema,
    handler: async (_request, reply) => {
      const categories = await marketplaceManager.getCategories();

      return reply.send(categories);
    },
  });
}
