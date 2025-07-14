import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import {
  ModelInfo,
  PROVIDER_CONFIGS,
  TestConnectionResponse,
} from '../connection.types';
import { IProvider } from './provider.interface';

export class OpenAIProvider implements IProvider {
  async testConnection(
    apiKey: string | null,
    baseUrl?: string | null
  ): Promise<TestConnectionResponse> {
    if (!apiKey) {
      return {
        success: false,
        message: 'API key is required for OpenAI',
      };
    }

    try {
      const openai = createOpenAI({
        apiKey,
        baseURL: baseUrl ?? undefined,
      });
      await generateText({
        model: openai('gpt-3.5-turbo'),
        prompt: 'Hello!',
      });
      return {
        success: true,
        message: 'OpenAI connection successful',
        availableModels: this.getAvailableModels(),
      };
    } catch (error) {
      return {
        success: false,
        message: 'OpenAI connection failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  getAvailableModels(): ModelInfo[] {
    return PROVIDER_CONFIGS.openai.supportedModels;
  }

  getConnectionConfig(config: {
    apiKey: string | null;
    baseUrl: string | null;
    modelName: string;
  }) {
    return {
      provider: 'openai',
      apiKey: config.apiKey,
      modelName: config.modelName,
      baseUrl: config.baseUrl,
    };
  }
}
