import {
  Agent,
  Message,
  TerminationDecision,
  TerminationDecisionSchema,
} from '../types';
import { getAIProvider } from '../providers/ai.provider.factory';
import { createLogger } from '../../../config/logger';

const logger = createLogger('conversation.terminator');

const TERMINATION_PROMPT_TEMPLATE = `
You are an expert moderator in a multi-agent conversation.
Your role is to decide if the conversation should be terminated based on the history and the agents' interactions.

A conversation should be terminated if:
- The main topic has been resolved.
- The conversation is going in circles or has become unproductive.
- A natural conclusion has been reached.
- A user explicitly asks to end the conversation.

Here are the available agents:
{agents_summary}

Conversation History (most recent messages first):
{conversation_history}

Based on the conversation history, should the conversation be terminated?
Consider the overall goal of the conversation and whether it has been met.
`;

function formatAgents(agents: Agent[]): string {
  return agents
    .map(
      agent =>
        `- ${agent.name} (ID: ${agent.agentId}): ${agent.characteristics}`
    )
    .join('\n');
}

function formatHistory(messages: Message[]): string {
  return messages
    .map(msg => `${msg.speaker || msg.role}: ${msg.content}`)
    .join('\n');
}

export async function shouldTerminateConversation(
  agents: Agent[],
  conversationHistory: Message[],
  controllerAgent: Agent,
  currentTurn: number,
  maxTurns: number
): Promise<TerminationDecision> {
  if (currentTurn >= maxTurns) {
    return {
      shouldTerminate: true,
      reason: `Maximum number of turns (${maxTurns}) reached.`,
    };
  }

  const systemPrompt = TERMINATION_PROMPT_TEMPLATE.replace(
    '{agents_summary}',
    formatAgents(agents)
  ).replace(
    '{conversation_history}',
    formatHistory(conversationHistory.slice(-10))
  );

  const provider = await getAIProvider(
    controllerAgent.aiConfig,
    controllerAgent.connectionId
  );

  try {
    const decision = await provider.generateStructuredResponse(
      [{ role: 'user', content: 'Should this conversation terminate?' }],
      systemPrompt,
      TerminationDecisionSchema
    );
    return decision;
  } catch (error) {
    logger.error('Error deciding conversation termination:', error);
    // Fallback strategy: do not terminate on error
    return {
      shouldTerminate: false,
      reason: 'Fell back to not terminating due to an error.',
    };
  }
}
