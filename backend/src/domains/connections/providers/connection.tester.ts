import {
  TestConnectionRequest,
  TestConnectionResponse,
  ServiceResponse,
} from '../types';
import { getModel } from '../../ai/providers/ai.provider.factory';
import { generateText } from 'ai';

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
