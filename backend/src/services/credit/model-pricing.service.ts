import { PrismaClient } from '@prisma/client';
import { db } from '../../config/database';
import {
  ModelPricing,
  CalculateCostRequest,
  CostCalculation,
  ServiceResponse,
  ModelPricingQueryOptions,
} from './credit.types';

export class ModelPricingService {
  private db: PrismaClient;
  private pricingCache: Map<string, ModelPricing> = new Map();
  private cacheExpiry = 5 * 60 * 1000; // 5 minutes
  private lastCacheUpdate = 0;

  constructor(database?: PrismaClient) {
    this.db = database || db;
  }

  /**
   * Get pricing for a specific model
   */
  async getModelPricing(
    provider: string,
    modelName: string
  ): Promise<ServiceResponse<ModelPricing>> {
    try {
      // Check cache first
      const cacheKey = `${provider}:${modelName}`;
      const cached = this.getCachedPricing(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      const pricing = await this.db.modelCreditCost.findUnique({
        where: {
          provider_modelName: {
            provider,
            modelName,
          },
        },
      });

      if (!pricing) {
        // Try to find a default model for the provider
        const defaultPricing = await this.db.modelCreditCost.findFirst({
          where: {
            provider,
            isDefaultModel: true,
            isActive: true,
          },
        });

        if (!defaultPricing) {
          return {
            success: false,
            error: `No pricing found for ${provider}:${modelName}`,
          };
        }

        // Use default pricing but with the requested model name
        const pricingData: ModelPricing = {
          provider,
          modelName,
          costPerMessage: defaultPricing.costPerMessage,
          costPer1kTokens: defaultPricing.costPer1kTokens,
          isDefaultModel: false,
          isActive: true,
        };

        this.setCachedPricing(cacheKey, pricingData);
        return { success: true, data: pricingData };
      }

      const pricingData: ModelPricing = {
        provider: pricing.provider,
        modelName: pricing.modelName,
        costPerMessage: pricing.costPerMessage,
        costPer1kTokens: pricing.costPer1kTokens,
        isDefaultModel: pricing.isDefaultModel,
        isActive: pricing.isActive,
      };

      this.setCachedPricing(cacheKey, pricingData);
      return { success: true, data: pricingData };
    } catch (error) {
      console.error('Error getting model pricing:', error);
      return {
        success: false,
        error: 'Failed to get model pricing',
      };
    }
  }

  /**
   * Calculate cost for model usage
   */
  async calculateCost(
    request: CalculateCostRequest
  ): Promise<ServiceResponse<CostCalculation>> {
    try {
      const pricingResult = await this.getModelPricing(
        request.provider,
        request.modelName
      );

      if (!pricingResult.success || !pricingResult.data) {
        return {
          success: false,
          error: pricingResult.error || 'Failed to get model pricing',
        };
      }

      const pricing = pricingResult.data;

      if (!pricing.isActive) {
        return {
          success: false,
          error: 'Model pricing is not active',
        };
      }

      let totalCost = 0;
      const breakdown: CostCalculation['breakdown'] = {};

      // Calculate message cost
      if (request.messageCount && request.messageCount > 0) {
        breakdown.messageCost = request.messageCount * pricing.costPerMessage;
        totalCost += breakdown.messageCost;
      }

      // Calculate token cost
      if (request.tokenCount && request.tokenCount > 0 && pricing.costPer1kTokens) {
        breakdown.tokenCost = Math.ceil(request.tokenCount / 1000) * pricing.costPer1kTokens;
        totalCost += breakdown.tokenCost;
      }

      // If no specific counts provided, use minimum message cost
      if (!request.messageCount && !request.tokenCount) {
        breakdown.messageCost = pricing.costPerMessage;
        totalCost = pricing.costPerMessage;
      }

      return {
        success: true,
        data: {
          totalCost,
          breakdown,
          modelPricing: pricing,
        },
      };
    } catch (error) {
      console.error('Error calculating cost:', error);
      return {
        success: false,
        error: 'Failed to calculate cost',
      };
    }
  }

  /**
   * List all model pricing
   */
  async listModelPricing(
    options: ModelPricingQueryOptions = {}
  ): Promise<ServiceResponse<ModelPricing[]>> {
    try {
      const where: any = {};

      if (options.provider) {
        where.provider = options.provider;
      }

      if (options.isActive !== undefined) {
        where.isActive = options.isActive;
      }

      if (options.isDefaultModel !== undefined) {
        where.isDefaultModel = options.isDefaultModel;
      }

      const pricings = await this.db.modelCreditCost.findMany({
        where,
        orderBy: [
          { provider: 'asc' },
          { isDefaultModel: 'desc' },
          { modelName: 'asc' },
        ],
      });

      const pricingData: ModelPricing[] = pricings.map(pricing => ({
        provider: pricing.provider,
        modelName: pricing.modelName,
        costPerMessage: pricing.costPerMessage,
        costPer1kTokens: pricing.costPer1kTokens,
        isDefaultModel: pricing.isDefaultModel,
        isActive: pricing.isActive,
      }));

      return {
        success: true,
        data: pricingData,
      };
    } catch (error) {
      console.error('Error listing model pricing:', error);
      return {
        success: false,
        error: 'Failed to list model pricing',
      };
    }
  }

  /**
   * Create or update model pricing
   */
  async upsertModelPricing(
    pricing: ModelPricing
  ): Promise<ServiceResponse<ModelPricing>> {
    try {
      const result = await this.db.modelCreditCost.upsert({
        where: {
          provider_modelName: {
            provider: pricing.provider,
            modelName: pricing.modelName,
          },
        },
        update: {
          costPerMessage: pricing.costPerMessage,
          costPer1kTokens: pricing.costPer1kTokens,
          isDefaultModel: pricing.isDefaultModel,
          isActive: pricing.isActive,
        },
        create: {
          provider: pricing.provider,
          modelName: pricing.modelName,
          costPerMessage: pricing.costPerMessage,
          costPer1kTokens: pricing.costPer1kTokens,
          isDefaultModel: pricing.isDefaultModel,
          isActive: pricing.isActive,
        },
      });

      const pricingData: ModelPricing = {
        provider: result.provider,
        modelName: result.modelName,
        costPerMessage: result.costPerMessage,
        costPer1kTokens: result.costPer1kTokens,
        isDefaultModel: result.isDefaultModel,
        isActive: result.isActive,
      };

      // Update cache
      const cacheKey = `${result.provider}:${result.modelName}`;
      this.setCachedPricing(cacheKey, pricingData);

      return {
        success: true,
        data: pricingData,
      };
    } catch (error) {
      console.error('Error upserting model pricing:', error);
      return {
        success: false,
        error: 'Failed to upsert model pricing',
      };
    }
  }

  /**
   * Delete model pricing
   */
  async deleteModelPricing(
    provider: string,
    modelName: string
  ): Promise<ServiceResponse<void>> {
    try {
      await this.db.modelCreditCost.delete({
        where: {
          provider_modelName: {
            provider,
            modelName,
          },
        },
      });

      // Remove from cache
      const cacheKey = `${provider}:${modelName}`;
      this.pricingCache.delete(cacheKey);

      return { success: true };
    } catch (error) {
      console.error('Error deleting model pricing:', error);
      return {
        success: false,
        error: 'Failed to delete model pricing',
      };
    }
  }

  /**
   * Initialize default model pricing
   */
  async initializeDefaultPricing(): Promise<ServiceResponse<void>> {
    try {
      const defaultPricings: ModelPricing[] = [
        // OpenAI
        { provider: 'openai', modelName: 'gpt-4', costPerMessage: 30, costPer1kTokens: 30, isDefaultModel: false, isActive: true },
        { provider: 'openai', modelName: 'gpt-4-turbo', costPerMessage: 10, costPer1kTokens: 10, isDefaultModel: true, isActive: true },
        { provider: 'openai', modelName: 'gpt-3.5-turbo', costPerMessage: 1, costPer1kTokens: 1, isDefaultModel: false, isActive: true },
        
        // Anthropic
        { provider: 'anthropic', modelName: 'claude-3-opus', costPerMessage: 60, costPer1kTokens: 60, isDefaultModel: false, isActive: true },
        { provider: 'anthropic', modelName: 'claude-3-sonnet', costPerMessage: 15, costPer1kTokens: 15, isDefaultModel: true, isActive: true },
        { provider: 'anthropic', modelName: 'claude-3-haiku', costPerMessage: 1, costPer1kTokens: 1, isDefaultModel: false, isActive: true },
        
        // Google
        { provider: 'google', modelName: 'gemini-pro', costPerMessage: 5, costPer1kTokens: 5, isDefaultModel: true, isActive: true },
        { provider: 'google', modelName: 'gemini-pro-vision', costPerMessage: 10, costPer1kTokens: 10, isDefaultModel: false, isActive: true },
        
        // Groq
        { provider: 'groq', modelName: 'mixtral-8x7b', costPerMessage: 1, costPer1kTokens: 1, isDefaultModel: true, isActive: true },
        { provider: 'groq', modelName: 'llama2-70b', costPerMessage: 1, costPer1kTokens: 1, isDefaultModel: false, isActive: true },
        
        // Ollama (local models - minimal cost)
        { provider: 'ollama', modelName: 'llama2', costPerMessage: 1, costPer1kTokens: null, isDefaultModel: true, isActive: true },
        { provider: 'ollama', modelName: 'mistral', costPerMessage: 1, costPer1kTokens: null, isDefaultModel: false, isActive: true },
      ];

      for (const pricing of defaultPricings) {
        await this.upsertModelPricing(pricing);
      }

      return { success: true };
    } catch (error) {
      console.error('Error initializing default pricing:', error);
      return {
        success: false,
        error: 'Failed to initialize default pricing',
      };
    }
  }

  /**
   * Cache management methods
   */
  private getCachedPricing(key: string): ModelPricing | null {
    if (Date.now() - this.lastCacheUpdate > this.cacheExpiry) {
      this.pricingCache.clear();
      return null;
    }
    return this.pricingCache.get(key) || null;
  }

  private setCachedPricing(key: string, pricing: ModelPricing): void {
    this.pricingCache.set(key, pricing);
    this.lastCacheUpdate = Date.now();
  }

  /**
   * Clear pricing cache
   */
  clearCache(): void {
    this.pricingCache.clear();
    this.lastCacheUpdate = 0;
  }
}