import { z } from 'zod';
import { Message, Result } from '../../core/types';
import { Effect } from '../../core/effects';

export interface ProviderCapabilities {
  streaming: boolean;
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

  streamResponse?: (
    messages: Message[],
    systemPrompt: string,
    options?: GenerationOptions
  ) => AsyncIterable<Result<string>>;
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

export class ProviderRegistry {
  private providers = new Map<string, ProviderFactory>();

  register(name: string, factory: ProviderFactory): void {
    this.providers.set(name, factory);
  }

  get(name: string): ProviderFactory | undefined {
    return this.providers.get(name);
  }

  list(): string[] {
    return Array.from(this.providers.keys());
  }
}

export const providerRegistry = new ProviderRegistry();
