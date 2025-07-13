import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../config/database';
import { agentManager } from '../ai/agent.manager';
import { 
  runMultiAgentConversation 
} from '../ai/conversation.workflow';
import { Agent, Message } from '../ai/types';
import { AgentService } from '../agents/agent.service';
import { CreditService } from '../credit/credit.service';
import { ModelPricingService } from '../credit/model-pricing.service';
import { ConversationService } from './conversation.service';
import {
  ChatRequest,
  ChatResponse,
  MultiAgentChatRequest,
  MultiAgentChatResponse,
  ServiceResponse,
  StreamEvent,
  MessageStreamEvent,
  ErrorStreamEvent,
  CompleteStreamEvent,
  CreditUpdateStreamEvent,
  ChatSession,
} from './chat.types';
import { TransactionReason } from '../credit/credit.types';

export class ChatService {
  private db: PrismaClient;
  private agentService: AgentService;
  private creditService: CreditService;
  private modelPricingService: ModelPricingService;
  private conversationService: ConversationService;
  private activeSessions: Map<string, ChatSession>;

  constructor(database?: PrismaClient) {
    this.db = database || db;
    this.agentService = new AgentService(this.db);
    this.creditService = new CreditService(this.db);
    this.modelPricingService = new ModelPricingService(this.db);
    this.conversationService = new ConversationService(this.db);
    this.activeSessions = new Map();
  }

  /**
   * Single agent chat
   */
  async chat(
    userId: string,
    request: ChatRequest
  ): Promise<ServiceResponse<ChatResponse | AsyncGenerator<StreamEvent>>> {
    try {
      // Get or create conversation
      let conversationId = request.conversationId;
      let conversation;

      if (conversationId) {
        const convResult = await this.conversationService.getConversation(userId, conversationId);
        if (!convResult.success) {
          return {
            success: false,
            error: 'Conversation not found',
          };
        }
        conversation = convResult.data!;
      } else {
        conversationId = uuidv4();
      }

      // Get agent if specified
      let agent: Agent | null = null;
      let agentRecord = null;

      if (request.agentId) {
        const agentResult = await this.agentService.getAgent(userId, request.agentId);
        if (!agentResult.success) {
          return {
            success: false,
            error: 'Agent not found',
          };
        }
        agentRecord = agentResult.data!;
        
        // Convert to AI agent format
        agent = {
          agentId: agentRecord.id,
          name: agentRecord.name,
          prompt: agentRecord.prompt,
          characteristics: agentRecord.characteristics,
          aiConfig: agentRecord.aiConfig,
          chatStyle: agentRecord.chatStyle,
          connectionId: agentRecord.connectionId,
          voiceConfig: agentRecord.voiceConfig,
        };
      }

      // Create message
      const userMessage: Message = {
        role: 'user',
        content: request.message,
        speaker: 'user',
        timestamp: Date.now(),
      };

      // If streaming is enabled
      if (request.stream) {
        return {
          success: true,
          data: this.streamSingleAgentResponse(
            userId,
            conversationId,
            userMessage,
            agent,
            conversation
          ),
        };
      }

      // Non-streaming response
      const response = await this.generateSingleAgentResponse(
        userId,
        conversationId,
        userMessage,
        agent,
        conversation
      );

      return response;
    } catch (error) {
      console.error('Error in chat:', error);
      return {
        success: false,
        error: 'Failed to process chat request',
      };
    }
  }

  /**
   * Multi-agent chat
   */
  async multiAgentChat(
    userId: string,
    request: MultiAgentChatRequest
  ): Promise<ServiceResponse<MultiAgentChatResponse | AsyncGenerator<StreamEvent>>> {
    try {
      // Validate and get agents
      const agents: Agent[] = [];
      for (const agentId of request.agentIds) {
        const agentResult = await this.agentService.getAgent(userId, agentId);
        if (!agentResult.success) {
          return {
            success: false,
            error: `Agent ${agentId} not found`,
          };
        }
        
        const agentRecord = agentResult.data!;
        agents.push({
          agentId: agentRecord.id,
          name: agentRecord.name,
          prompt: agentRecord.prompt,
          characteristics: agentRecord.characteristics,
          aiConfig: agentRecord.aiConfig,
          chatStyle: agentRecord.chatStyle,
          connectionId: agentRecord.connectionId,
          voiceConfig: agentRecord.voiceConfig,
        });
      }

      // Create or get conversation
      const conversationId = request.conversationId || uuidv4();
      
      if (!request.conversationId) {
        // Create new conversation
        const title = `Chat with ${agents.map(a => a.name).join(', ')}`;
        await this.conversationService.createConversation(
          userId,
          title,
          request.agentIds,
          { maxTurns: request.maxTurns }
        );
      }

      // If streaming is enabled
      if (request.stream) {
        return {
          success: true,
          data: this.streamMultiAgentConversation(
            userId,
            conversationId,
            request.message,
            agents,
            request.maxTurns
          ),
        };
      }

      // Non-streaming response
      const response = await this.runMultiAgentConversation(
        userId,
        conversationId,
        request.message,
        agents,
        request.maxTurns
      );

      return response;
    } catch (error) {
      console.error('Error in multi-agent chat:', error);
      return {
        success: false,
        error: 'Failed to process multi-agent chat request',
      };
    }
  }

