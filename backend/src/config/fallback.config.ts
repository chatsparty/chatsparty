import { AIProvider } from '../routes/connections/connection.types';

// Default connection configuration
export interface DefaultConnectionConfig {
  provider: AIProvider;
  modelName: string;
  apiKey?: string;
  projectId?: string; // For Vertex AI
  location?: string; // For Vertex AI
  baseUrl?: string;
  enabled: boolean;
}

// Environment variable names for default connection
export const DEFAULT_CONNECTION_ENV_VARS = {
  PROVIDER: 'DEFAULT_CONNECTION_PROVIDER',
  MODEL: 'DEFAULT_CONNECTION_MODEL',
  API_KEY: 'DEFAULT_CONNECTION_API_KEY',
  PROJECT_ID: 'DEFAULT_CONNECTION_PROJECT_ID',
  LOCATION: 'DEFAULT_CONNECTION_LOCATION',
  BASE_URL: 'DEFAULT_CONNECTION_BASE_URL',
  ENABLED: 'DEFAULT_CONNECTION_ENABLED',
} as const;

// Get default connection configuration from environment
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
    enabled: true,
  };
}

// Validate default connection configuration
export function validateDefaultConnectionConfig(
  config: DefaultConnectionConfig
): { valid: boolean; error?: string } {
  if (!config.enabled) {
    return { valid: true };
  }

  if (!config.provider || !config.modelName) {
    return { valid: false, error: 'Provider and model name are required' };
  }

  // Provider-specific validation
  switch (config.provider) {
    case 'vertex_ai':
      if (!config.projectId || !config.location) {
        return {
          valid: false,
          error: 'Vertex AI requires projectId and location',
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
      // Ollama doesn't require API key but may need base URL
      break;
    default:
      return { valid: false, error: `Unknown provider: ${config.provider}` };
  }

  return { valid: true };
}
