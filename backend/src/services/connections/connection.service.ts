import { Prisma } from '@prisma/client';
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
import { SystemDefaultConnectionService } from './system-default-connection.service';
import { ProviderFactory } from './providers/provider.factory';
import {
  ConnectionNotFoundError,
  DuplicateConnectionError,
  ConnectionValidationError,
} from '../../utils/errors';

import { ConnectionRepository } from './connection.repository';

export class ConnectionService {
  private repository: ConnectionRepository;
  private systemDefaultConnectionService: SystemDefaultConnectionService;

  constructor(
    repository?: ConnectionRepository,
    systemDefaultConnectionService?: SystemDefaultConnectionService
  ) {
    this.repository = repository || new ConnectionRepository();
    this.systemDefaultConnectionService =
      systemDefaultConnectionService || new SystemDefaultConnectionService();
  }

  /**
   * Create a new connection
   */
  async createConnection(
    userId: string,
    request: CreateConnectionRequest
  ): Promise<ServiceResponse<Connection>> {
    try {
      await this._validateConnectionName(userId, request.name);

      const apiKeyData = this._prepareApiKeyData(request.apiKey);
      const isDefault = await this.isFirstConnection(userId, request.provider);

      const connection = await this.repository.create({
        name: request.name,
        description: request.description,
        provider: request.provider,
        modelName: request.modelName,
        baseUrl: request.baseUrl,
        isActive: request.isActive ?? true,
        isDefault,
        ...apiKeyData,
        user: {
          connect: {
            id: userId,
          },
        },
      });

      return { success: true, data: connection };
    } catch (error: unknown) {
      console.error('Error creating connection:', error);
      if (
        error instanceof DuplicateConnectionError ||
        error instanceof ConnectionValidationError
      ) {
        return { success: false, error: error.message };
      }
      return { success: false, error: 'Failed to create connection' };
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
      await this._findUserConnectionOrThrow(userId, connectionId);

      if (request.name) {
        await this._validateConnectionName(userId, request.name, connectionId);
      }

      const updateData: Prisma.ConnectionUpdateInput = { ...request };
      if (request.apiKey !== undefined) {
        Object.assign(updateData, this._prepareApiKeyData(request.apiKey));
      }

      const connection = await this.repository.update(connectionId, updateData);

      return { success: true, data: connection };
    } catch (error: unknown) {
      console.error('Error updating connection:', error);
      if (
        error instanceof ConnectionNotFoundError ||
        error instanceof DuplicateConnectionError
      ) {
        return { success: false, error: error.message };
      }
      return { success: false, error: 'Failed to update connection' };
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
      const connection = await this._findUserConnectionOrThrow(
        userId,
        connectionId
      );
      await this.handleDeletedConnection(userId, connection);
      await this.repository.delete(connectionId);
      return { success: true };
    } catch (error: unknown) {
      console.error('Error deleting connection:', error);
      if (error instanceof ConnectionNotFoundError) {
        return { success: false, error: error.message };
      }
      return { success: false, error: 'Failed to delete connection' };
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
      const connection = await this._findUserConnectionOrThrow(
        userId,
        connectionId
      );
      const provider = ProviderFactory.createProvider(
        connection.provider as AIProvider
      );
      const connectionWithModels: ConnectionWithModels = {
        ...connection,
        availableModels: provider.getAvailableModels(),
      };
      return { success: true, data: connectionWithModels };
    } catch (error: unknown) {
      console.error('Error getting connection:', error);
      if (error instanceof ConnectionNotFoundError) {
        return { success: false, error: error.message };
      }
      return { success: false, error: 'Failed to get connection' };
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

      const where: Prisma.ConnectionWhereInput = { userId };

      if (!includeInactive) {
        where.isActive = true;
      }

      if (provider) {
        where.provider = provider;
      }

      if (onlyDefaults) {
        where.isDefault = true;
      }

      const [connections, total] = await this.repository.findMany(userId, {
        ...options,
        includeInactive,
        provider,
        onlyDefaults,
        limit,
        offset,
        orderBy,
        orderDirection,
      });

      const publicConnections = connections.map(this.toPublicConnection);

      const defaultConnection = connections.find(c => c.isDefault);

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

      const provider = ProviderFactory.createProvider(request.provider);
      const testResult = await provider.testConnection(request as any);

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
      return await this.getUserDefaultConnection(userId, provider);
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
      return await this.setUserDefaultConnection(userId, connectionId);
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
      const connection = await this.repository.findUserConnection(
        userId,
        connectionId
      );

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
    const providerInstance = ProviderFactory.createProvider(provider);
    return providerInstance.getAvailableModels();
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
   * Get connection with default fallback
   * This method first tries to get a user's connection, and if not found or if the ID is 'default',
   * it falls back to the system default connection
   */
  async getConnectionWithFallback(
    userId: string,
    connectionId: string
  ): Promise<ServiceResponse<Connection>> {
    try {
      if (connectionId !== 'default') {
        const userConnection = await this._findUserConnection(
          userId,
          connectionId
        );
        if (userConnection?.isActive) {
          return { success: true, data: userConnection };
        }
      }

      const defaultResult =
        await this.systemDefaultConnectionService.getSystemDefaultConnection();

      if (defaultResult.success && defaultResult.data) {
        const defaultConn = defaultResult.data;
        return {
          success: true,
          data: this.toUserConnection(defaultConn, userId),
        };
      }

      return { success: false, error: 'Connection not found' };
    } catch (error) {
      console.error('Error getting connection with fallback:', error);
      return { success: false, error: 'Failed to get connection' };
    }
  }

  private toUserConnection(defaultConn: any, userId: string): Connection {
    return {
      id: defaultConn.id,
      userId: userId,
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
    };
  }

  private async _findUserConnection(
    userId: string,
    connectionId: string
  ): Promise<Connection | null> {
    return this.repository.findUserConnection(userId, connectionId);
  }
  private async _validateConnectionName(
    userId: string,
    name: string,
    connectionId?: string
  ): Promise<void> {
    const existingConnection = await this.repository.findByName(
      userId,
      name,
      connectionId
    );
    if (existingConnection) {
      throw new DuplicateConnectionError();
    }
  }

  private _prepareApiKeyData(apiKey: string | null | undefined): {
    apiKey: string | null;
    apiKeyEncrypted: boolean;
  } {
    if (apiKey) {
      return { apiKey: encrypt(apiKey), apiKeyEncrypted: true };
    }
    return { apiKey: null, apiKeyEncrypted: false };
  }

  private async _findUserConnectionOrThrow(
    userId: string,
    connectionId: string,
    prisma?: Prisma.TransactionClient
  ): Promise<Connection> {
    const connection = await this._findUserConnection(userId, connectionId);
    if (!connection) {
      throw new ConnectionNotFoundError();
    }
    return connection;
  }

  private async isFirstConnection(
    userId: string,
    provider: AIProvider
  ): Promise<boolean> {
    const count = await this.repository.getCount(userId, provider);
    return count === 0;
  }

  private async handleDeletedConnection(
    userId: string,
    connection: Connection
  ): Promise<void> {
    if (connection.isDefault) {
      const alternative = await this.repository.findAlternativeDefault(
        userId,
        connection.provider,
        connection.id
      );

      if (alternative) {
        await this.repository.update(alternative.id, { isDefault: true });
      }
    }
  }

  private async getUserDefaultConnection(
    userId: string,
    provider: AIProvider
  ): Promise<ServiceResponse<Connection>> {
    const connection = await this.repository.findUserDefault(userId, provider);

    if (connection) {
      return { success: true, data: connection };
    }

    const anyConnection = await this.repository.findFirst(userId, provider);

    if (!anyConnection) {
      return {
        success: false,
        error: `No active ${provider} connection found`,
      };
    }

    await this.repository.update(anyConnection.id, { isDefault: true });

    return { success: true, data: anyConnection };
  }

  private async setUserDefaultConnection(
    userId: string,
    connectionId: string
  ): Promise<ServiceResponse<Connection>> {
    const connection = await this.repository.findUserConnection(
      userId,
      connectionId
    );

    if (!connection) {
      return { success: false, error: 'Connection not found' };
    }

    if (!connection.isActive) {
      return {
        success: false,
        error: 'Cannot set inactive connection as default',
      };
    }

    const updatedConnection =
      await this.repository.setUserDefault(connectionId);

    return { success: true, data: updatedConnection };
  }
}
