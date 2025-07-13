import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../config/database';
import { Agent, Message } from '../ai/types';
import { AgentService } from '../agents/agent.service';
import { ConversationService } from '../conversation/conversation.service';
import {
  ChatRequest,
  ChatResponse,
  MultiAgentChatRequest,
  MultiAgentChatResponse,
  ServiceResponse,
  StreamEvent,
  ChatSession,
} from './chat.types';
import { ChatOrchestrationService } from './chat-orchestration.service';
import { ChatSessionService } from './chat-session.service';

export class ChatService {
  private agentService: AgentService;
  private conversationService: ConversationService;
  private chatOrchestrationService: ChatOrchestrationService;
  private chatSessionService: ChatSessionService;

  constructor(
    agentService: AgentService,
    conversationService: ConversationService,
    chatOrchestrationService: ChatOrchestrationService,
    chatSessionService: ChatSessionService
  ) {
    this.agentService = agentService;
    this.conversationService = conversationService;
    this.chatOrchestrationService = chatOrchestrationService;
    this.chatSessionService = chatSessionService;
  }

  /**
   * Single agent chat
   */
  async chat(
    userId: string,
    request: ChatRequest
  ): Promise<ServiceResponse<ChatResponse | AsyncGenerator<StreamEvent>>> {
    try {
      let conversationId = request.conversationId;
      let conversation;

      if (conversationId) {
        const convResult = await this.conversationService.getConversation(
          userId,
          conversationId
        );
        if (!convResult.success) {
          return { success: false, error: 'Conversation not found' };
        }
        conversation = convResult.data!;
      } else {
        conversationId = uuidv4();
        const title = request.message.substring(0, 50) + '...';
        const convResult = await this.conversationService.createConversation(
          userId,
          title,
          request.agentId ? [request.agentId] : [],
          {}
        );
        if (!convResult.success) {
          return { success: false, error: 'Failed to create conversation' };
        }
        conversation = convResult.data!;
      }

      let agent: Agent | null = null;
      if (request.agentId) {
        const agentRecord = await this.agentService.getAgent(
          userId,
          request.agentId
        );
        agent = {
          agentId: agentRecord.id,
          name: agentRecord.name,
          prompt: agentRecord.prompt,
          characteristics: agentRecord.characteristics,
          aiConfig: agentRecord.aiConfig,
          chatStyle: agentRecord.chatStyle,
          connectionId: agentRecord.connectionId,
        };
      }

      this.chatSessionService.startSession(userId, conversationId);

      return this.chatOrchestrationService.chat(
        userId,
        request,
        conversation,
        agent
      );
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
      const agents: Agent[] = [];
      for (const agentId of request.agentIds) {
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

      const conversationId = request.conversationId || uuidv4();
      if (!request.conversationId) {
        const title = `Chat with ${agents.map(a => a.name).join(', ')}`;
        await this.conversationService.createConversation(
          userId,
          title,
          request.agentIds,
          { maxTurns: request.maxTurns }
        );
      }

      this.chatSessionService.startSession(userId, conversationId);

      return this.chatOrchestrationService.multiAgentChat(userId, request, agents);
    } catch (error) {
      console.error('Error in multi-agent chat:', error);
      return {
        success: false,
        error: 'Failed to process multi-agent chat request',
      };
    }
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