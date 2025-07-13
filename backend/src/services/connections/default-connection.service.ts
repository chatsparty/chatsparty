import { 
  Connection, 
  PublicConnection, 
  ServiceResponse,
  AIProvider
} from './connection.types';
import { getDefaultConnectionConfig, DefaultConnectionConfig } from '../../config/default-connection.config';
import { VertexAIProvider } from '../ai/providers/vertex-ai.provider';

export interface DefaultConnection extends Omit<Connection, 'userId'> {
  isSystemDefault: true;
}

export class DefaultConnectionService {
  private defaultConfig: DefaultConnectionConfig | null;

  constructor() {
    this.defaultConfig = getDefaultConnectionConfig();
  }

  /**
   * Get the system default connection if enabled
   */
  async getSystemDefaultConnection(): Promise<ServiceResponse<DefaultConnection | null>> {
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
        apiKeyEncrypted: false, // System defaults are not encrypted
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
      if (!this.defaultConfig || 
          !this.defaultConfig.enabled || 
          this.defaultConfig.provider !== provider) {
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

      // Test based on provider
      switch (this.defaultConfig.provider) {
        case 'vertex_ai':
          return await this.testVertexAIDefaultConnection();
        
        // Add other providers as needed
        default:
          return {
            success: false,
            error: `Default connection testing not implemented for provider: ${this.defaultConfig.provider}`,
          };
      }
    } catch (error) {
      console.error('Error testing default connection:', error);
      return {
        success: false,
        error: 'Failed to test default connection',
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

      switch (this.defaultConfig.provider) {
        case 'vertex_ai':
          return {
            success: true,
            data: {
              provider: 'vertex_ai',
              projectId: this.defaultConfig.projectId,
              location: this.defaultConfig.location,
              modelName: this.defaultConfig.modelName,
              apiKey: this.defaultConfig.apiKey,
            },
          };

        case 'openai':
          return {
            success: true,
            data: {
              provider: 'openai',
              apiKey: this.defaultConfig.apiKey,
              modelName: this.defaultConfig.modelName,
              baseUrl: this.defaultConfig.baseUrl,
            },
          };

        case 'anthropic':
          return {
            success: true,
            data: {
              provider: 'anthropic',
              apiKey: this.defaultConfig.apiKey,
              modelName: this.defaultConfig.modelName,
              baseUrl: this.defaultConfig.baseUrl,
            },
          };

        default:
          return {
            success: false,
            error: `Configuration not implemented for provider: ${this.defaultConfig.provider}`,
          };
      }
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
  toPublicDefaultConnection(connection: DefaultConnection): PublicConnection & { isSystemDefault: boolean } {
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

  private async testVertexAIDefaultConnection(): Promise<ServiceResponse<boolean>> {
    try {
      if (!this.defaultConfig?.projectId || !this.defaultConfig?.location) {
        return {
          success: false,
          error: 'Vertex AI configuration incomplete: missing projectId or location',
        };
      }

      const vertexProvider = new VertexAIProvider({
        projectId: this.defaultConfig.projectId,
        location: this.defaultConfig.location,
        modelName: this.defaultConfig.modelName,
        apiKey: this.defaultConfig.apiKey,
      });

      const result = await vertexProvider.testConnection();
      
      return {
        success: true,
        data: result.success,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error testing Vertex AI',
      };
    }
  }
}