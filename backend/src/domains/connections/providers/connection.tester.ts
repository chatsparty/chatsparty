import {
  TestConnectionRequest,
  TestConnectionResponse,
  ServiceResponse,
} from '../types';
import { createMastraProvider } from '../../multiagent/infrastructure/providers/mastra.provider';
import { runEffect } from '../../multiagent/core/effects';

export async function testConnection(
  request: TestConnectionRequest
): Promise<ServiceResponse<TestConnectionResponse>> {
  try {
    const provider = createMastraProvider(
      request.provider,
      request.modelName || 'default',
      {
        apiKey: request.apiKey,
        baseUrl: request.baseUrl,
      }
    );

    const effect = provider.generateResponse(
      [{ role: 'user', content: 'Hello!', timestamp: Date.now() }],
      'You are a helpful assistant.',
      { maxTokens: 10 }
    );

    const result = await runEffect(effect);

    if (result.kind === 'error') {
      throw result.error;
    }

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
