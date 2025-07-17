import { getDefaultConnectionConfig } from './fallback.config';
import { ModelProvider } from '../domains/ai/providers/ai.provider.factory';

const fallbackConfig = getDefaultConnectionConfig();

export const SUPERVISOR_MODEL: {
  provider: ModelProvider;
  model: string;
  temperature: number;
  maxTokens: number;
} = {
  provider: (fallbackConfig?.provider || 'vertex_ai') as ModelProvider,
  model: fallbackConfig?.modelName || 'gemini-1.5-flash',
  temperature: 0.3,
  maxTokens: 4096,
};

export const DEFAULT_MARKETPLACE_AI_CONFIG = {
  provider: 'openai',
  modelName: 'gpt-3.5-turbo',
};
