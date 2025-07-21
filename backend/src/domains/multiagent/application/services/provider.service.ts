import { Agent } from '../../core/types';
import { Effect, fromPromise } from '../../core/effects';
import { getProvider } from '../../infrastructure/providers/registry';
import { ProviderCreationError } from '../../core/domain-errors';
import { AIProvider } from '../../infrastructure/providers/provider.interface';

export const createProviderForAgent = (agent: Agent): Effect<AIProvider> =>
  fromPromise(async () => {
    const factory = getProvider(agent.aiConfig.provider);
    if (!factory) {
      throw new ProviderCreationError(
        agent.aiConfig.provider,
        'Provider not found in registry'
      );
    }

    return factory(agent.aiConfig.modelName, {
      apiKey: agent.aiConfig.apiKey,
      baseUrl: agent.aiConfig.baseUrl,
    });
  });