  /**
   * Generate single agent response (non-streaming)
   */
  private async generateSingleAgentResponse(
    userId: string,
    conversationId: string,
    userMessage: Message,
    agent: Agent | null,
    conversation?: any
  ): Promise<ServiceResponse<ChatResponse>> {
    try {
      // Check user credits
      const balanceResult = await this.creditService.getCreditBalance(userId);
      if (!balanceResult.success || !balanceResult.data) {
        return {
          success: false,
          error: 'Failed to check credit balance',
        };
      }

      if (balanceResult.data.creditsBalance <= 0) {
        return {
          success: false,
          error: 'Insufficient credits',
        };
      }

      // Register agent if provided
      if (agent) {
        await agentManager.registerAgent(agent);
      }

      // Get conversation history
      const messages: Message[] = conversation?.messages || [];
      messages.push(userMessage);

      // Generate response
      const response = agent
        ? await agentManager.generateAgentResponse(agent.agentId, messages, userId)
        : await this.generateDefaultResponse(messages, userId);

      // Create assistant message
      const assistantMessage: Message = {
        role: 'assistant',
        content: response,
        speaker: agent?.name || 'Assistant',
        agentId: agent?.agentId,
        timestamp: Date.now(),
      };

      // Update conversation
      messages.push(assistantMessage);
      if (conversation) {
        await this.conversationService.updateMessages(conversationId, messages);
      } else {
        await this.conversationService.createConversation(
          userId,
          userMessage.content.substring(0, 50) + '...',
          agent ? [agent.agentId] : [],
          {}
        );
        await this.conversationService.updateMessages(conversationId, messages);
      }

      // Calculate and deduct credits
      const creditsUsed = await this.calculateCreditsUsed(
        agent?.aiConfig.provider || 'openai',
        agent?.aiConfig.modelName || 'gpt-3.5-turbo',
        userMessage.content.length,
        response.length
      );

      await this.creditService.useCredits({
        userId,
        amount: creditsUsed,
        reason: TransactionReason.AI_CHAT,
        metadata: {
          conversationId,
          agentId: agent?.agentId,
          model: agent?.aiConfig.modelName || 'gpt-3.5-turbo',
        },
      });

      // Cleanup
      if (agent) {
        await agentManager.unregisterAgent(agent.agentId);
      }

      return {
        success: true,
        data: {
          message: response,
          agentId: agent?.agentId,
          agentName: agent?.name,
          conversationId,
          timestamp: assistantMessage.timestamp!,
          creditsUsed,
        },
      };
    } catch (error) {
      console.error('Error generating response:', error);
      return {
        success: false,
        error: 'Failed to generate response',
      };
    }
  }

