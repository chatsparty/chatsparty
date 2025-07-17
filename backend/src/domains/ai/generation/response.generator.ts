import { CoreMessage, generateText, LanguageModel } from 'ai';
import { Agent, Message } from '../types';
import { getModel } from '../providers/ai.provider.factory';
import { buildAgentSystemPrompt } from './prompt.builder';

async function _retryGenerateAgentResponse(
  agent: Agent,
  messages: CoreMessage[],
  model: LanguageModel
): Promise<string> {
  console.warn(`Agent ${agent.name} generated empty response. Retrying...`);

  const isGoogleModel =
    agent.aiConfig.provider === 'google' ||
    agent.aiConfig.provider === 'vertex_ai';

  const retryMessages: CoreMessage[] = isGoogleModel
    ? [
        ...messages,
        {
          role: 'user',
          content:
            'Please continue the conversation with a substantive response.',
        },
      ]
    : [
        ...messages,
        {
          role: 'system',
          content:
            'Please provide a substantive response to continue the conversation.',
        },
      ];

  try {
    const retryResult = await generateText({
      model,
      messages: retryMessages,
      system: buildAgentSystemPrompt(agent),
      temperature: 0.8,
      maxTokens: agent.maxTokens || 1000,
    });

    if (!retryResult.text || retryResult.text.trim() === '') {
      console.error(`Agent ${agent.name} generated empty response after retry`);
      return 'Hey everyone!';
    }

    return retryResult.text;
  } catch (retryError) {
    console.error(`Error during retry for agent ${agent.name}:`, retryError);
    return 'Hey there!';
  }
}

export async function generateAgentResponse(
  agent: Agent,
  conversationHistory: Message[]
): Promise<string> {
  const messages: CoreMessage[] = conversationHistory.map(msg => ({
    role: msg.role as 'user' | 'assistant' | 'system',
    content: msg.content,
  }));

  const model = getModel(agent.aiConfig.provider, agent.aiConfig.modelName);

  try {
    const result = await generateText({
      model,
      messages,
      system: buildAgentSystemPrompt(agent),
      temperature: 0.7,
      maxTokens: agent.maxTokens || 1000,
    });

    if (!result.text || result.text.trim() === '') {
      return _retryGenerateAgentResponse(agent, messages, model);
    }

    return result.text;
  } catch (error) {
    console.error(`Error generating text for agent ${agent.name}:`, error);
    throw error;
  }
}
