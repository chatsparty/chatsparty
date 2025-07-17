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
import * as Fallback from '../../domains/connections/fallback';
import { getModel } from '../../domains/ai/providers/ai.provider.factory';
import {
  ConnectionNotFoundError,
  DuplicateConnectionError,
  ConnectionValidationError,
} from '../../utils/errors';
import { ConnectionRepository } from './connection.repository';
import { generateText } from 'ai';

// This service now acts as a thin layer, orchestrating calls to the domain and repository.

const repository = new ConnectionRepository();

async function _validateConnectionName(
  userId: string,
  name: string,
  connectionId?: string
): Promise<void> {
  const existingConnection = await repository.findByName(
    userId,
    name,
    connectionId
  );
  if (existingConnection) {
    throw new DuplicateConnectionError();
  }
}

function _prepareApiKeyData(apiKey: string | null | undefined): {
  apiKey: string | null;
  apiKeyEncrypted: boolean;
} {
  if (apiKey) {
    return { apiKey: encrypt(apiKey), apiKeyEncrypted: true };
  }
  return { apiKey: null, apiKeyEncrypted: false };
}

async function _findUserConnectionOrThrow(
  userId: string,
  connectionId: string
): Promise<Connection> {
  const connection = await repository.findUserConnection(userId, connectionId);
  if (!connection) {
    throw new ConnectionNotFoundError();
  }
  return connection;
}

export async function createConnection(
  userId: string,
  request: CreateConnectionRequest
): Promise<ServiceResponse<Connection>> {
  try {
    await _validateConnectionName(userId, request.name);

    const apiKeyData = _prepareApiKeyData(request.apiKey);

    const connection = await repository.create({
      name: request.name,
      description: request.description,
      provider: request.provider,
      modelName: request.modelName,
      baseUrl: request.baseUrl,
      isActive: request.isActive ?? true,
      isDefault: false, // Defaults are now set explicitly
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

export async function updateConnection(
  userId: string,
  connectionId: string,
  request: UpdateConnectionRequest
): Promise<ServiceResponse<Connection>> {
  try {
    await _findUserConnectionOrThrow(userId, connectionId);

    if (request.name) {
      await _validateConnectionName(userId, request.name, connectionId);
    }

    const updateData: Prisma.ConnectionUpdateInput = { ...request };
    if (request.apiKey !== undefined) {
      Object.assign(updateData, _prepareApiKeyData(request.apiKey));
    }

    const connection = await repository.update(connectionId, updateData);

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

export async function deleteConnection(
  userId: string,
  connectionId: string
): Promise<ServiceResponse<void>> {
  try {
    await _findUserConnectionOrThrow(userId, connectionId);
    await repository.delete(connectionId);
    return { success: true };
  } catch (error: unknown) {
    console.error('Error deleting connection:', error);
    if (error instanceof ConnectionNotFoundError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to delete connection' };
  }
}

export async function getConnectionById(
  userId: string,
  connectionId: string
): Promise<ServiceResponse<ConnectionWithModels>> {
  try {
    const connection = await _findUserConnectionOrThrow(userId, connectionId);
    // This logic can be simplified or moved to a domain helper
    const providerConfig = PROVIDER_CONFIGS[connection.provider as AIProvider];
    const availableModels = providerConfig.supportedModels;

    const connectionWithModels: ConnectionWithModels = {
      ...connection,
      availableModels,
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

export async function listConnections(
  userId: string,
  options: ConnectionQueryOptions & PaginationOptions = {}
): Promise<ServiceResponse<ConnectionListResponse>> {
  try {
    const [connections, total] = await repository.findMany(userId, options);

    const publicConnections = connections.map(c => ({
      id: c.id,
      name: c.name,
      description: c.description,
      provider: c.provider,
      modelName: c.modelName,
      baseUrl: c.baseUrl,
      isActive: c.isActive,
      isDefault: c.isDefault,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

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

export async function testConnection(
  request: TestConnectionRequest
): Promise<ServiceResponse<TestConnectionResponse>> {
  try {
    const model = getModel(request.provider, request.modelName || 'default');
    await generateText({ model, prompt: 'Hello!' });
    return {
      success: true,
      data: { success: true, message: 'Connection successful' },
    };
  } catch (error) {
    console.error('Error testing connection:', error);
    return {
      success: false,
      data: {
        success: false,
        message: 'Connection failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

export async function getDecryptedApiKey(
  userId: string,
  connectionId: string
): Promise<ServiceResponse<string>> {
  try {
    const connection = await repository.findUserConnection(
      userId,
      connectionId
    );

    if (!connection) {
      return { success: false, error: 'Connection not found' };
    }
    if (!connection.apiKey) {
      return { success: false, error: 'No API key found for this connection' };
    }

    const decryptedKey = connection.apiKeyEncrypted
      ? decrypt(connection.apiKey)
      : connection.apiKey;

    return { success: true, data: decryptedKey };
  } catch (error) {
    console.error('Error getting decrypted API key:', error);
    return { success: false, error: 'Failed to decrypt API key' };
  }
}

export async function getConnectionWithFallback(
  userId: string,
  connectionId: string
): Promise<ServiceResponse<Connection>> {
  try {
    const userConnection = await repository.findUserConnection(
      userId,
      connectionId
    );
    if (userConnection?.isActive) {
      return { success: true, data: userConnection };
    }

    // Fallback logic is now only triggered if a specific connection is not found or inactive
    const fallbackResult = await Fallback.getFallbackConnection();

    if (fallbackResult.success && fallbackResult.data) {
      const fallbackConn = fallbackResult.data;
      // Ensure the fallback provider matches the requested connection if possible
      // This part of the logic may need further refinement based on product requirements
      if (
        !userConnection ||
        userConnection.provider === fallbackConn.provider
      ) {
        return {
          success: true,
          data: { ...fallbackConn, userId },
        };
      }
    }

    return {
      success: false,
      error: `Connection not found or inactive: ${connectionId}`,
    };
  } catch (error) {
    console.error('Error getting connection with fallback:', error);
    return { success: false, error: 'Failed to get connection' };
  }
}

export async function setDefaultConnection(
  userId: string,
  connectionId: string
): Promise<ServiceResponse<Connection>> {
  try {
    const connection = await repository.findUserConnection(
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

    const updatedConnection = await repository.setUserDefault(connectionId);
    return { success: true, data: updatedConnection };
  } catch (error) {
    console.error('Error setting default connection:', error);
    return {
      success: false,
      error: 'Failed to set default connection',
    };
  }
}