  /**
   * Stream single agent response
   */
  private async *streamSingleAgentResponse(
    userId: string,
    conversationId: string,
    userMessage: Message,
    agent: Agent | null,
    conversation?: any
  ): AsyncGenerator<StreamEvent> {
    try {
      // Check credits
      const balanceResult = await this.creditService.getCreditBalance(userId);
      if (!balanceResult.success || !balanceResult.data || balanceResult.data.creditsBalance <= 0) {
        yield {
          type: 'error',
          data: { error: 'Insufficient credits' },
          timestamp: Date.now(),
        } as ErrorStreamEvent;
        return;
      }

      // Register agent
      if (agent) {
        await agentManager.registerAgent(agent);
      }

      // Get messages
      const messages: Message[] = conversation?.messages || [];
      messages.push(userMessage);

      // Generate streaming response
      let fullResponse = '';

      // TODO: Implement actual streaming from the AI model
      // For now, we'll simulate streaming by chunking the response
      const response = agent
        ? await agentManager.generateAgentResponse(agent.agentId, messages, userId)
        : await this.generateDefaultResponse(messages, userId);

      // Simulate streaming
      const words = response.split(' ');
      for (let i = 0; i < words.length; i++) {
        const chunk = words.slice(0, i + 1).join(' ');
        fullResponse = chunk;

        yield {
          type: 'message',
          data: {
            content: chunk,
            agentId: agent?.agentId,
            agentName: agent?.name,
            isComplete: i === words.length - 1,
          },
          timestamp: Date.now(),
        } as MessageStreamEvent;

        // Small delay to simulate streaming
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Save conversation
      const assistantMessage: Message = {
        role: 'assistant',
        content: fullResponse,
        speaker: agent?.name || 'Assistant',
        agentId: agent?.agentId,
        timestamp: Date.now(),
      };

      messages.push(assistantMessage);
      if (conversation) {
        await this.conversationService.updateMessages(conversationId, messages);
      } else {
        await this.conversationService.createConversation(
          userId,
          userMessage.content.substring(0, 50) + '...',
          agent ? [agent.agentId] : [],
          {}
        );
        await this.conversationService.updateMessages(conversationId, messages);
      }

      // Calculate credits
      const creditsUsed = await this.calculateCreditsUsed(
        agent?.aiConfig.provider || 'openai',
        agent?.aiConfig.modelName || 'gpt-3.5-turbo',
        userMessage.content.length,
        fullResponse.length
      );

      // Deduct credits
      await this.creditService.useCredits({
        userId,
        amount: creditsUsed,
        reason: TransactionReason.AI_CHAT,
        metadata: {
          conversationId,
          agentId: agent?.agentId,
          model: agent?.aiConfig.modelName || 'gpt-3.5-turbo',
        },
      });

      // Send credit update
      const newBalance = await this.creditService.getCreditBalance(userId);
      yield {
        type: 'credit_update',
        data: {
          creditsUsed,
          remainingCredits: newBalance.data?.creditsBalance || 0,
        },
        timestamp: Date.now(),
      } as CreditUpdateStreamEvent;

      // Send completion event
      yield {
        type: 'complete',
        data: {
          conversationId,
          totalCreditsUsed: creditsUsed,
        },
        timestamp: Date.now(),
      } as CompleteStreamEvent;

      // Cleanup
      if (agent) {
        await agentManager.unregisterAgent(agent.agentId);
      }
    } catch (error) {
      yield {
        type: 'error',
        data: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: Date.now(),
      } as ErrorStreamEvent;
    }
  }

  /**
   * Stream multi-agent conversation
   */
  private async *streamMultiAgentConversation(
    userId: string,
    conversationId: string,
    initialMessage: string,
    agents: Agent[],
    maxTurns?: number
  ): AsyncGenerator<StreamEvent> {
    try {
      let totalCreditsUsed = 0;
      const messages: Message[] = [];

      // Create initial user message
      const userMessage: Message = {
        role: 'user',
        content: initialMessage,
        speaker: 'user',
        timestamp: Date.now(),
      };
      messages.push(userMessage);

      // Save initial message
      await this.conversationService.updateMessages(conversationId, messages);

      // Run workflow
      const eventGenerator = await runMultiAgentConversation(
        conversationId,
        initialMessage,
        agents,
        userId,
        maxTurns
      );

      for await (const event of eventGenerator) {
        if (event.type === 'agent_response') {
          // Calculate credits for this response
          const agent = agents.find(a => a.agentId === event.agentId);
          if (agent) {
            const creditsUsed = await this.calculateCreditsUsed(
              agent.aiConfig.provider,
              agent.aiConfig.modelName,
              100, // Approximate input tokens
              event.message.length
            );

            totalCreditsUsed += creditsUsed;

            // Deduct credits
            await this.creditService.useCredits({
              userId,
              amount: creditsUsed,
              reason: TransactionReason.AI_CHAT,
              metadata: {
                conversationId,
                agentId: agent.agentId,
                model: agent.aiConfig.modelName,
              },
            });
          }

          // Add message to conversation
          const agentMessage: Message = {
            role: 'assistant',
            content: event.message,
            speaker: event.agentName,
            agentId: event.agentId,
            timestamp: event.timestamp,
          };
          messages.push(agentMessage);
          await this.conversationService.addMessage(conversationId, agentMessage);

          // Stream message event
          yield {
            type: 'message',
            data: {
              content: event.message,
              agentId: event.agentId,
              agentName: event.agentName,
              isComplete: true,
            },
            timestamp: event.timestamp,
          } as MessageStreamEvent;

          // Send credit update
          const balance = await this.creditService.getCreditBalance(userId);
          yield {
            type: 'credit_update',
            data: {
              creditsUsed: totalCreditsUsed,
              remainingCredits: balance.data?.creditsBalance || 0,
            },
            timestamp: Date.now(),
          } as CreditUpdateStreamEvent;
        } else if (event.type === 'error') {
          yield {
            type: 'error',
            data: { error: event.message },
            timestamp: Date.now(),
          } as ErrorStreamEvent;
        }
      }

      // Send completion event
      yield {
        type: 'complete',
        data: {
          conversationId,
          totalCreditsUsed,
        },
        timestamp: Date.now(),
      } as CompleteStreamEvent;
    } catch (error) {
      yield {
        type: 'error',
        data: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: Date.now(),
      } as ErrorStreamEvent;
    }
  }

  /**
   * Run multi-agent conversation (non-streaming)
   */
  private async runMultiAgentConversation(
    userId: string,
    conversationId: string,
    initialMessage: string,
    agents: Agent[],
    maxTurns?: number
  ): Promise<ServiceResponse<MultiAgentChatResponse>> {
    try {
      const messages: ConversationMessage[] = [];
      let totalCreditsUsed = 0;

      // Run workflow
      const eventGenerator = await runMultiAgentConversation(
        conversationId,
        initialMessage,
        agents,
        userId,
        maxTurns
      );

      for await (const event of eventGenerator) {
        if (event.type === 'agent_response') {
          messages.push({
            speaker: event.agentName,
            message: event.message,
            timestamp: event.timestamp,
            agentId: event.agentId,
            messageType: 'message',
          });

          // Calculate credits
          const agent = agents.find(a => a.agentId === event.agentId);
          if (agent) {
            const creditsUsed = await this.calculateCreditsUsed(
              agent.aiConfig.provider,
              agent.aiConfig.modelName,
              100,
              event.message.length
            );
            totalCreditsUsed += creditsUsed;

            // Deduct credits
            await this.creditService.useCredits({
              userId,
              amount: creditsUsed,
              reason: TransactionReason.AI_CHAT,
              metadata: {
                conversationId,
                agentId: agent.agentId,
                model: agent.aiConfig.modelName,
              },
            });
          }
        }
      }

      return {
        success: true,
        data: {
          conversationId,
          messages,
          totalCreditsUsed,
          conversationComplete: true,
        },
      };
    } catch (error) {
      console.error('Error in multi-agent conversation:', error);
      return {
        success: false,
        error: 'Failed to run multi-agent conversation',
      };
    }
  }

  /**
   * Generate default response when no agent is specified
   */
  private async generateDefaultResponse(
    _messages: Message[],
    _userId?: string
  ): Promise<string> {
    // This is a placeholder - in production, you would use a default AI model
    return "I'm a default assistant. Please specify an agent for a more personalized response.";
  }

  /**
   * Calculate credits used for a response
   */
  private async calculateCreditsUsed(
    provider: string,
    modelName: string,
    inputLength: number,
    outputLength: number
  ): Promise<number> {
    // Approximate token count (rough estimate)
    const inputTokens = Math.ceil(inputLength / 4);
    const outputTokens = Math.ceil(outputLength / 4);

    const pricingResult = await this.modelPricingService.getModelCost(provider, modelName);
    if (!pricingResult.success || !pricingResult.data) {
      // Default cost if model not found
      return 1;
    }

    const pricing = pricingResult.data;
    const inputCost = (inputTokens / 1000) * pricing.creditsPer1kInput;
    const outputCost = (outputTokens / 1000) * pricing.creditsPer1kOutput;

    return Math.ceil(inputCost + outputCost);
  }

  /**
   * Get active chat sessions for a user
   */
  async getActiveSessions(userId: string): Promise<ServiceResponse<ChatSession[]>> {
    try {
      const sessions: ChatSession[] = [];
      
      for (const [_sessionId, session] of this.activeSessions) {
        if (session.userId === userId) {
          sessions.push(session);
        }
      }

      return {
        success: true,
        data: sessions,
      };
    } catch (error) {
      console.error('Error getting active sessions:', error);
      return {
        success: false,
        error: 'Failed to get active sessions',
      };
    }
  }

  /**
   * End a chat session
   */
  async endSession(userId: string, conversationId: string): Promise<ServiceResponse<void>> {
    try {
      const session = this.activeSessions.get(conversationId);
      
      if (!session || session.userId !== userId) {
        return {
          success: false,
          error: 'Session not found',
        };
      }

      this.activeSessions.delete(conversationId);

      return { success: true };
    } catch (error) {
      console.error('Error ending session:', error);
      return {
        success: false,
        error: 'Failed to end session',
      };
    }
  }
}