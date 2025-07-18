export * from './base.provider';
export * from './mastra.provider';
export {
  AIProvider,
  ProviderCapabilities,
  ProviderConfig,
  GenerationOptions,
} from './provider.interface';

export const createProviderRegistry = () => {
  const registry = new Map<
    string,
    (modelName: string, config: ProviderConfig) => AIProvider
  >();

  registerMastraProviders(registry);

  return {
    get: (name: string) => registry.get(name),
    list: () => Array.from(registry.keys()),
    create: (name: string, modelName: string, config: ProviderConfig) => {
      const factory = registry.get(name);
      if (!factory) {
        throw new Error(`Provider ${name} not found`);
      }
      return factory(modelName, config);
    },
  };
};

import { ProviderConfig, AIProvider } from './provider.interface';
import { registerMastraProviders } from './mastra.provider';
