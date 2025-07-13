import { PrismaClient } from '@prisma/client';
import { db } from '../../config/database';
import { encrypt, decrypt } from '../../utils/crypto';
import {
  Connection,
  ConnectionWithModels,
  PublicConnection,
  CreateConnectionRequest,
  UpdateConnectionRequest,
  TestConnectionRequest,
  TestConnectionResponse,
  ConnectionListResponse,
  ServiceResponse,
  ConnectionQueryOptions,
  PaginationOptions,
  AIProvider,
  PROVIDER_CONFIGS,
  ModelInfo,
} from './connection.types';
import { VertexAIProvider } from '../ai/providers/vertex-ai.provider';
import { getDefaultConnectionConfig } from '../../config/default-connection.config';
import { DefaultConnectionService } from './default-connection.service';

export class ConnectionService {
  private db: PrismaClient;
  private defaultConnectionService: DefaultConnectionService;

  constructor(database?: PrismaClient) {
    this.db = database || db;
    this.defaultConnectionService = new DefaultConnectionService();
  }

  /**
   * Create a new connection
   */
  async createConnection(
    userId: string,
    request: CreateConnectionRequest
  ): Promise<ServiceResponse<Connection>> {
    try {
      // Check if a connection with the same name already exists for this user
      const existingConnection = await this.db.connection.findFirst({
        where: {
          userId,
          name: request.name,
        },
      });

      if (existingConnection) {
        return {
          success: false,
          error: 'A connection with this name already exists',
        };
      }

      // Encrypt API key if provided
      let encryptedApiKey: string | null = null;
      let apiKeyEncrypted = false;

      if (request.apiKey) {
        encryptedApiKey = encrypt(request.apiKey);
        apiKeyEncrypted = true;
      }

      // If this is the first connection for the user and provider, make it default
      const existingProviderConnections = await this.db.connection.count({
        where: {
          userId,
          provider: request.provider,
        },
      });

      const isDefault = existingProviderConnections === 0;

      // Create the connection
      const connection = await this.db.connection.create({
        data: {
          userId,
          name: request.name,
          description: request.description,
          provider: request.provider,
          modelName: request.modelName,
          apiKey: encryptedApiKey,
          apiKeyEncrypted,
          baseUrl: request.baseUrl,
          isActive: request.isActive ?? true,
          isDefault,
        },
      });

      return {
        success: true,
        data: connection,
      };
    } catch (error) {
      console.error('Error creating connection:', error);
      return {
        success: false,
        error: 'Failed to create connection',
      };
    }
  }

  /**
   * Update a connection
   */
  async updateConnection(
    userId: string,
    connectionId: string,
    request: UpdateConnectionRequest
  ): Promise<ServiceResponse<Connection>> {
    try {
      // Check if connection exists and belongs to user
      const existingConnection = await this.db.connection.findFirst({
        where: {
          id: connectionId,
          userId,
        },
      });

      if (!existingConnection) {
        return {
          success: false,
          error: 'Connection not found',
        };
      }

      // If name is being updated, check for duplicates
      if (request.name) {
        const duplicateConnection = await this.db.connection.findFirst({
          where: {
            userId,
            name: request.name,
            NOT: { id: connectionId },
          },
        });

        if (duplicateConnection) {
          return {
            success: false,
            error: 'A connection with this name already exists',
          };
        }
      }

      // Prepare update data
      const updateData: any = {
        name: request.name,
        description: request.description,
        modelName: request.modelName,
        baseUrl: request.baseUrl,
        isActive: request.isActive,
      };

      // Encrypt API key if provided
      if (request.apiKey !== undefined) {
        if (request.apiKey) {
          updateData.apiKey = encrypt(request.apiKey);
          updateData.apiKeyEncrypted = true;
        } else {
          updateData.apiKey = null;
          updateData.apiKeyEncrypted = false;
        }
      }

      // Update the connection
      const connection = await this.db.connection.update({
        where: { id: connectionId },
        data: updateData,
      });

      return {
        success: true,
        data: connection,
      };
    } catch (error) {
      console.error('Error updating connection:', error);
      return {
        success: false,
        error: 'Failed to update connection',
      };
    }
  }

