import { z } from 'zod';
import { Agent, Message } from '../../core/types';
import {
  Effect,
  fromPromise,
  recover,
  pure,
  runEffect,
} from '../../core/effects';
import { getProvider } from '../../infrastructure/providers/registry';
import { roundRobinStrategy, selectControllerAgent } from '../../domain/agent';
import { ProviderCreationError } from '../../core/domain-errors';

interface AgentSelectionConfig {
  defaultTimeout: number;
  maxTokens: number;
}

const AgentSelectionSchema = z.object({
  selectedAgentId: z
    .string()
    .describe('The ID of the agent that should speak next'),
  reasoning: z
    .string()
    .optional()
    .describe('Brief explanation for the selection'),
});

type AgentSelectionResponse = z.infer<typeof AgentSelectionSchema>;

export const createProviderForAgent = (agent: Agent): Effect<any> =>
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

export const createAgentSelector =
  (config: AgentSelectionConfig) =>
  (agents: Agent[], messages: Message[]): Effect<string> => {
    const controller = selectControllerAgent(agents);

    const effect = fromPromise(async () => {
      const provider = await runEffect(createProviderForAgent(controller));
      if (provider.kind === 'error') {
        throw provider.error;
      }

      const systemPrompt = `You are a conversation controller responsible for orchestrating a multi-agent conversation. 
Your task is to analyze the conversation history and determine which agent should speak next to create a natural, coherent dialogue.

Current conversation context:
- Last message: "${messages[messages.length - 1].content}"
- Last speaker: ${messages[messages.length - 1].agentId || 'User'}

Available agents:
${agents.map(a => `- Agent ID: ${a.agentId}, Name: ${a.name}, Role: "${a.prompt.substring(0, 100)}..."`).join('\n')}

Consider:
1. The flow and context of the conversation
2. Each agent's expertise and role (based on their prompts)
3. Who would naturally respond to the last message
4. Avoiding repetitive back-and-forth between the same agents

You must select one of the available agents by their exact agent ID.`;

      const responseEffect = provider.value.generateStructuredResponse(
        messages,
        systemPrompt,
        AgentSelectionSchema,
        {
          maxTokens: config.maxTokens,
          timeout: config.defaultTimeout,
        }
      );

      const result = await runEffect(responseEffect);
      if (result.kind === 'error') {
        throw result.error;
      }

      const response = result.value as AgentSelectionResponse;
      const { selectedAgentId } = response;
      const selectedAgent = agents.find(a => a.agentId === selectedAgentId);

      return selectedAgent
        ? selectedAgentId
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
