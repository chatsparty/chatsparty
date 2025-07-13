import { AgentManager } from './agent.manager';
import { runMultiAgentConversation } from './multi-agent.workflow';
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
      const validAgents = await Promise.all(
        agentIds.map(id => agentService.getAgent(userId, id))
      );
      
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
          agentId: agent.id,
          name: agent.name,
          prompt: agent.prompt,
          characteristics: agent.characteristics,
          aiConfig: agent.aiConfig,
          chatStyle: agent.chatStyle,
          connectionId: agent.connectionId
        });
      }

      // Convert AgentResponse objects to Agent type for the workflow
      const agentObjects = validAgents.map(agent => ({
        agentId: agent.id,
        name: agent.name,
        prompt: agent.prompt,
        characteristics: agent.characteristics,
        aiConfig: agent.aiConfig,
        chatStyle: agent.chatStyle,
        connectionId: agent.connectionId
      }));

      // Run the conversation
      const eventStream = await runMultiAgentConversation(
        conversationId,
        initialMessage,
        agentObjects,
        userId,
        maxTurns
      );

      // Stream events from the conversation
      for await (const event of eventStream) {
        if (event.type === 'agent_response') {
          // Agent has generated a response
          yield {
            type: 'message',
            agentId: event.agentId,
            agentName: event.agentName,
            content: event.message,
            timestamp: event.timestamp
          };
        } else if (event.type === 'status') {
          // Status update
        } else if (event.type === 'error') {
          // Error occurred
          yield {
            type: 'error',
            agentId: 'system',
            agentName: 'System',
            message: event.message
          };
        } else if (event.type === 'conversation_complete') {
          // Conversation completed
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