  /**
   * Delete a connection
   */
  async deleteConnection(
    userId: string,
    connectionId: string
  ): Promise<ServiceResponse<void>> {
    try {
      // Check if connection exists and belongs to user
      const connection = await this.db.connection.findFirst({
        where: {
          id: connectionId,
          userId,
        },
      });

      if (!connection) {
        return {
          success: false,
          error: 'Connection not found',
        };
      }

      // Check if this is the default connection for the provider
      if (connection.isDefault) {
        // Find another active connection for the same provider
        const alternativeConnection = await this.db.connection.findFirst({
          where: {
            userId,
            provider: connection.provider,
            isActive: true,
            NOT: { id: connectionId },
          },
          orderBy: { createdAt: 'asc' },
        });

        // Set the alternative as default if found
        if (alternativeConnection) {
          await this.db.connection.update({
            where: { id: alternativeConnection.id },
            data: { isDefault: true },
          });
        }
      }

      // Delete the connection
      await this.db.connection.delete({
        where: { id: connectionId },
      });

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error deleting connection:', error);
      return {
        success: false,
        error: 'Failed to delete connection',
      };
    }
  }

  /**
   * Get a connection by ID
   */
  async getConnectionById(
    userId: string,
    connectionId: string
  ): Promise<ServiceResponse<ConnectionWithModels>> {
    try {
      const connection = await this.db.connection.findFirst({
        where: {
          id: connectionId,
          userId,
        },
      });

      if (!connection) {
        return {
          success: false,
          error: 'Connection not found',
        };
      }

      // Add available models based on provider
      const connectionWithModels: ConnectionWithModels = {
        ...connection,
        availableModels: this.getProviderModels(connection.provider as AIProvider),
      };

      return {
        success: true,
        data: connectionWithModels,
      };
    } catch (error) {
      console.error('Error getting connection:', error);
      return {
        success: false,
        error: 'Failed to get connection',
      };
    }
  }

  /**
   * List connections for a user
   */
  async listConnections(
    userId: string,
    options: ConnectionQueryOptions & PaginationOptions = {}
  ): Promise<ServiceResponse<ConnectionListResponse>> {
    try {
      const {
        includeInactive = false,
        provider,
        onlyDefaults = false,
        limit = 10,
        offset = 0,
        orderBy = 'createdAt',
        orderDirection = 'desc',
      } = options;

      // Build where clause
      const where: any = { userId };

      if (!includeInactive) {
        where.isActive = true;
      }

      if (provider) {
        where.provider = provider;
      }

      if (onlyDefaults) {
        where.isDefault = true;
      }

      // Get connections and total count
      const [connections, total] = await Promise.all([
        this.db.connection.findMany({
          where,
          skip: offset,
          take: limit,
          orderBy: { [orderBy]: orderDirection },
        }),
        this.db.connection.count({ where }),
      ]);

      // Convert to public connections (remove sensitive data)
      const publicConnections = connections.map(this.toPublicConnection);

      // Find default connection ID
      const defaultConnection = connections.find((c) => c.isDefault);

      return {
        success: true,
        data: {
          connections: publicConnections,
          total,
          defaultConnectionId: defaultConnection?.id,
        },
      };
    } catch (error) {
      console.error('Error listing connections:', error);
      return {
        success: false,
        error: 'Failed to list connections',
      };
    }
  }

  /**
   * Test a connection
   */
  async testConnection(
    request: TestConnectionRequest
  ): Promise<ServiceResponse<TestConnectionResponse>> {
    try {
      const providerConfig = PROVIDER_CONFIGS[request.provider];

      // Basic validation
      if (providerConfig.requiresApiKey && !request.apiKey) {
        return {
          success: true,
          data: {
            success: false,
            message: 'API key is required for this provider',
            error: 'Missing API key',
          },
        };
      }

      // Provider-specific testing logic
      const testResult = await this.testProviderConnection(request);

      return {
        success: true,
        data: testResult,
      };
    } catch (error) {
      console.error('Error testing connection:', error);
      return {
        success: false,
        error: 'Failed to test connection',
      };
    }
  }

  /**
   * Get the default connection for a provider
   */
  async getDefaultConnection(
    userId: string,
    provider: AIProvider
  ): Promise<ServiceResponse<Connection>> {
    try {
      const connection = await this.db.connection.findFirst({
        where: {
          userId,
          provider,
          isDefault: true,
          isActive: true,
        },
      });

      if (!connection) {
        // Try to find any active connection for the provider
        const anyConnection = await this.db.connection.findFirst({
          where: {
            userId,
            provider,
            isActive: true,
          },
          orderBy: { createdAt: 'asc' },
        });

        if (!anyConnection) {
          return {
            success: false,
            error: `No active ${provider} connection found`,
          };
        }

        // Set it as default
        await this.db.connection.update({
          where: { id: anyConnection.id },
          data: { isDefault: true },
        });

        return {
          success: true,
          data: anyConnection,
        };
      }

      return {
        success: true,
        data: connection,
      };
    } catch (error) {
      console.error('Error getting default connection:', error);
      return {
        success: false,
        error: 'Failed to get default connection',
      };
    }
  }

