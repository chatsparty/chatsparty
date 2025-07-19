import { Agent, Message } from '../../core/types';
import { Effect, fromPromise, recover, pure, runEffect } from '../../core/effects';
import { getProvider } from '../../infrastructure/providers/registry';
import { roundRobinStrategy, selectControllerAgent } from '../../domain/agent';
import { ProviderCreationError } from '../../core/domain-errors';

interface AgentSelectionConfig {
  defaultTimeout: number;
}

export const createProviderForAgent = (agent: Agent): Effect<any> =>
  fromPromise(async () => {
    const factory = getProvider(agent.aiConfig.provider);
    if (!factory) {
      throw new ProviderCreationError(agent.aiConfig.provider, 'Provider not found in registry');
    }

    return factory(agent.aiConfig.modelName, {
      apiKey: agent.aiConfig.apiKey,
      baseUrl: agent.aiConfig.baseUrl,
    });
  });

export const createAgentSelector =
  (config: AgentSelectionConfig) =>
  (agents: Agent[], messages: Message[]): Effect<string> => {
    const controller = selectControllerAgent(agents);

    const effect = fromPromise(async () => {
      const provider = await runEffect(createProviderForAgent(controller));
      if (provider.kind === 'error') {
        throw provider.error;
      }

      const systemPrompt = `You are a conversation controller. Your task is to select the next agent to speak based on the conversation history. The last message was: "${
        messages[messages.length - 1].content
      }". Available agents are: ${agents
        .map(a => a.name)
        .join(
          ', '
        )}. Respond with the name of the agent that should speak next.`;

      const responseEffect = provider.value.generateResponse(
        messages,
        systemPrompt,
        {
          maxTokens: 50,
          timeout: config.defaultTimeout,
        }
      );

      const result = await runEffect(responseEffect);
      if (result.kind === 'error') {
        throw result.error;
      }

      const selectedAgentName = (result.value as string).trim();
      const selectedAgent = agents.find(a => a.name === selectedAgentName);

      return selectedAgent
        ? selectedAgent.agentId
        : roundRobinStrategy({
            conversationHistory: messages,
            availableAgents: agents,
            lastSpeaker: messages[messages.length - 1]?.agentId,
          });
    });

    return recover(effect, () =>
      pure(
        roundRobinStrategy({
          conversationHistory: messages,
          availableAgents: agents,
          lastSpeaker: messages[messages.length - 1]?.agentId,
        })
      )
    );
  };