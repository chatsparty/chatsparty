import { Mastra } from 'mastra';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { config } from './env';

// Initialize AI model providers
const openai = config.OPENAI_API_KEY
  ? createOpenAI({
      apiKey: config.OPENAI_API_KEY,
    })
  : null;

const anthropic = config.ANTHROPIC_API_KEY
  ? createAnthropic({
      apiKey: config.ANTHROPIC_API_KEY,
    })
  : null;

// Initialize Mastra
export const mastra = new Mastra({
  // Add your Mastra configuration here
  // This will be expanded as we implement agents and tools
});

// Export model providers for direct use
export const modelProviders = {
  openai,
  anthropic,
};

// Helper to get a model by provider and model name
export function getModel(provider: 'openai' | 'anthropic', modelName: string) {
  const providerInstance = modelProviders[provider];
  if (!providerInstance) {
    throw new Error(`Model provider ${provider} is not configured. Please add the API key.`);
  }
  
  return providerInstance(modelName);
}