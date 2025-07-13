import { Mastra } from '@mastra/core';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { config } from './env';

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

export const mastra = new Mastra({});

export const modelProviders = {
  openai,
  anthropic,
};

export function getModel(provider: 'openai' | 'anthropic', modelName: string) {
  const providerInstance = modelProviders[provider];
  if (!providerInstance) {
    throw new Error(
      `Model provider ${provider} is not configured. Please add the API key.`
    );
  }

  return providerInstance(modelName);
}
