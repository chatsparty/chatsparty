import { v4 as uuidv4 } from 'uuid';
import { Agent, Message } from '../ai/types';
import { AgentService } from '../agents/agent.service';
import { CreditService } from '../credit/credit.service';
import { ModelPricingService } from '../credit/model-pricing.service';
import { ConversationService } from '../conversation/conversation.service';
import { ChatSessionService } from './chat-session.service';
import { ChatFlow } from './chat.flow';
import {
  ChatRequest,
  ChatResponse,
  MultiAgentChatRequest,
  MultiAgentChatResponse,
  ServiceResponse,
  StreamEvent,
  ChatSession,
} from './chat.types';

export class ChatOrchestrationService {
  private agentService: AgentService;
  private creditService: CreditService;
  private modelPricingService: ModelPricingService;
  private conversationService: ConversationService;
  private chatSessionService: ChatSessionService;

  constructor(
    agentService: AgentService,
    creditService: CreditService,
    modelPricingService: ModelPricingService,
    conversationService: ConversationService,
    chatSessionService: ChatSessionService
  ) {
    this.agentService = agentService;
    this.creditService = creditService;
    this.modelPricingService = modelPricingService;
    this.conversationService = conversationService;
    this.chatSessionService = chatSessionService;
  }

  async chat(
    userId: string,
    request: ChatRequest
  ): Promise<ServiceResponse<ChatResponse | AsyncGenerator<StreamEvent>>> {
    try {
      const { conversationId, conversation } = await this.getOrCreateConversation(userId, request);
      const agents = await this.getAgents(userId, request.agentId ? [request.agentId] : []);
      
      this.chatSessionService.startSession(userId, conversationId);

      const userMessage: Message = {
        role: 'user',
        content: request.message,
        speaker: 'user',
        timestamp: Date.now(),
      };

      const chatFlow = new ChatFlow(
        {
          creditService: this.creditService,
          conversationService: this.conversationService,
          modelPricingService: this.modelPricingService,
        },
        {
          userId,
          conversationId,
          userMessage,
          agents,
          conversation,
          isStream: request.stream || false,
        }
      );

      const result = await chatFlow.run();
      return { success: true, data: result };

    } catch (error) {
      console.error('Error in chat orchestration:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to process chat request';
      return { success: false, error: errorMessage };
    }
  }

  async multiAgentChat(
    userId: string,
    request: MultiAgentChatRequest
  ): Promise<ServiceResponse<MultiAgentChatResponse | AsyncGenerator<StreamEvent>>> {
    try {
      const { conversationId, conversation } = await this.getOrCreateConversation(userId, request);
      const agents = await this.getAgents(userId, request.agentIds);

      this.chatSessionService.startSession(userId, conversationId);

      const userMessage: Message = {
        role: 'user',
        content: request.message,
        speaker: 'user',
        timestamp: Date.now(),
      };

      const chatFlow = new ChatFlow(
        {
          creditService: this.creditService,
          conversationService: this.conversationService,
          modelPricingService: this.modelPricingService,
        },
        {
          userId,
          conversationId,
          userMessage,
          agents,
          conversation,
          isStream: request.stream || false,
          maxTurns: request.maxTurns,
        }
      );
      
      const result = await chatFlow.run();
      // The result from a multi-agent chat flow might need to be adapted
      // to the MultiAgentChatResponse format if it's not a stream.
      // This part is simplified for now.
      return { success: true, data: result as any };

    } catch (error) {
      console.error('Error in multi-agent chat orchestration:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to process multi-agent chat request';
      return { success: false, error: errorMessage };
    }
  }

  private async getOrCreateConversation(
    userId: string,
    request: ChatRequest | MultiAgentChatRequest
  ): Promise<{ conversationId: string; conversation: any }> {
    if (request.conversationId) {
      const convResult = await this.conversationService.getConversation(userId, request.conversationId);
      if (!convResult.success) {
        throw new Error('Conversation not found');
      }
      return { conversationId: request.conversationId, conversation: convResult.data! };
    } else {
      const conversationId = uuidv4();
      const title = request.message.substring(0, 50) + '...';
      const agentIds = 'agentIds' in request ? request.agentIds : (request.agentId ? [request.agentId] : []);
      const convResult = await this.conversationService.createConversation(userId, title, agentIds, {});
      if (!convResult.success) {
        throw new Error('Failed to create conversation');
      }
      return { conversationId, conversation: convResult.data! };
    }
  }

  private async getAgents(userId: string, agentIds: string[]): Promise<Agent[]> {
    const agents: Agent[] = [];
    for (const agentId of agentIds) {
      const agentRecord = await this.agentService.getAgent(userId, agentId);
      agents.push({
        agentId: agentRecord.id,
        name: agentRecord.name,
        prompt: agentRecord.prompt,
        characteristics: agentRecord.characteristics,
        aiConfig: agentRecord.aiConfig,
        chatStyle: agentRecord.chatStyle,
        connectionId: agentRecord.connectionId,
      });
    }
    return agents;
  }

  public getActiveSessions(userId: string): ServiceResponse<ChatSession[]> {
    return this.chatSessionService.getActiveSessions(userId);
  }

  public endSession(
    userId: string,
    conversationId: string
  ): ServiceResponse<void> {
    return this.chatSessionService.endSession(userId, conversationId);
  }
}