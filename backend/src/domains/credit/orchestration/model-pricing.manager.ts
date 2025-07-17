import { CreditRepository } from '../repository';
import {
  ModelPricing,
  CalculateCostRequest,
  CostCalculation,
  ServiceResponse,
  ModelPricingQueryOptions,
} from '../types';

export class ModelPricingManager {
  private repository: CreditRepository;
  private pricingCache: Map<string, ModelPricing> = new Map();
  private cacheExpiry = 5 * 60 * 1000; // 5 minutes
  private lastCacheUpdate = 0;

  constructor(repository: CreditRepository) {
    this.repository = repository;
  }

  async getModelPricing(
    provider: string,
    modelName: string
  ): Promise<ServiceResponse<ModelPricing>> {
    try {
      const cacheKey = `${provider}:${modelName}`;
      const cached = this.getCachedPricing(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      let pricing = await this.repository.findModelPricing(provider, modelName);
      if (!pricing) {
        const defaultPricing =
          await this.repository.findDefaultModelPricing(provider);
        if (!defaultPricing) {
          return {
            success: false,
            error: `No pricing found for ${provider}:${modelName}`,
          };
        }
        pricing = { ...defaultPricing, modelName, isDefaultModel: false };
      }

      this.setCachedPricing(cacheKey, pricing);
      return { success: true, data: pricing };
    } catch (error) {
      console.error('Error getting model pricing:', error);
      return { success: false, error: 'Failed to get model pricing' };
    }
  }

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
        return { success: false, error: 'Model pricing is not active' };
      }

      let totalCost = 0;
      const breakdown: CostCalculation['breakdown'] = {};

      if (request.messageCount && request.messageCount > 0) {
        breakdown.messageCost = request.messageCount * pricing.costPerMessage;
        totalCost += breakdown.messageCost;
      }

      if (
        request.tokenCount &&
        request.tokenCount > 0 &&
        pricing.costPer1kTokens
      ) {
        breakdown.tokenCost =
          Math.ceil(request.tokenCount / 1000) * pricing.costPer1kTokens;
        totalCost += breakdown.tokenCost;
      }

      if (!request.messageCount && !request.tokenCount) {
        totalCost = pricing.costPerMessage;
        breakdown.messageCost = totalCost;
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
      return { success: false, error: 'Failed to calculate cost' };
    }
  }

  async listModelPricing(
    options: ModelPricingQueryOptions = {}
  ): Promise<ServiceResponse<ModelPricing[]>> {
    try {
      const pricings = await this.repository.findModelPricings(options);
      return { success: true, data: pricings };
    } catch (error) {
      console.error('Error listing model pricing:', error);
      return { success: false, error: 'Failed to list model pricing' };
    }
  }

  async upsertModelPricing(
    pricing: ModelPricing
  ): Promise<ServiceResponse<ModelPricing>> {
    try {
      const result = await this.repository.upsertModelPricing(pricing);
      this.setCachedPricing(`${result.provider}:${result.modelName}`, result);
      return { success: true, data: result };
    } catch (error) {
      console.error('Error upserting model pricing:', error);
      return { success: false, error: 'Failed to upsert model pricing' };
    }
  }

  async deleteModelPricing(
    provider: string,
    modelName: string
  ): Promise<ServiceResponse<void>> {
    try {
      await this.repository.deleteModelPricing(provider, modelName);
      this.pricingCache.delete(`${provider}:${modelName}`);
      return { success: true };
    } catch (error) {
      console.error('Error deleting model pricing:', error);
      return { success: false, error: 'Failed to delete model pricing' };
    }
  }

  async initializeDefaultPricing(): Promise<ServiceResponse<void>> {
    try {
      const defaultPricings: ModelPricing[] = [
        // OpenAI
        {
          provider: 'openai',
          modelName: 'gpt-4',
          costPerMessage: 30,
          costPer1kTokens: 30,
          isDefaultModel: false,
          isActive: true,
        },
        {
          provider: 'openai',
          modelName: 'gpt-4-turbo',
          costPerMessage: 10,
          costPer1kTokens: 10,
          isDefaultModel: true,
          isActive: true,
        },
        {
          provider: 'openai',
          modelName: 'gpt-3.5-turbo',
          costPerMessage: 1,
          costPer1kTokens: 1,
          isDefaultModel: false,
          isActive: true,
        },

        // Anthropic
        {
          provider: 'anthropic',
          modelName: 'claude-3-opus',
          costPerMessage: 60,
          costPer1kTokens: 60,
          isDefaultModel: false,
          isActive: true,
        },
        {
          provider: 'anthropic',
          modelName: 'claude-3-sonnet',
          costPerMessage: 15,
          costPer1kTokens: 15,
          isDefaultModel: true,
          isActive: true,
        },
        {
          provider: 'anthropic',
          modelName: 'claude-3-haiku',
          costPerMessage: 1,
          costPer1kTokens: 1,
          isDefaultModel: false,
          isActive: true,
        },

        // Google
        {
          provider: 'google',
          modelName: 'gemini-pro',
          costPerMessage: 5,
          costPer1kTokens: 5,
          isDefaultModel: true,
          isActive: true,
        },
        {
          provider: 'google',
          modelName: 'gemini-pro-vision',
          costPerMessage: 10,
          costPer1kTokens: 10,
          isDefaultModel: false,
          isActive: true,
        },

        // Groq
        {
          provider: 'groq',
          modelName: 'mixtral-8x7b',
          costPerMessage: 1,
          costPer1kTokens: 1,
          isDefaultModel: true,
          isActive: true,
        },
        {
          provider: 'groq',
          modelName: 'llama2-70b',
          costPerMessage: 1,
          costPer1kTokens: 1,
          isDefaultModel: false,
          isActive: true,
        },

        // Ollama (local models - minimal cost)
        {
          provider: 'ollama',
          modelName: 'llama2',
          costPerMessage: 1,
          costPer1kTokens: null,
          isDefaultModel: true,
          isActive: true,
        },
        {
          provider: 'ollama',
          modelName: 'mistral',
          costPerMessage: 1,
          costPer1kTokens: null,
          isDefaultModel: false,
          isActive: true,
        },
      ];

      for (const pricing of defaultPricings) {
        await this.upsertModelPricing(pricing);
      }

      return { success: true };
    } catch (error) {
      console.error('Error initializing default pricing:', error);
      return { success: false, error: 'Failed to initialize default pricing' };
    }
  }

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

  clearCache(): void {
    this.pricingCache.clear();
    this.lastCacheUpdate = 0;
  }
}
