import {
  ModelInfo,
  PROVIDER_CONFIGS,
  TestConnectionResponse,
} from '../connection.types';
import { IProvider } from './provider.interface';
import { VertexAIProvider as VertexAIProviderSDK } from '../../ai/providers/vertex-ai.provider';
import { getDefaultConnectionConfig } from '../../../config/default-connection.config';

export class VertexAIProvider implements IProvider {
  async testConnection(
    apiKey: string | null,
    _baseUrl?: string | null,
    projectId?: string | null,
    location?: string | null
  ): Promise<TestConnectionResponse> {
    try {
      const defaultConfig = getDefaultConnectionConfig();
      if (!defaultConfig || defaultConfig.provider !== 'vertex_ai') {
        return {
          success: false,
          message: 'Vertex AI configuration not found',
          error:
            'Please configure Vertex AI project ID and location in environment variables',
        };
      }

      const vertexProvider = new VertexAIProviderSDK({
        projectId: projectId || defaultConfig.projectId!,
        location: location || defaultConfig.location!,
        modelName: defaultConfig.modelName,
        apiKey: apiKey ?? undefined,
      });

      const testResult = await vertexProvider.testConnection();

      if (testResult.success) {
        return {
          success: true,
          message: 'Vertex AI connection successful',
          availableModels: this.getAvailableModels(),
        };
      } else {
        return {
          success: false,
          message: 'Vertex AI connection failed',
          error: testResult.error,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to test Vertex AI connection',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  getAvailableModels(): ModelInfo[] {
    return PROVIDER_CONFIGS.vertex_ai.supportedModels;
  }

  getConnectionConfig(config: {
    apiKey: string | null;
    baseUrl: string | null;
    projectId: string | null;
    location: string | null;
    modelName: string;
  }) {
    return {
      provider: 'vertex_ai',
      projectId: config.projectId,
      location: config.location,
      modelName: config.modelName,
      apiKey: config.apiKey,
    };
  }
}
