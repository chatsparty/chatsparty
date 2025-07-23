import { AIProvider } from '../domains/connections/types';

export interface DefaultConnectionConfig {
  provider: AIProvider;
  modelName: string;
  apiKey?: string;
  projectId?: string;
  location?: string;
  baseUrl?: string;
  resourceName?: string;
  apiVersion?: string;
  enabled: boolean;
}

export const DEFAULT_CONNECTION_ENV_VARS = {
  PROVIDER: 'DEFAULT_CONNECTION_PROVIDER',
  MODEL: 'DEFAULT_CONNECTION_MODEL',
  API_KEY: 'DEFAULT_CONNECTION_API_KEY',
  PROJECT_ID: 'DEFAULT_CONNECTION_PROJECT_ID',
  LOCATION: 'DEFAULT_CONNECTION_LOCATION',
  BASE_URL: 'DEFAULT_CONNECTION_BASE_URL',
  RESOURCE_NAME: 'DEFAULT_CONNECTION_RESOURCE_NAME',
  API_VERSION: 'DEFAULT_CONNECTION_API_VERSION',
  ENABLED: 'DEFAULT_CONNECTION_ENABLED',
} as const;

export function getDefaultConnectionConfig(): DefaultConnectionConfig | null {
  const enabled = process.env[DEFAULT_CONNECTION_ENV_VARS.ENABLED] === 'true';

  if (!enabled) {
    return null;
  }

  const provider = process.env[
    DEFAULT_CONNECTION_ENV_VARS.PROVIDER
  ] as AIProvider;
  const modelName = process.env[DEFAULT_CONNECTION_ENV_VARS.MODEL];

  if (!provider || !modelName) {
    console.warn(
      'Default connection enabled but missing required configuration'
    );
    return null;
  }

  return {
    provider,
    modelName,
    apiKey: process.env[DEFAULT_CONNECTION_ENV_VARS.API_KEY],
    projectId: process.env[DEFAULT_CONNECTION_ENV_VARS.PROJECT_ID],
    location: process.env[DEFAULT_CONNECTION_ENV_VARS.LOCATION],
    baseUrl: process.env[DEFAULT_CONNECTION_ENV_VARS.BASE_URL],
    resourceName: process.env[DEFAULT_CONNECTION_ENV_VARS.RESOURCE_NAME],
    apiVersion: process.env[DEFAULT_CONNECTION_ENV_VARS.API_VERSION],
    enabled: true,
  };
}

export function validateDefaultConnectionConfig(
  config: DefaultConnectionConfig
): { valid: boolean; error?: string } {
  if (!config.enabled) {
    return { valid: true };
  }

  if (!config.provider || !config.modelName) {
    return { valid: false, error: 'Provider and model name are required' };
  }

  switch (config.provider) {
    case 'vertex_ai':
      if (!config.projectId || !config.location) {
        return {
          valid: false,
          error: 'Vertex AI requires projectId and location',
        };
      }
      break;
    case 'azure-openai':
      if (!config.apiKey || !config.resourceName) {
        return {
          valid: false,
          error: 'Azure OpenAI requires an API key and resource name',
        };
      }
      break;
    case 'openai':
    case 'anthropic':
    case 'google':
    case 'groq':
      if (!config.apiKey) {
        return {
          valid: false,
          error: `${config.provider} requires an API key`,
        };
      }
      break;
    case 'ollama':
      break;
    default:
      return { valid: false, error: `Unknown provider: ${config.provider}` };
  }

  return { valid: true };
}
