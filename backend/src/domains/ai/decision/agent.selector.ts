import {
  Agent,
  Message,
  AgentSelection,
  AgentSelectionSchema,
} from '../types';
import { getAIProvider } from '../providers/ai.provider.factory';
import { createLogger } from '../../../config/logger';

const logger = createLogger('agent.selector');

const AGENT_SELECTION_PROMPT_TEMPLATE = `
You are an expert moderator in a multi-agent conversation.
Your role is to select the next agent to speak based on the conversation history and the agents' characteristics.

Here are the available agents:
{agents_summary}

Conversation History (most recent messages first):
{conversation_history}

Based on the last message and the overall conversation, which agent should speak next?
Consider the agents' expertise, the flow of the conversation, and who is best equipped to respond to the last message.
If the last message was a question, who is it directed to? If it's a general statement, who should logically follow up?
Do not select an agent that has just spoken unless it's a direct question to them.
The user is not an agent, do not select them.
If you are unsure, select the agent that is most likely to move the conversation forward.
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

export async function selectNextAgent(
  agents: Agent[],
  conversationHistory: Message[],
  controllerAgent: Agent
): Promise<AgentSelection> {
  if (agents.length === 1) {
    return { agentId: agents[0].agentId, reasoning: 'Only one agent available' };
  }

  const systemPrompt = AGENT_SELECTION_PROMPT_TEMPLATE.replace(
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
    const selection = await provider.generateStructuredResponse(
      [{ role: 'user', content: 'Please select the next speaker.' }],
      systemPrompt,
      AgentSelectionSchema
    );
    return selection;
  } catch (error) {
    logger.error('Error selecting next agent:', error);
    // Fallback strategy: select a random agent that wasn't the last speaker
    const lastSpeakerId =
      conversationHistory[conversationHistory.length - 1]?.agentId;
    const availableAgents = agents.filter(
      agent => agent.agentId !== lastSpeakerId
    );
    const fallbackAgent =
      availableAgents[Math.floor(Math.random() * availableAgents.length)];
    return {
      agentId: fallbackAgent.agentId,
      reasoning: 'Fell back to random selection due to an error.',
    };
  }
}
