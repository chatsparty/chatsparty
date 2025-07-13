import { PrismaClient } from '@prisma/client';
import { db } from '../../config/database';
import { agentManager } from '../ai/agent.manager';
import { runMultiAgentConversation } from '../ai/multi-agent.workflow';
import { Agent, Message } from '../ai/types';
import { AgentService } from '../agents/agent.service';
import { DefaultConnectionService } from '../connections/default-connection.service';
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
  ConversationMessage,
} from './chat.types';
import { TransactionReason } from '../credit/credit.types';

export class ChatOrchestrationService {
  private db: PrismaClient;
  private agentService: AgentService;
  private creditService: CreditService;
  private modelPricingService: ModelPricingService;
  private conversationService: ConversationService;

  constructor(database?: PrismaClient) {
    this.db = database || db;
    this.agentService = new AgentService(this.db, new DefaultConnectionService());
    this.creditService = new CreditService(this.db);
    this.modelPricingService = new ModelPricingService(this.db);
    this.conversationService = new ConversationService(this.db);
  }

  async chat(
    userId: string,
    request: ChatRequest,
    conversation: any,
    agent: Agent | null
  ): Promise<ServiceResponse<ChatResponse | AsyncGenerator<StreamEvent>>> {
    const userMessage: Message = {
      role: 'user',
      content: request.message,
      speaker: 'user',
      timestamp: Date.now(),
    };

    if (request.stream) {
      return {
        success: true,
        data: this.streamSingleAgentResponse(
          userId,
          conversation.id,
          userMessage,
          agent,
          conversation
        ),
      };
    }

    return this.generateSingleAgentResponse(
      userId,
      conversation.id,
      userMessage,
      agent,
      conversation
    );
  }

  async multiAgentChat(
    userId: string,
    request: MultiAgentChatRequest,
    agents: Agent[]
  ): Promise<ServiceResponse<MultiAgentChatResponse | AsyncGenerator<StreamEvent>>> {
    const conversationId = request.conversationId!;

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

    return this.runMultiAgentConversation(
      userId,
      conversationId,
      request.message,
      agents,
      request.maxTurns
    );
  }

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

  private async generateDefaultResponse(
    _messages: Message[],
    _userId?: string
  ): Promise<string> {
    // This is a placeholder - in production, you would use a default AI model
    return "I'm a default assistant. Please specify an agent for a more personalized response.";
  }

  private async calculateCreditsUsed(
    provider: string,
    modelName: string,
    inputLength: number,
    outputLength: number
  ): Promise<number> {
    // Approximate token count (rough estimate)
    const inputTokens = Math.ceil(inputLength / 4);
    const outputTokens = Math.ceil(outputLength / 4);

    const pricingResult = await this.modelPricingService.getModelPricing(provider, modelName);
    if (!pricingResult.success || !pricingResult.data) {
      // Default cost if model not found
      return 1;
    }

    const pricing = pricingResult.data;
    const costPer1k = pricing.costPer1kTokens || 0;
    const inputCost = (inputTokens / 1000) * costPer1k;
    const outputCost = (outputTokens / 1000) * costPer1k;

    return Math.ceil(inputCost + outputCost + pricing.costPerMessage);
  }
}