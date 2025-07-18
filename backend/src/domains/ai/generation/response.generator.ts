import { Agent, Message } from '../types';
import { getAIProvider } from '../providers/ai.provider.factory';
import { buildAgentSystemPrompt } from './prompt.builder';
import { createLogger } from '../../../config/logger';

const logger = createLogger('response.generator');

export async function generateResponse(
  agent: Agent,
  _allAgents: Agent[],
  conversationHistory: Message[]
): Promise<string> {
  const systemPrompt = buildAgentSystemPrompt(agent);
  const provider = await getAIProvider(agent.aiConfig, agent.connectionId);

  try {
    const response = await provider.generateResponse(
      conversationHistory,
      systemPrompt,
      {
        maxTokens: agent.maxTokens,
      }
    );
    return response;
  } catch (error) {
    logger.error(
      `Error generating response for agent ${agent.name}:`,
      error
    );
    return 'I am unable to respond at the moment.';
  }
}
