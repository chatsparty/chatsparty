import { ProviderCapabilities } from './provider.interface';

export const PROVIDER_CAPABILITIES: Record<string, ProviderCapabilities> = {
  openai: {
    functionCalling: true,
    structuredOutput: true,
    maxTokens: 4096,
    contextWindow: 128000,
  },
  anthropic: {
    functionCalling: true,
    structuredOutput: true,
    maxTokens: 4096,
    contextWindow: 200000,
  },
  groq: {
    functionCalling: false,
    structuredOutput: true,
    maxTokens: 4096,
    contextWindow: 32000,
  },
  google: {
    functionCalling: true,
    structuredOutput: true,
    maxTokens: 8192,
    contextWindow: 1048576,
  },
  vertex_ai: {
    functionCalling: true,
    structuredOutput: true,
    maxTokens: 8192,
    contextWindow: 1048576,
  },
};

export const DEFAULT_CAPABILITIES: ProviderCapabilities = {
  functionCalling: false,
  structuredOutput: false,
  maxTokens: 2048,
  contextWindow: 8192,
};