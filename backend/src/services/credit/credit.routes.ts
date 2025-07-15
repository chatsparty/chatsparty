import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  CreditService,
  ModelPricingService,
  TransactionType,
  TransactionReason,
} from './index';

interface IQueryOptions {
  limit?: number;
  offset?: number;
  startDate?: string;
  endDate?: string;
  transactionType?: string;
  reason?: string;
  orderBy?: 'createdAt' | 'amount';
  orderDirection?: 'asc' | 'desc';
}

interface IAddCreditsBody {
  amount: number;
  transactionType: TransactionType;
  reason: TransactionReason;
  description?: string;
}

interface ICalculateCostBody {
  provider: string;
  modelName: string;
  messageCount?: number;
  tokenCount?: number;
}

interface IModelPricingBody {
  provider: string;
  modelName: string;
  costPerMessage: number;
  costPer1kTokens?: number | null;
  isDefaultModel?: boolean;
  isActive?: boolean;
}

export default async function creditRoutes(fastify: FastifyInstance) {
  const creditService = new CreditService();
  const modelPricingService = new ModelPricingService();

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
      const result = await creditService.getCreditBalance(userId);

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

      const result = await creditService.getTransactionHistory(options);

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

      const result = await creditService.getCreditStatistics(
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

      const result = await creditService.validateCredits(userId, amount);

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

      const result = await modelPricingService.calculateCost({
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

      const result = await modelPricingService.listModelPricing({
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

      const result = await modelPricingService.getModelPricing(
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
    async (
      request: FastifyRequest<{ Body: IAddCreditsBody & { userId?: string } }>,
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

      const result = await creditService.addCredits({
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

      const result = await modelPricingService.upsertModelPricing({
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

      const result = await modelPricingService.deleteModelPricing(
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
      const result = await modelPricingService.initializeDefaultPricing();

      if (!result.success) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.send({
        message: 'Default pricing initialized successfully',
      });
    }
  );
}
