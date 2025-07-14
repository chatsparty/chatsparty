import { createOllama } from 'ollama-ai-provider';
import { generateText } from 'ai';
import {
  ModelInfo,
  PROVIDER_CONFIGS,
  TestConnectionResponse,
} from '../connection.types';
import { BaseConnectionConfig, IProvider } from './provider.interface';

export interface OllamaConnectionConfig extends BaseConnectionConfig {}

export class OllamaProvider implements IProvider<OllamaConnectionConfig> {
  async testConnection(
    config: OllamaConnectionConfig
  ): Promise<TestConnectionResponse> {
    const { baseUrl } = config;
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

  getConnectionConfig(config: OllamaConnectionConfig) {
    return {
      provider: 'ollama',
      apiKey: config.apiKey,
      modelName: config.modelName,
      baseUrl: config.baseUrl,
    };
  }
}
