import { providerRegistry } from './provider.interface';
import { createMastraProvider } from './mastra.provider';

export const initializeProviders = (): void => {
  providerRegistry.register('openai', (model, config) =>
    createMastraProvider('openai', model, config)
  );

  providerRegistry.register('anthropic', (model, config) =>
    createMastraProvider('anthropic', model, config)
  );

  providerRegistry.register('groq', (model, config) =>
    createMastraProvider('groq', model, config)
  );

  providerRegistry.register('google', (model, config) =>
    createMastraProvider('google', model, config)
  );

  providerRegistry.register('vertex_ai', (model, config) =>
    createMastraProvider('vertex_ai', model, config)
  );
};

initializeProviders();
