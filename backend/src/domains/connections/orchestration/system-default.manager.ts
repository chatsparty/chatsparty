import { ServiceResponse, AIProvider } from '../types';
import { getFallbackConnection, toPublicFallbackConnection } from '../decision/fallback';
import * as connectionTester from '../providers/connection.tester';

export interface SystemDefaultConnectionResponse {
  enabled: boolean;
  connection: {
    id: string;
    name: string;
    description?: string;
    provider: string;
    modelName: string;
    baseUrl?: string | null;
    isActive: boolean;
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
  } | null;
}

export async function getSystemDefaultConnection(): Promise<
  ServiceResponse<SystemDefaultConnectionResponse>
> {
  try {
    const fallbackResult = await getFallbackConnection();

    if (!fallbackResult.success || !fallbackResult.data) {
      return {
        success: true,
        data: {
          enabled: false,
          connection: null,
        },
      };
    }

    const publicConnection = toPublicFallbackConnection(fallbackResult.data);

    return {
      success: true,
      data: {
        enabled: true,
        connection: {
          id: publicConnection.id,
          name: publicConnection.name,
          description: publicConnection.description || undefined,
          provider: publicConnection.provider,
          modelName: publicConnection.modelName,
          baseUrl: publicConnection.baseUrl || undefined,
          isActive: publicConnection.isActive,
          isDefault: publicConnection.isDefault,
          createdAt: publicConnection.createdAt,
          updatedAt: publicConnection.updatedAt,
        },
      },
    };
  } catch (error) {
    console.error('Error getting system default connection:', error);
    return {
      success: false,
      error: 'Failed to get system default connection',
    };
  }
}

export async function testSystemDefaultConnection(): Promise<
  ServiceResponse<{ success: boolean; message: string }>
> {
  try {
    const fallbackResult = await getFallbackConnection();

    if (!fallbackResult.success || !fallbackResult.data) {
      return {
        success: false,
        error: 'No system default connection configured',
      };
    }

    const testResult = await connectionTester.testConnection({
      provider: fallbackResult.data.provider as AIProvider,
      modelName: fallbackResult.data.modelName,
      apiKey: fallbackResult.data.apiKey || undefined,
      baseUrl: fallbackResult.data.baseUrl || undefined,
    });

    if (!testResult.success) {
      return {
        success: true,
        data: {
          success: false,
          message: testResult.error || 'System default connection test failed',
        },
      };
    }

    return {
      success: true,
      data: {
        success: true,
        message: 'System default connection is working correctly',
      },
    };
  } catch (error) {
    console.error('Error testing system default connection:', error);
    return {
      success: false,
      error: 'Failed to test system default connection',
    };
  }
}