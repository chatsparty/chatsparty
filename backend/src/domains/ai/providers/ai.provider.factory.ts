import { ModelConfiguration, AIProvider } from '../types';
import { MastraProvider } from './mastra.provider';
import { createLogger } from '../../../config/logger';
import { getConnection } from '../../connections/orchestration';
import { decrypt } from '../../../utils/crypto';
import { memoize } from 'lodash';

const logger = createLogger('ai.provider.factory');

type ProviderFactory = (modelName: string, apiKey?: string, baseUrl?: string) => AIProvider;

const providerMap: Record<string, ProviderFactory> = {
  openai: (modelName) => new MastraProvider('openai', modelName),
  anthropic: (modelName) => new MastraProvider('anthropic', modelName),
  groq: (modelName) => new MastraProvider('openai', modelName), // Groq uses OpenAI-compatible API
  google: (modelName) => {
    throw new Error('Google provider not yet implemented with Mastra');
  },
  ollama: (modelName) => {
    throw new Error('Ollama provider not yet implemented with Mastra');
  },
  vertex_ai: (modelName) => {
    throw new Error('Vertex AI provider not yet implemented with Mastra');
  },
};

async function getApiKey(
  config: ModelConfiguration,
  connectionId?: string
): Promise<string | undefined> {
  if (config.apiKey) {
    return config.apiKey;
  }
  if (connectionId) {
    try {
      const connection = await getConnection(connectionId);
      if (connection && connection.success && connection.data) {
        return decrypt(connection.data.apiKey);
      }
    } catch (error: any) {
      logger.error(`Failed to retrieve API key for connection ${connectionId}: ${error.message}`);
      return undefined;
    }
  }
  return undefined;
}

const getAIProviderInternal = async (
  config: ModelConfiguration,
  connectionId?: string
): Promise<AIProvider> => {
  const factory = providerMap[config.provider];
  if (!factory) {
    throw new Error(`Unsupported AI provider: ${config.provider}`);
  }

  const apiKey = await getApiKey(config, connectionId);
  if (!apiKey && config.provider !== 'ollama') {
    throw new Error(
      `API key not found for provider ${config.provider} and connection ${connectionId}`
    );
  }

  return factory(config.modelName, apiKey, config.baseUrl);
};

export const getAIProvider = memoize(
  getAIProviderInternal,
  (config, connectionId) => `${config.provider}-${config.modelName}-${connectionId}`
);
