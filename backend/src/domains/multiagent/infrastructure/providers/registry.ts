import { ProviderFactory } from './provider.interface';
import { openaiProviderFactory } from './openai.provider';
import { anthropicProviderFactory } from './anthropic.provider';
import { groqProviderFactory } from './groq.provider';
import { googleProviderFactory } from './google.provider';
import { vertexAIProviderFactory } from './vertex-ai.provider';

const providerFactories = new Map<string, ProviderFactory>([
  ['openai', openaiProviderFactory],
  ['anthropic', anthropicProviderFactory],
  ['groq', groqProviderFactory],
  ['google', googleProviderFactory],
  ['vertex_ai', vertexAIProviderFactory],
]);

export const providerRegistry: ReadonlyMap<string, ProviderFactory> =
  providerFactories;

export const getProvider = (name: string): ProviderFactory | undefined => {
  return providerRegistry.get(name);
};

export const listProviders = (): string[] => {
  return Array.from(providerRegistry.keys());
};
