import {
  Connection,
  PublicConnection,
  ServiceResponse,
  AIProvider,
} from './connection.types';
import {
  getDefaultConnectionConfig,
  DefaultConnectionConfig,
} from '../../config/default-connection.config';
import { ProviderFactory } from './providers/provider.factory';

export interface DefaultConnection extends Omit<Connection, 'userId'> {
  isSystemDefault: true;
}

export class SystemDefaultConnectionService {
  private defaultConfig: DefaultConnectionConfig | null;

  constructor() {
    this.defaultConfig = getDefaultConnectionConfig();
  }

  /**
   * Get the system default connection if enabled
   */
  async getSystemDefaultConnection(): Promise<
    ServiceResponse<DefaultConnection | null>
  > {
    try {
      if (!this.defaultConfig || !this.defaultConfig.enabled) {
        return {
          success: true,
          data: null,
        };
      }

      const connection: DefaultConnection = {
        id: 'system-default-' + this.defaultConfig.provider,
        name: 'System Default Connection',
        description: 'Platform-provided default connection',
        provider: this.defaultConfig.provider,
        modelName: this.defaultConfig.modelName,
        apiKey: this.defaultConfig.apiKey || null,
        apiKeyEncrypted: false,
        baseUrl: this.defaultConfig.baseUrl || null,
        isActive: true,
        isDefault: true,
        isSystemDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return {
        success: true,
        data: connection,
      };
    } catch (error) {
      console.error('Error getting system default connection:', error);
      return {
        success: false,
        error: 'Failed to get system default connection',
      };
    }
  }

  /**
   * Get default connection for a specific provider
   * This can be used as a fallback when user has no connections
   */
  async getDefaultConnectionForProvider(
    provider: AIProvider
  ): Promise<ServiceResponse<DefaultConnection | null>> {
    try {
      if (
        !this.defaultConfig ||
        !this.defaultConfig.enabled ||
        this.defaultConfig.provider !== provider
      ) {
        return {
          success: true,
          data: null,
        };
      }

      return this.getSystemDefaultConnection();
    } catch (error) {
      console.error('Error getting default connection for provider:', error);
      return {
        success: false,
        error: 'Failed to get default connection for provider',
      };
    }
  }

  /**
   * Test the default connection
   */
  async testDefaultConnection(): Promise<ServiceResponse<boolean>> {
    try {
      if (!this.defaultConfig || !this.defaultConfig.enabled) {
        return {
          success: true,
          data: false,
        };
      }

      const provider = ProviderFactory.createProvider(
        this.defaultConfig.provider
      );
      const result = await provider.testConnection(
        this.defaultConfig.apiKey ?? null,
        this.defaultConfig.baseUrl ?? null,
        this.defaultConfig.projectId ?? null,
        this.defaultConfig.location ?? null
      );

      return {
        success: true,
        data: result.success,
      };
    } catch (error) {
      console.error('Error testing default connection:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to test default connection',
      };
    }
  }

  /**
   * Get configuration for creating AI instances with default connection
   */
  async getDefaultConnectionConfig(): Promise<ServiceResponse<any>> {
    try {
      if (!this.defaultConfig || !this.defaultConfig.enabled) {
        return {
          success: false,
          error: 'Default connection is not enabled',
        };
      }

      const provider = ProviderFactory.createProvider(
        this.defaultConfig.provider
      );
      const config = provider.getConnectionConfig({
        apiKey: this.defaultConfig.apiKey ?? null,
        baseUrl: this.defaultConfig.baseUrl ?? null,
        projectId: this.defaultConfig.projectId ?? null,
        location: this.defaultConfig.location ?? null,
        modelName: this.defaultConfig.modelName,
      });

      return {
        success: true,
        data: config,
      };
    } catch (error) {
      console.error('Error getting default connection config:', error);
      return {
        success: false,
        error: 'Failed to get default connection configuration',
      };
    }
  }

  /**
   * Convert default connection to public format
   */
  toPublicDefaultConnection(
    connection: DefaultConnection
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
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
    };
  }

  /**
   * Check if default connection is available
   */
  isDefaultConnectionAvailable(): boolean {
    return this.defaultConfig !== null && this.defaultConfig.enabled;
  }

  /**
   * Get the default provider type
   */
  getDefaultProvider(): AIProvider | null {
    return this.defaultConfig?.provider || null;
  }
}
