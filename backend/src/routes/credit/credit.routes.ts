import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { TransactionType, TransactionReason } from '../../domains/credit/types';
import { CreditManager } from '../../domains/credit/orchestration/credit.manager';
import { ModelPricingManager } from '../../domains/credit/orchestration/model-pricing.manager';
import { CreditRepository } from '../../domains/credit/repository';
import {
  QueryOptionsSchema,
  AddCreditsBodySchema,
  CalculateCostBodySchema,
  ModelPricingBodySchema,
} from './credit.schemas';
import {
  IQueryOptions,
  IAddCreditsBody,
  ICalculateCostBody,
  IModelPricingBody,
} from './credit.types';

export default async function creditRoutes(fastify: FastifyInstance) {
  const creditRepository = new CreditRepository();
  const creditManager = new CreditManager();
  const modelPricingManager = new ModelPricingManager(creditRepository);

  /**
   * Get current user's credit balance
   */
  fastify.get(
    '/balance',
    {
      schema: {
        description: 'Get current user credit balance',
        tags: ['Credits'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              balance: { type: 'number' },
              spent: { type: 'number' },
              userId: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.userId;
      const result = await creditManager.getCreditBalance(userId);

      if (!result.success) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.send(result.data);
    }
  );

  /**
   * Get transaction history
   */
  fastify.get(
    '/transactions',
    {
      schema: {
        description: 'Get transaction history',
        tags: ['Credits'],
        security: [{ bearerAuth: [] }],
        querystring: QueryOptionsSchema,
      },
    },
    async (
      request: FastifyRequest<{ Querystring: IQueryOptions }>,
      reply: FastifyReply
    ) => {
      const userId = request.user!.userId;
      const {
        limit = 50,
        offset = 0,
        startDate,
        endDate,
        transactionType,
        reason,
        orderBy,
        orderDirection,
      } = request.query;

      const options = {
        userId,
        limit,
        offset,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        transactionType: transactionType as TransactionType,
        reason: reason as TransactionReason,
        orderBy,
        orderDirection,
      };

      const result = await creditManager.getTransactionHistory(options);

      if (!result.success) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.send(result.data);
    }
  );

  /**
   * Get credit statistics
   */
  fastify.get(
    '/statistics',
    async (
      request: FastifyRequest<{
        Querystring: { startDate?: string; endDate?: string };
      }>,
      reply: FastifyReply
    ) => {
      const userId = request.user!.userId;
      const { startDate, endDate } = request.query;

      const result = await creditManager.getCreditStatistics(
        userId,
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined
      );

      if (!result.success) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.send(result.data);
    }
  );

  /**
   * Validate credits for a specific amount
   */
  fastify.post(
    '/validate',
    async (
      request: FastifyRequest<{ Body: { amount: number } }>,
      reply: FastifyReply
    ) => {
      const userId = request.user!.userId;
      const { amount } = request.body;

      if (!amount || amount <= 0) {
        return reply.status(400).send({ error: 'Invalid amount' });
      }

      const result = await creditManager.validateCredits(userId, amount);

      if (!result.success) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.send(result.data);
    }
  );

  /**
   * Calculate cost for model usage
   */
  fastify.post(
    '/calculate-cost',
    {
      schema: {
        description: 'Calculate cost for model usage',
        tags: ['Credits'],
        body: CalculateCostBodySchema,
      },
    },
    async (
      request: FastifyRequest<{ Body: ICalculateCostBody }>,
      reply: FastifyReply
    ) => {
      const { provider, modelName, messageCount, tokenCount } = request.body;

      if (!provider || !modelName) {
        return reply
          .status(400)
          .send({ error: 'Provider and model name are required' });
      }

      const result = await modelPricingManager.calculateCost({
        provider,
        modelName,
        messageCount,
        tokenCount,
      });

      if (!result.success) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.send(result.data);
    }
  );

  /**
   * Get all model pricing
   */
  fastify.get(
    '/pricing',
    async (
      request: FastifyRequest<{
        Querystring: { provider?: string; isActive?: boolean };
      }>,
      reply: FastifyReply
    ) => {
      const { provider, isActive } = request.query;

      const result = await modelPricingManager.listModelPricing({
        provider,
        isActive,
      });

      if (!result.success) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.send(result.data);
    }
  );

  /**
   * Get pricing for a specific model
   */
  fastify.get(
    '/pricing/:provider/:modelName',
    async (
      request: FastifyRequest<{
        Params: { provider: string; modelName: string };
      }>,
      reply: FastifyReply
    ) => {
      const { provider, modelName } = request.params;

      const result = await modelPricingManager.getModelPricing(
        provider,
        modelName
      );

      if (!result.success) {
        return reply.status(404).send({ error: result.error });
      }

      return reply.send(result.data);
    }
  );

  /**
   * Add credits to user account (admin only)
   */
  fastify.post(
    '/add',
    {
      schema: {
        description: 'Add credits to user account (admin only)',
        tags: ['Credits'],
        security: [{ bearerAuth: [] }],
        body: AddCreditsBodySchema,
      },
    },
    async (
      request: FastifyRequest<{ Body: IAddCreditsBody }>,
      reply: FastifyReply
    ) => {
      const userId = request.body.userId || request.user!.userId;
      const { amount, transactionType, reason, description } = request.body;

      if (!amount || amount <= 0) {
        return reply.status(400).send({ error: 'Invalid amount' });
      }

      if (!transactionType || !reason) {
        return reply
          .status(400)
          .send({ error: 'Transaction type and reason are required' });
      }

      const result = await creditManager.addCredits({
        userId,
        amount,
        transactionType,
        reason,
        description,
      });

      if (!result.success) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.send(result.data);
    }
  );

  /**
   * Create or update model pricing (admin only)
   */
  fastify.post(
    '/pricing',
    {
      schema: {
        description: 'Create or update model pricing (admin only)',
        tags: ['Credits'],
        security: [{ bearerAuth: [] }],
        body: ModelPricingBodySchema,
      },
    },
    async (
      request: FastifyRequest<{ Body: IModelPricingBody }>,
      reply: FastifyReply
    ) => {
      const pricing = request.body;

      if (!pricing.provider || !pricing.modelName || !pricing.costPerMessage) {
        return reply.status(400).send({
          error: 'Provider, model name, and cost per message are required',
        });
      }

      const result = await modelPricingManager.upsertModelPricing({
        ...pricing,
        costPer1kTokens:
          pricing.costPer1kTokens === undefined
            ? null
            : pricing.costPer1kTokens,
        isDefaultModel:
          pricing.isDefaultModel === undefined ? false : pricing.isDefaultModel,
        isActive: pricing.isActive === undefined ? true : pricing.isActive,
      });

      if (!result.success) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.send(result.data);
    }
  );

  /**
   * Delete model pricing (admin only)
   */
  fastify.delete(
    '/pricing/:provider/:modelName',
    async (
      request: FastifyRequest<{
        Params: { provider: string; modelName: string };
      }>,
      reply: FastifyReply
    ) => {
      const { provider, modelName } = request.params;

      const result = await modelPricingManager.deleteModelPricing(
        provider,
        modelName
      );

      if (!result.success) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.status(204).send();
    }
  );

  /**
   * Initialize default pricing (admin only)
   */
  fastify.post(
    '/pricing/initialize',
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const result = await modelPricingManager.initializeDefaultPricing();

      if (!result.success) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.send({
        message: 'Default pricing initialized successfully',
      });
    }
  );
}
