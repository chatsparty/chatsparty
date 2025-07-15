import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import {
  ModelInfo,
  PROVIDER_CONFIGS,
  TestConnectionResponse,
} from '../connection.types';
import { IProvider, BaseConnectionConfig } from './provider.interface';

export class GoogleProvider implements IProvider<BaseConnectionConfig> {
  async testConnection(
    config: BaseConnectionConfig
  ): Promise<TestConnectionResponse> {
    const { apiKey } = config;
    if (!apiKey) {
      return {
        success: false,
        message: 'API key is required for Google',
      };
    }

    try {
      const model = google('models/gemini-1.5-flash-latest');
      await generateText({
        model,
        prompt: 'Hello!',
      });
      return {
        success: true,
        message: 'Google AI connection successful',
        availableModels: this.getAvailableModels(),
      };
    } catch (error) {
      return {
        success: false,
        message: 'Google AI connection failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  getAvailableModels(): ModelInfo[] {
    return PROVIDER_CONFIGS.google.supportedModels;
  }

  getConnectionConfig(config: BaseConnectionConfig) {
    return {
      provider: 'google',
      apiKey: config.apiKey,
      modelName: config.modelName,
      baseUrl: config.baseUrl,
    };
  }
}
