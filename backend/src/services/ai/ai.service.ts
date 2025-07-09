import { AgentManager } from './agent.manager';
import { runMultiAgentConversation } from './conversation.workflow';
import { Agent } from '@prisma/client';
import { agentService } from '../agents/agent.service';

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
}

interface ContinueConversationOptions {
  conversationId: string;
  message: string;
  agentIds: string[];
  userId: string;
}

class AIService {
  private agentManager: AgentManager;

  constructor() {
    this.agentManager = new AgentManager();
  }

  async *streamMultiAgentConversation(
    options: MultiAgentConversationOptions
  ): AsyncGenerator<StreamEvent> {
    const { conversationId, agentIds, initialMessage, maxTurns, userId } = options;

    try {
      // Load agents from database
      const agents = await Promise.all(
        agentIds.map(id => agentService.getAgent(id))
      );

      const validAgents = agents.filter((agent): agent is Agent => agent !== null);
      
      if (validAgents.length === 0) {
        yield {
          type: 'error',
          agentId: 'system',
          agentName: 'System',
          message: 'No valid agents found'
        };
        return;
      }

      // Register agents with the manager
      for (const agent of validAgents) {
        await this.agentManager.registerAgent({
          id: agent.id,
          name: agent.name,
          prompt: agent.prompt,
          aiConfig: agent.ai_config as any,
          chatStyle: agent.chat_style as any
        });
      }

      // Run the conversation
      const result = await runMultiAgentConversation(
        conversationId,
        initialMessage,
        validAgents.map(a => a.id),
        maxTurns
      );

      // Stream events from the conversation
      if (result.stream) {
        for await (const event of result.stream) {
          if ('delta' in event) {
            // This is a message chunk
            const agentId = event.agentId || 'unknown';
            const agent = validAgents.find(a => a.id === agentId);
            
            yield {
              type: 'message',
              agentId,
              agentName: agent?.name || 'Unknown Agent',
              content: event.delta,
              timestamp: Date.now()
            };
          } else if ('status' in event && event.status === 'thinking') {
            // Agent is thinking
            const agent = validAgents.find(a => a.id === event.agentId);
            yield {
              type: 'thinking',
              agentId: event.agentId || 'unknown',
              agentName: agent?.name || 'Unknown Agent'
            };
          }
        }
      }

      // Emit completion event
      yield {
        type: 'complete',
        agentId: 'system',
        agentName: 'System'
      };

    } catch (error) {
      console.error('Error in multi-agent conversation:', error);
      yield {
        type: 'error',
        agentId: 'system',
        agentName: 'System',
        message: error instanceof Error ? error.message : 'An error occurred'
      };
    }
  }

  async *continueMultiAgentConversation(
    options: ContinueConversationOptions
  ): AsyncGenerator<StreamEvent> {
    const { conversationId, message, agentIds, userId } = options;

    try {
      // For continuing a conversation, we can run it again with the new message
      // This is a simplified implementation - in production you might want to
      // maintain conversation state differently
      
      yield {
        type: 'message',
        agentId: 'user',
        agentName: 'User',
        content: message,
        timestamp: Date.now()
      };

      // Run the conversation with the new message
      const streamOptions: MultiAgentConversationOptions = {
        conversationId,
        agentIds,
        initialMessage: message,
        maxTurns: 10, // Allow more turns for continuation
        userId
      };

      // Delegate to the main stream method
      yield* this.streamMultiAgentConversation(streamOptions);

    } catch (error) {
      console.error('Error continuing conversation:', error);
      yield {
        type: 'error',
        agentId: 'system',
        agentName: 'System',
        message: error instanceof Error ? error.message : 'An error occurred'
      };
    }
  }
}

// Create singleton instance
export const aiService = new AIService();