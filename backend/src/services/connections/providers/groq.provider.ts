import { createGroq } from '@ai-sdk/groq';
import { generateText } from 'ai';
import {
  ModelInfo,
  PROVIDER_CONFIGS,
  TestConnectionResponse,
} from '../connection.types';
import { IProvider, BaseConnectionConfig } from './provider.interface';

export class GroqProvider implements IProvider<BaseConnectionConfig> {
  async testConnection(
    config: BaseConnectionConfig
  ): Promise<TestConnectionResponse> {
    const { apiKey, baseUrl } = config;
    if (!apiKey) {
      return {
        success: false,
        message: 'API key is required for Groq',
      };
    }

    try {
      const groq = createGroq({
        apiKey,
        baseURL: baseUrl ?? undefined,
      });
      await generateText({
        model: groq('llama3-8b-8192'),
        prompt: 'Hello!',
      });
      return {
        success: true,
        message: 'Groq connection successful',
        availableModels: this.getAvailableModels(),
      };
    } catch (error) {
      return {
        success: false,
        message: 'Groq connection failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  getAvailableModels(): ModelInfo[] {
    return PROVIDER_CONFIGS.groq.supportedModels;
  }

  getConnectionConfig(config: BaseConnectionConfig) {
    return {
      provider: 'groq',
      apiKey: config.apiKey,
      modelName: config.modelName,
      baseUrl: config.baseUrl,
    };
  }
}
