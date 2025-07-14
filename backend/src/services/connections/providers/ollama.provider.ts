import { createOllama } from 'ollama-ai-provider';
import { generateText } from 'ai';
import {
  ModelInfo,
  PROVIDER_CONFIGS,
  TestConnectionResponse,
} from '../connection.types';
import { IProvider } from './provider.interface';

export class OllamaProvider implements IProvider {
  async testConnection(
    _apiKey: string | null,
    baseUrl?: string | null
  ): Promise<TestConnectionResponse> {
    try {
      const ollama = createOllama({
        baseURL: baseUrl ?? 'http://localhost:11434',
      });
      await generateText({
        model: ollama('llama3'),
        prompt: 'Hello!',
      });
      return {
        success: true,
        message: 'Ollama connection successful',
        availableModels: this.getAvailableModels(),
      };
    } catch (error) {
      return {
        success: false,
        message: 'Ollama connection failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  getAvailableModels(): ModelInfo[] {
    return PROVIDER_CONFIGS.ollama.supportedModels;
  }

  getConnectionConfig(config: {
    apiKey: string | null;
    baseUrl: string | null;
    modelName: string;
  }) {
    return {
      provider: 'ollama',
      apiKey: config.apiKey,
      modelName: config.modelName,
      baseUrl: config.baseUrl,
    };
  }
}
