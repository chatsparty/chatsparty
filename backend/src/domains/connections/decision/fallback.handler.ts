import { Connection, ServiceResponse } from '../types';
import { ConnectionRepository } from '../repository';
import { getFallbackConnection } from './fallback';

const repository = new ConnectionRepository();

export async function getConnectionWithFallback(
  userId: string,
  provider: string
): Promise<ServiceResponse<Connection>> {
  try {
    const userDefaultConnection = await repository.findUserDefault(
      userId,
      provider
    );

    if (userDefaultConnection?.isActive) {
      return { success: true, data: userDefaultConnection };
    }

    if (!userDefaultConnection) {
      const anyUserConnection = await repository.findFirst(userId, provider);
      if (anyUserConnection?.isActive) {
        return { success: true, data: anyUserConnection };
      }
    }

    const fallbackResult = await getFallbackConnection();

    if (fallbackResult.success && fallbackResult.data) {
      const fallbackConn = fallbackResult.data;
      if (fallbackConn.provider === provider) {
        const systemConnection: Connection = {
          ...fallbackConn,
          userId,
        };
        return {
          success: true,
          data: systemConnection,
        };
      }
    }

    return {
      success: false,
      error: `No active connection found for provider: ${provider}`,
    };
  } catch (error) {
    console.error('Error getting connection with fallback:', error);
    return { success: false, error: 'Failed to get connection' };
  }
}