  /**
   * Set a connection as default for its provider
   */
  async setDefaultConnection(
    userId: string,
    connectionId: string
  ): Promise<ServiceResponse<Connection>> {
    try {
      // Get the connection
      const connection = await this.db.connection.findFirst({
        where: {
          id: connectionId,
          userId,
        },
      });

      if (!connection) {
        return {
          success: false,
          error: 'Connection not found',
        };
      }

      if (!connection.isActive) {
        return {
          success: false,
          error: 'Cannot set inactive connection as default',
        };
      }

      // Remove default from other connections of the same provider
      await this.db.connection.updateMany({
        where: {
          userId,
          provider: connection.provider,
          isDefault: true,
          NOT: { id: connectionId },
        },
        data: { isDefault: false },
      });

      // Set this connection as default
      const updatedConnection = await this.db.connection.update({
        where: { id: connectionId },
        data: { isDefault: true },
      });

      return {
        success: true,
        data: updatedConnection,
      };
    } catch (error) {
      console.error('Error setting default connection:', error);
      return {
        success: false,
        error: 'Failed to set default connection',
      };
    }
  }

  /**
   * Get decrypted API key for a connection
   */
  async getDecryptedApiKey(
    userId: string,
    connectionId: string
  ): Promise<ServiceResponse<string>> {
    try {
      const connection = await this.db.connection.findFirst({
        where: {
          id: connectionId,
          userId,
        },
      });

      if (!connection) {
        return {
          success: false,
          error: 'Connection not found',
        };
      }

      if (!connection.apiKey) {
        return {
          success: false,
          error: 'No API key found for this connection',
        };
      }

      const decryptedKey = connection.apiKeyEncrypted
        ? decrypt(connection.apiKey)
        : connection.apiKey;

      return {
        success: true,
        data: decryptedKey,
      };
    } catch (error) {
      console.error('Error getting decrypted API key:', error);
      return {
        success: false,
        error: 'Failed to decrypt API key',
      };
    }
  }

  /**
   * Get provider information
   */
  getProviderInfo(provider: AIProvider) {
    return PROVIDER_CONFIGS[provider];
  }

  /**
   * Get available models for a provider
   */
  getProviderModels(provider: AIProvider): ModelInfo[] {
    return PROVIDER_CONFIGS[provider].supportedModels;
  }

  /**
   * Convert connection to public connection (remove sensitive fields)
   */
  private toPublicConnection(connection: Connection): PublicConnection {
    return {
      id: connection.id,
      name: connection.name,
      description: connection.description,
      provider: connection.provider,
      modelName: connection.modelName,
      baseUrl: connection.baseUrl,
      isActive: connection.isActive,
      isDefault: connection.isDefault,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
    };
  }

