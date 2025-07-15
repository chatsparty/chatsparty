import { createAnthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import {
  ModelInfo,
  PROVIDER_CONFIGS,
  TestConnectionResponse,
} from '../connection.types';
import { IProvider, BaseConnectionConfig } from './provider.interface';

export class AnthropicProvider implements IProvider<BaseConnectionConfig> {
  async testConnection(
    config: BaseConnectionConfig
  ): Promise<TestConnectionResponse> {
    const { apiKey, baseUrl } = config;
    if (!apiKey) {
      return {
        success: false,
        message: 'API key is required for Anthropic',
      };
    }

    try {
      const anthropic = createAnthropic({
        apiKey,
        baseURL: baseUrl ?? undefined,
      });
      await generateText({
        model: anthropic('claude-3-haiku-20240307'),
        prompt: 'Hello!',
      });
      return {
        success: true,
        message: 'Anthropic connection successful',
        availableModels: this.getAvailableModels(),
      };
    } catch (error) {
      return {
        success: false,
        message: 'Anthropic connection failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  getAvailableModels(): ModelInfo[] {
    return PROVIDER_CONFIGS.anthropic.supportedModels;
  }

  getConnectionConfig(config: BaseConnectionConfig) {
    return {
      provider: 'anthropic',
      apiKey: config.apiKey,
      modelName: config.modelName,
      baseUrl: config.baseUrl,
    };
  }
}
