import { runMultiAgentConversation } from '../../domains/ai/orchestration/conversation.workflow';
import { getConversation } from '../../domains/conversations/orchestration';
import {
  Message,
  Agent,
  StreamEvent,
  MultiAgentConversationOptions,
  ContinueConversationOptions,
} from '../../domains/ai/types';
import { PublicAgent } from '../../domains/agents/types';
import * as agentService from '../../domains/agents/orchestration/agent.manager';

const SYSTEM_AGENT_ID = 'system';
const SYSTEM_AGENT_NAME = 'System';
const USER_AGENT_ID = 'user';
const USER_AGENT_NAME = 'User';
const DEFAULT_MAX_TURNS = 10;

function toDomainAgent(publicAgent: PublicAgent): Agent {
  return {
    agentId: publicAgent.id,
    name: publicAgent.name,
    prompt: publicAgent.prompt,
    characteristics: publicAgent.characteristics,
    aiConfig: publicAgent.aiConfig,
    chatStyle: publicAgent.chatStyle,
    connectionId: publicAgent.connectionId,
  };
}

async function fetchAndValidateAgents(
  userId: string,
  agentIds: string[]
): Promise<Agent[]> {
  const agentResponses = await Promise.all(
    agentIds.map(id => agentService.getAgentById(userId, id))
  );

  return agentResponses
    .filter(res => res.success && res.data)
    .map(res => toDomainAgent(res.data!));
}

async function* streamMultiAgentConversation(
  options: MultiAgentConversationOptions
): AsyncGenerator<StreamEvent> {
  const {
    conversationId,
    agentIds,
    initialMessage,
    maxTurns,
    userId,
    existingMessages,
  } = options;

  try {
    const validAgents = await fetchAndValidateAgents(userId, agentIds);

    if (validAgents.length === 0) {
      yield {
        type: 'error',
        agentId: SYSTEM_AGENT_ID,
        agentName: SYSTEM_AGENT_NAME,
        message: 'No valid agents found',
      };
      return;
    }

    const eventStream = runMultiAgentConversation(
      conversationId,
      initialMessage,
      validAgents,
      userId,
      maxTurns,
      existingMessages
    );

    for await (const event of eventStream) {
      if (event.type === 'agent_response') {
        yield {
          type: 'message',
          agentId: event.agentId,
          agentName: event.agentName,
          content: event.message,
          timestamp: event.timestamp,
        };
      } else if (event.type === 'status') {
        if (
          event.message.includes('is thinking...') &&
          event.agentId &&
          event.agentName
        ) {
          yield {
            type: 'thinking',
            agentId: event.agentId,
            agentName: event.agentName,
          };
        }
      } else if (event.type === 'error') {
        yield {
          type: 'error',
          agentId: SYSTEM_AGENT_ID,
          agentName: SYSTEM_AGENT_NAME,
          message: event.message,
        };
      }
    }

    yield {
      type: 'complete',
      agentId: SYSTEM_AGENT_ID,
      agentName: SYSTEM_AGENT_NAME,
    };
  } catch (error) {
    console.error('Error in multi-agent conversation:', error);
    yield {
      type: 'error',
      agentId: SYSTEM_AGENT_ID,
      agentName: SYSTEM_AGENT_NAME,
      message: error instanceof Error ? error.message : 'An error occurred',
    };
  }
}

async function* continueMultiAgentConversation(
  options: ContinueConversationOptions
): AsyncGenerator<StreamEvent> {
  const {
    conversationId,
    message,
    agentIds,
    userId,
    maxTurns = DEFAULT_MAX_TURNS,
  } = options;

  try {
    const conversation = await getConversation(userId, conversationId);

    if (!conversation.success || !conversation.data) {
      yield {
        type: 'error',
        agentId: SYSTEM_AGENT_ID,
        agentName: SYSTEM_AGENT_NAME,
        message: 'Conversation not found',
      };
      return;
    }

    const fullHistory: Message[] = [
      ...conversation.data.messages.map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content || '',
        timestamp: msg.createdAt.getTime(),
        agentId: msg.agentId || undefined,
        speaker: msg.speaker || undefined,
      })),
      {
        role: 'user' as const,
        content: message || '',
        speaker: USER_AGENT_NAME,
        timestamp: Date.now(),
      },
    ];

    yield {
      type: 'message',
      agentId: USER_AGENT_ID,
      agentName: USER_AGENT_NAME,
      content: message,
      timestamp: Date.now(),
    };

    const streamOptions: MultiAgentConversationOptions = {
      conversationId,
      agentIds,
      initialMessage: message,
      maxTurns,
      userId,
      existingMessages: fullHistory,
    };

    yield* streamMultiAgentConversation(streamOptions);
  } catch (error) {
    console.error('Error continuing conversation:', error);
    yield {
      type: 'error',
      agentId: SYSTEM_AGENT_ID,
      agentName: SYSTEM_AGENT_NAME,
      message: error instanceof Error ? error.message : 'An error occurred',
    };
  }
}

export const aiService = {
  streamMultiAgentConversation,
  continueMultiAgentConversation,
};
