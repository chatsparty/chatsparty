import { Agent, Message } from '../../core/types';
import { Effect, fromPromise, runEffect } from '../../core/effects';
import { AIProvider } from '../../infrastructure/providers/provider.interface';
import { createPromptTemplate, interpolateTemplate } from '../../domain/agent';

interface ResponseGenerationConfig {
  defaultTimeout: number;
}

export const createResponseGenerator =
  (config: ResponseGenerationConfig) =>
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