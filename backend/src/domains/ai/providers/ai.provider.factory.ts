import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createVertex } from '@ai-sdk/google-vertex';
import { createGroq } from '@ai-sdk/groq';
import { config } from '../../../config/env';

const providers = {
  openai: config.OPENAI_API_KEY
    ? createOpenAI({
        apiKey: config.OPENAI_API_KEY,
      })
    : null,

  anthropic: config.ANTHROPIC_API_KEY
    ? createAnthropic({
        apiKey: config.ANTHROPIC_API_KEY,
      })
    : null,

  google: config.GOOGLE_API_KEY
    ? createGoogleGenerativeAI({
        apiKey: config.GOOGLE_API_KEY,
      })
    : null,

  vertex_ai:
    (config.VERTEX_PROJECT_ID && config.VERTEX_LOCATION) ||
    (process.env.DEFAULT_CONNECTION_PROJECT_ID &&
      process.env.DEFAULT_CONNECTION_LOCATION)
      ? createVertex({
          project:
            config.VERTEX_PROJECT_ID ||
            process.env.DEFAULT_CONNECTION_PROJECT_ID,
          location:
            config.VERTEX_LOCATION || process.env.DEFAULT_CONNECTION_LOCATION,
        })
      : null,

  groq: config.GROQ_API_KEY
    ? createGroq({
        apiKey: config.GROQ_API_KEY,
      })
    : null,

  ollama: config.OLLAMA_BASE_URL
    ? createOpenAI({
        apiKey: 'ollama',
        baseURL: config.OLLAMA_BASE_URL || 'http://localhost:11434/v1',
      })
    : null,
};

export type ModelProvider = keyof typeof providers;

export function getModel(provider: ModelProvider, modelName: string) {
  const providerInstance = providers[provider];
  if (!providerInstance) {
    throw new Error(
      `Model provider ${provider} is not configured. Please add the required configuration (API key, project ID, etc.).`
    );
  }

  return providerInstance(modelName);
}
