import { runMultiAgentConversation } from './orchestration/conversation.workflow';
import { getConversation } from '../conversations/orchestration';
import {
  Message,
  Agent,
  StreamEvent,
  MultiAgentConversationOptions,
  ContinueConversationOptions,
} from './types';
import * as agentService from '../agents/orchestration/agent.manager';

const SYSTEM_AGENT_ID = 'system';
const SYSTEM_AGENT_NAME = 'System';
const DEFAULT_MAX_TURNS = 10;

async function* streamConversation(
  options: MultiAgentConversationOptions | ContinueConversationOptions
): AsyncGenerator<StreamEvent> {
  const { conversationId, agentIds, userId, maxTurns = DEFAULT_MAX_TURNS } = options;
  const initialMessage =
    'initialMessage' in options ? options.initialMessage : '';

  try {
    const agentResponses = await Promise.all(
      agentIds.map(id => agentService.getAgentById(userId, id))
    );

    const validAgents = agentResponses
      .filter(res => res.success && res.data)
      .map(res => ({
        ...res.data!,
        agentId: res.data!.id,
      } as Agent));

    if (validAgents.length === 0) {
      yield {
        type: 'error',
        agentId: SYSTEM_AGENT_ID,
        agentName: SYSTEM_AGENT_NAME,
        message: 'No valid agents found',
      };
      return;
    }

    let existingMessages: Message[] = [];
    if ('message' in options) {
      const conversation = await getConversation(userId, conversationId);
      if (conversation.success && conversation.data) {
        existingMessages = conversation.data.messages.map(msg => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content || '',
          timestamp: msg.createdAt.getTime(),
          agentId: msg.agentId || undefined,
          speaker: msg.speaker || undefined,
        }));
      }
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

export const aiService = {
  streamMultiAgentConversation: streamConversation,
  continueMultiAgentConversation: streamConversation,
};
