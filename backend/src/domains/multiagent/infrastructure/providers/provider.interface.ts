import { z } from 'zod';
import { Message } from '../../core/types';
import { Effect } from '../../core/effects';

export interface ProviderCapabilities {
  functionCalling: boolean;
  structuredOutput: boolean;
  maxTokens: number;
  contextWindow: number;
}

export interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  retryAttempts?: number;
}

export interface AIProvider {
  readonly name: string;
  readonly capabilities: ProviderCapabilities;

  generateResponse: (
    messages: Message[],
    systemPrompt: string,
    options?: GenerationOptions
  ) => Effect<string>;

  generateStructuredResponse: <T>(
    messages: Message[],
    systemPrompt: string,
    schema: z.ZodSchema<T>,
    options?: GenerationOptions
  ) => Effect<T>;
}

export interface GenerationOptions {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stopSequences?: string[];
  seed?: number;
  timeout?: number;
}

export type ProviderFactory = (
  modelName: string,
  config: ProviderConfig
) => AIProvider;

export type ProviderRegistry = ReadonlyMap<string, ProviderFactory>;
