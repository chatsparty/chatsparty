import { Agent, Message } from '../../core/types';
import {
  Effect,
  fromPromise,
  recover,
  pure,
  runEffect,
} from '../../core/effects';
import {
  AIProvider,
  providerRegistry,
} from '../../infrastructure/providers/provider.interface';
import {
  createPromptTemplate,
  interpolateTemplate,
  roundRobinStrategy,
  selectControllerAgent,
} from '../../domain/agent';

interface FactoryConfig {
  defaultTimeout: number;
}

export const createProviderForAgent = (agent: Agent): Effect<AIProvider> =>
  fromPromise(async () => {
    const factory = providerRegistry.get(agent.aiConfig.provider);
    if (!factory) {
      throw new Error(`Provider not found: ${agent.aiConfig.provider}`);
    }

    return factory(agent.aiConfig.modelName, {
      apiKey: agent.aiConfig.apiKey,
      baseUrl: agent.aiConfig.baseUrl,
    });
  });

export const createAgentSelector =
  (config: FactoryConfig) =>
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

      const selectedAgentName = result.value.trim();
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

export const createResponseGenerator =
  (config: FactoryConfig) =>
  (agent: Agent, messages: Message[], provider: AIProvider): Effect<string> =>
    fromPromise(async () => {
      const template = createPromptTemplate(
        agent.prompt,
        {
          name: agent.name,
          characteristics: agent.characteristics,
        },
        agent.chatStyle
      );

      const systemPrompt = interpolateTemplate(template);

      const effect = provider.generateResponse(messages, systemPrompt, {
        maxTokens: agent.maxTokens,
        timeout: config.defaultTimeout,
      });

      const result = await runEffect(effect);
      if (result.kind === 'error') {
        throw result.error;
      }

      return result.value as string;
    });

export const createTerminationChecker =
  () =>
  (
    messages: Message[],
    turnCount: number,
    maxTurns: number,
    agents?: Agent[]
  ): Effect<boolean> =>
    fromPromise(async () => {
      if (agents && agents.length > 0) {
        const controller = selectControllerAgent(agents);

        const effect = fromPromise(async () => {
          const provider = await runEffect(createProviderForAgent(controller));
          if (provider.kind === 'error') {
            throw provider.error;
          }

          const recentMessages = messages.slice(-5);
          const conversationContext = recentMessages
            .map(m => `${m.agentId || 'User'}: ${m.content}`)
            .join('\n');

          const systemPrompt = `You are a conversation controller. Analyze the following conversation and determine if it should be terminated.
          
Recent conversation:
${conversationContext}

Determine if this conversation has reached a natural conclusion or if the user's query has been fully addressed.
Consider:
- Has the user's question or request been fully answered?
- Are the participants saying goodbye or indicating the conversation is over?
- Is the conversation going in circles without adding value?
- Has the conversation reached a natural stopping point?

Respond with only "TERMINATE" if the conversation should end, or "CONTINUE" if it should continue.`;

          const responseEffect = provider.value.generateResponse(
            [],
            systemPrompt,
            {
              maxTokens: 10,
              timeout: 5000,
            }
          );

          const result = await runEffect(responseEffect);
          if (result.kind === 'error') {
            throw result.error;
          }

          return result.value.trim().toUpperCase() === 'TERMINATE';
        });

        const terminationResult = await runEffect(
          recover(effect, () => pure(turnCount >= maxTurns))
        );

        return terminationResult.kind === 'ok'
          ? terminationResult.value
          : turnCount >= maxTurns;
      }

      if (turnCount >= maxTurns) {
        return true;
      }

      const lastMessages = messages.slice(-3);
      const farewells = [
        'goodbye',
        'bye',
        'see you',
        'talk later',
        'thanks',
        'thank you',
      ];

      return lastMessages.some(msg =>
        farewells.some(farewell => msg.content.toLowerCase().includes(farewell))
      );
    });
