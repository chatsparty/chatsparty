import { runMultiAgentConversation } from '../../domains/ai/orchestration/conversation.workflow';
import { agentService } from '../agents/agent.service';
import { toDomainAgent } from '../agents/agent.types';
import { conversationService } from '../conversation/conversation.service';
import { Message } from '../../domains/ai/types';

export interface StreamEvent {
  type: 'thinking' | 'message' | 'error' | 'complete';
  agentId: string;
  agentName: string;
  content?: string;
  message?: string;
  timestamp?: number;
}

interface MultiAgentConversationOptions {
  conversationId: string;
  agentIds: string[];
  initialMessage: string;
  maxTurns: number;
  userId: string;
  fileAttachments?: any;
  projectId?: string;
  existingMessages?: Message[];
}

interface ContinueConversationOptions {
  conversationId: string;
  message: string;
  agentIds: string[];
  userId: string;
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
    const agentResponses = await Promise.all(
      agentIds.map(id => agentService.getAgent(userId, id))
    );

    const validAgents = agentResponses.map(res => toDomainAgent(res));

    if (validAgents.length === 0) {
      yield {
        type: 'error',
        agentId: 'system',
        agentName: 'System',
        message: 'No valid agents found',
      };
      return;
    }

    const agentObjects = validAgents.map(agent => ({
      agentId: agent.agentId,
      name: agent.name,
      prompt: agent.prompt,
      characteristics: agent.characteristics,
      aiConfig: agent.aiConfig,
      chatStyle: agent.chatStyle,
      connectionId: agent.connectionId,
    }));

    const eventStream = await runMultiAgentConversation(
      conversationId,
      initialMessage,
      agentObjects,
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
          agentId: 'system',
          agentName: 'System',
          message: event.message,
        };
      }
    }

    yield {
      type: 'complete',
      agentId: 'system',
      agentName: 'System',
    };
  } catch (error) {
    console.error('Error in multi-agent conversation:', error);
    yield {
      type: 'error',
      agentId: 'system',
      agentName: 'System',
      message: error instanceof Error ? error.message : 'An error occurred',
    };
  }
}

async function* continueMultiAgentConversation(
  options: ContinueConversationOptions
): AsyncGenerator<StreamEvent> {
  const { conversationId, message, agentIds, userId } = options;

  try {
    const conversation = await conversationService.getConversation(
      userId,
      conversationId
    );

    if (!conversation.success || !conversation.data) {
      yield {
        type: 'error',
        agentId: 'system',
        agentName: 'System',
        message: 'Conversation not found',
      };
      return;
    }

    const fullHistory = [
      ...conversation.data.messages,
      {
        role: 'user' as const,
        content: message,
        speaker: 'User',
        timestamp: Date.now(),
      },
    ];

    yield {
      type: 'message',
      agentId: 'user',
      agentName: 'User',
      content: message,
      timestamp: Date.now(),
    };

    const streamOptions: MultiAgentConversationOptions = {
      conversationId,
      agentIds,
      initialMessage: message,
      maxTurns: 10,
      userId,
      existingMessages: fullHistory,
    };

    yield* streamMultiAgentConversation(streamOptions);
  } catch (error) {
    console.error('Error continuing conversation:', error);
    yield {
      type: 'error',
      agentId: 'system',
      agentName: 'System',
      message: error instanceof Error ? error.message : 'An error occurred',
    };
  }
}

export const aiService = {
  streamMultiAgentConversation,
  continueMultiAgentConversation,
};