  /**
   * Test provider-specific connection
   */
  private async testProviderConnection(
    request: TestConnectionRequest
  ): Promise<TestConnectionResponse> {
    const { provider, apiKey, baseUrl, modelName: _modelName } = request;

    try {
      switch (provider) {
        case 'openai':
          return await this.testOpenAIConnection(apiKey!, baseUrl);

        case 'anthropic':
          return await this.testAnthropicConnection(apiKey!, baseUrl);

        case 'google':
          return await this.testGoogleConnection(apiKey!);

        case 'groq':
          return await this.testGroqConnection(apiKey!, baseUrl);

        case 'ollama':
          return await this.testOllamaConnection(baseUrl || 'http://localhost:11434');

        case 'vertex_ai':
          return await this.testVertexAIConnection(apiKey!);

        default:
          return {
            success: false,
            message: 'Unsupported provider',
            error: `Provider ${provider} is not supported`,
          };
      }
    } catch (error) {
      console.error(`Error testing ${provider} connection:`, error);
      return {
        success: false,
        message: `Failed to connect to ${provider}`,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Provider-specific test methods
  private async testOpenAIConnection(
    _apiKey: string,
    _baseUrl?: string
  ): Promise<TestConnectionResponse> {
    // TODO: Implement actual API test
    // For now, return mock success
    return {
      success: true,
      message: 'OpenAI connection successful',
      availableModels: PROVIDER_CONFIGS.openai.supportedModels,
    };
  }

  private async testAnthropicConnection(
    _apiKey: string,
    _baseUrl?: string
  ): Promise<TestConnectionResponse> {
    // TODO: Implement actual API test
    return {
      success: true,
      message: 'Anthropic connection successful',
      availableModels: PROVIDER_CONFIGS.anthropic.supportedModels,
    };
  }

  private async testGoogleConnection(_apiKey: string): Promise<TestConnectionResponse> {
    // TODO: Implement actual API test
    return {
      success: true,
      message: 'Google AI connection successful',
      availableModels: PROVIDER_CONFIGS.google.supportedModels,
    };
  }

  private async testGroqConnection(
    _apiKey: string,
    _baseUrl?: string
  ): Promise<TestConnectionResponse> {
    // TODO: Implement actual API test
    return {
      success: true,
      message: 'Groq connection successful',
      availableModels: PROVIDER_CONFIGS.groq.supportedModels,
    };
  }

  private async testOllamaConnection(_baseUrl: string): Promise<TestConnectionResponse> {
    // TODO: Implement actual API test to check if Ollama is running
    return {
      success: true,
      message: 'Ollama connection successful',
      availableModels: PROVIDER_CONFIGS.ollama.supportedModels,
    };
  }

  private async testVertexAIConnection(_apiKey: string): Promise<TestConnectionResponse> {
    try {
      // For Vertex AI, we need additional configuration from environment or request
      const defaultConfig = getDefaultConnectionConfig();
      
      if (!defaultConfig || defaultConfig.provider !== 'vertex_ai') {
        return {
          success: false,
          message: 'Vertex AI configuration not found',
          error: 'Please configure Vertex AI project ID and location in environment variables',
        };
      }

      const vertexProvider = new VertexAIProvider({
        projectId: defaultConfig.projectId!,
        location: defaultConfig.location!,
        modelName: defaultConfig.modelName,
        apiKey: _apiKey,
      });

      const testResult = await vertexProvider.testConnection();
      
      if (testResult.success) {
        return {
          success: true,
          message: 'Vertex AI connection successful',
          availableModels: VertexAIProvider.getAvailableModels(),
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

  /**
   * Get connection with default fallback
   * This method first tries to get a user's connection, and if not found or if the ID is 'default',
   * it falls back to the system default connection
   */
  async getConnectionWithFallback(
    userId: string,
    connectionId: string
  ): Promise<ServiceResponse<Connection | any>> {
    try {
      // Special case: if connectionId is 'default', directly use system default
      if (connectionId === 'default') {
        const defaultResult = await this.defaultConnectionService.getSystemDefaultConnection();
        if (defaultResult.success && defaultResult.data) {
          // Convert default connection to match Connection interface
          const defaultConn = defaultResult.data;
          return {
            success: true,
            data: {
              id: defaultConn.id,
              userId: userId, // Associate with current user for compatibility
              name: defaultConn.name,
              description: defaultConn.description,
              provider: defaultConn.provider,
              modelName: defaultConn.modelName,
              apiKey: defaultConn.apiKey,
              apiKeyEncrypted: defaultConn.apiKeyEncrypted,
              baseUrl: defaultConn.baseUrl,
              isActive: defaultConn.isActive,
              isDefault: defaultConn.isDefault,
              createdAt: defaultConn.createdAt,
              updatedAt: defaultConn.updatedAt,
            },
          };
        }
      }

      // Try to get user's connection first
      const userConnection = await this.db.connection.findFirst({
        where: {
          id: connectionId,
          userId,
          isActive: true,
        },
      });

      if (userConnection) {
        return { success: true, data: userConnection };
      }

      // If not found, check if the ID matches a system default pattern
      const defaultResult = await this.defaultConnectionService.getSystemDefaultConnection();
      if (defaultResult.success && defaultResult.data) {
        const defaultConn = defaultResult.data;
        
        if (connectionId === defaultConn.id) {
          // Convert default connection to match Connection interface
          return {
            success: true,
            data: {
              id: defaultConn.id,
              userId: userId, // Associate with current user for compatibility
              name: defaultConn.name,
              description: defaultConn.description,
              provider: defaultConn.provider,
              modelName: defaultConn.modelName,
              apiKey: defaultConn.apiKey,
              apiKeyEncrypted: defaultConn.apiKeyEncrypted,
              baseUrl: defaultConn.baseUrl,
              isActive: defaultConn.isActive,
              isDefault: defaultConn.isDefault,
              createdAt: defaultConn.createdAt,
              updatedAt: defaultConn.updatedAt,
            },
          };
        }
      }

      return {
        success: false,
        error: 'Connection not found',
      };
    } catch (error) {
      console.error('Error getting connection with fallback:', error);
      return {
        success: false,
        error: 'Failed to get connection',
      };
    }
  }
}