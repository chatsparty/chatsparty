import {
  Connection,
  PublicConnection,
  ServiceResponse,
  AIProvider,
} from '../types';
import {
  getDefaultConnectionConfig,
  DefaultConnectionConfig,
} from '../../../config/fallback.config';

export interface FallbackConnection extends Omit<Connection, 'userId'> {
  isSystemDefault: true;
}

const config: DefaultConnectionConfig | null = getDefaultConnectionConfig();

export function isFallbackAvailable(): boolean {
  return config !== null && config.enabled;
}

export function getFallbackProvider(): AIProvider | null {
  return config?.provider || null;
}

export function getProviderFromConnectionId(
  connectionId: string
): AIProvider | null {
  if (connectionId.startsWith('system-fallback-')) {
    const provider = connectionId.replace('system-fallback-', '') as AIProvider;
    return provider;
  }
  return null;
}

export async function getFallbackConnection(): Promise<
  ServiceResponse<FallbackConnection | null>
> {
  try {
    if (!isFallbackAvailable() || !config) {
      return {
        success: true,
        data: null,
      };
    }

    const connection: FallbackConnection = {
      id: 'system-fallback-' + config.provider,
      name: 'System Fallback Connection',
      description: 'Platform-provided fallback connection',
      provider: config.provider,
      modelName: config.modelName,
      apiKey: config.apiKey || null,
      apiKeyEncrypted: false,
      baseUrl:
        config.provider === 'vertex_ai'
          ? config.projectId || config.baseUrl || null
          : config.baseUrl || null,
      isActive: true,
      isDefault: true,
      isSystemDefault: true,
      createdAt: new Date(0),
      updatedAt: new Date(0),
    };

    return {
      success: true,
      data: connection,
    };
  } catch (error) {
    console.error('Error getting system fallback connection:', error);
    return {
      success: false,
      error: 'Failed to get system fallback connection',
    };
  }
}

export function toPublicFallbackConnection(
  connection: FallbackConnection
): PublicConnection & { isSystemDefault: boolean } {
  return {
    id: connection.id,
    name: connection.name,
    description: connection.description,
    provider: connection.provider,
    modelName: connection.modelName,
    baseUrl: connection.baseUrl,
    isActive: connection.isActive,
    isDefault: connection.isDefault,
    isSystemDefault: connection.isSystemDefault,
    createdAt: connection.createdAt.toISOString(),
    updatedAt: connection.updatedAt.toISOString(),
  };
}
