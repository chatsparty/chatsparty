import { ProviderFactory } from './provider.interface';
import { createMastraProvider } from './mastra.provider';

const providerFactories = new Map<string, ProviderFactory>([
  [
    'openai',
    (modelName, config) => createMastraProvider('openai', modelName, config),
  ],
  [
    'anthropic',
    (modelName, config) => createMastraProvider('anthropic', modelName, config),
  ],
  [
    'groq',
    (modelName, config) => createMastraProvider('groq', modelName, config),
  ],
  [
    'google',
    (modelName, config) => createMastraProvider('google', modelName, config),
  ],
  [
    'vertex_ai',
    (modelName, config) => createMastraProvider('vertex_ai', modelName, config),
  ],
]);

export const providerRegistry: ReadonlyMap<string, ProviderFactory> =
  providerFactories;

export const getProvider = (name: string): ProviderFactory | undefined => {
  return providerRegistry.get(name);
};

export const listProviders = (): string[] => {
  return Array.from(providerRegistry.keys());
};

export const createProvider = (
  name: string,
  modelName: string,
  config: any
) => {
  const factory = providerRegistry.get(name);
  if (!factory) {
    throw new Error(`Provider ${name} not found in registry`);
  }
  return factory(modelName, config);
};
