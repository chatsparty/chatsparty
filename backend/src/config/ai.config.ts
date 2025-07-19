import { getDefaultConnectionConfig } from './fallback.config';
import { ModelConfigurationSchema } from '../domains/multiagent/core/types';
import { z } from 'zod';

const fallbackConfig = getDefaultConnectionConfig();

type ModelProvider = z.infer<typeof ModelConfigurationSchema>['provider'];

export const SUPERVISOR_MODEL: {
  provider: ModelProvider;
  model: string;
  temperature: number;
  maxTokens: number;
} = {
  provider: (fallbackConfig?.provider || 'vertex_ai') as ModelProvider,
  model: fallbackConfig?.modelName || 'gemini-2.5-flash',
  temperature: 0.3,
  maxTokens: 4096,
};

export const DEFAULT_MARKETPLACE_AI_CONFIG = {
  provider: 'openai',
  modelName: 'gpt-3.5-turbo',
};
