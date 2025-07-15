import { Agent, Message } from '../ai/types';
import { CreditService } from '../credit/credit.service';
import { ConversationService } from '../conversation/conversation.service';
import { ModelPricingService } from '../credit/model-pricing.service';
import { agentManager } from '../ai/agent.manager';
import {
  ChatResponse,
  StreamEvent,
  ErrorStreamEvent,
  MessageStreamEvent,
  CreditUpdateStreamEvent,
  CompleteStreamEvent,
} from './chat.types';
import { TransactionReason } from '../credit/credit.types';
import { runMultiAgentConversation } from '../ai/multi-agent.workflow';

// Define a type for the services that ChatFlow will depend on
export interface ChatFlowDependencies {
  creditService: CreditService;
  conversationService: ConversationService;
  modelPricingService: ModelPricingService;
}

// Define a type for the parameters required to run a chat flow
export interface ChatFlowParams {
  userId: string;
  conversationId: string;
  userMessage: Message;
  agents: Agent[];
  conversation: any;
  isStream: boolean;
  maxTurns?: number;
}

/**
 * The ChatFlow class encapsulates the business logic for a single chat interaction.
 * It handles credit checks, agent management, response generation, and conversation updates.
 */
export class ChatFlow {
  private readonly deps: ChatFlowDependencies;
  private readonly params: ChatFlowParams;

  constructor(dependencies: ChatFlowDependencies, parameters: ChatFlowParams) {
    this.deps = dependencies;
    this.params = parameters;
  }

  /**
   * Executes the chat flow and returns either a complete response or a stream of events.
   */
  public async run(): Promise<ChatResponse | AsyncGenerator<StreamEvent>> {
    // 1. Check credit balance
    const balanceResult = await this.deps.creditService.getCreditBalance(this.params.userId);
    if (!balanceResult.success || !balanceResult.data || balanceResult.data.creditsBalance <= 0) {
      if (this.params.isStream) {
        return this.streamError('Insufficient credits');
      }
      throw new Error('Insufficient credits');
    }

    // 2. Register agents
    for (const agent of this.params.agents) {
      await agentManager.registerAgent(agent);
    }

    try {
      // 3. Execute the appropriate chat workflow
      if (this.params.isStream) {
        return this.streamResponse();
      } else {
        return this.generateResponse();
      }
    } finally {
      // 4. Unregister agents
      for (const agent of this.params.agents) {
        await agentManager.unregisterAgent(agent.agentId);
      }
    }
  }

  /**
   * Generates a single, complete chat response.
   */
  private async generateResponse(): Promise<ChatResponse> {
    const messages = this.params.conversation?.messages || [];
    messages.push(this.params.userMessage);

    const responseContent = await this.generateAgentResponse(messages);

    const assistantMessage: Message = {
      role: 'assistant',
      content: responseContent,
      speaker: this.params.agents[0]?.name || 'Assistant',
      agentId: this.params.agents[0]?.agentId,
      timestamp: Date.now(),
    };

    messages.push(assistantMessage);
    await this.deps.conversationService.updateMessages(this.params.conversationId, messages);

    const creditsUsed = await this.calculateAndDeductCredits(
      this.params.userMessage.content.length,
      responseContent.length
    );

    return {
      message: responseContent,
      agentId: this.params.agents[0]?.agentId,
      agentName: this.params.agents[0]?.name,
      conversationId: this.params.conversationId,
      timestamp: assistantMessage.timestamp!,
      creditsUsed,
    };
  }

  /**
   * Generates a stream of events for a chat response.
   */
  private async *streamResponse(): AsyncGenerator<StreamEvent> {
    const messages = this.params.conversation?.messages || [];
    messages.push(this.params.userMessage);

    // This is a simplified streaming simulation. In a real implementation,
    // you would stream tokens directly from the AI model.
    const fullResponse = await this.generateAgentResponse(messages);
    const words = fullResponse.split(' ');

    for (let i = 0; i < words.length; i++) {
      const chunk = words.slice(0, i + 1).join(' ');
      yield {
        type: 'message',
        data: {
          content: chunk,
          agentId: this.params.agents[0]?.agentId,
          agentName: this.params.agents[0]?.name,
          isComplete: i === words.length - 1,
        },
        timestamp: Date.now(),
      } as MessageStreamEvent;
      await new Promise(resolve => setTimeout(resolve, 50)); // Simulate network delay
    }

    const assistantMessage: Message = {
      role: 'assistant',
      content: fullResponse,
      speaker: this.params.agents[0]?.name || 'Assistant',
      agentId: this.params.agents[0]?.agentId,
      timestamp: Date.now(),
    };

    messages.push(assistantMessage);
    await this.deps.conversationService.updateMessages(this.params.conversationId, messages);

    const creditsUsed = await this.calculateAndDeductCredits(
      this.params.userMessage.content.length,
      fullResponse.length
    );

    const newBalance = await this.deps.creditService.getCreditBalance(this.params.userId);
    yield {
      type: 'credit_update',
      data: {
        creditsUsed,
        remainingCredits: newBalance.data?.creditsBalance || 0,
      },
      timestamp: Date.now(),
    } as CreditUpdateStreamEvent;

    yield {
      type: 'complete',
      data: {
        conversationId: this.params.conversationId,
        totalCreditsUsed: creditsUsed,
      },
      timestamp: Date.now(),
    } as CompleteStreamEvent;
  }

  /**
   * Helper to generate a response from the appropriate agent or workflow.
   */
  private async generateAgentResponse(messages: Message[]): Promise<string> {
    if (this.params.agents.length > 1) {
      // Multi-agent conversation logic remains more complex and uses its own workflow
      const eventGenerator = await runMultiAgentConversation(
        this.params.conversationId,
        this.params.userMessage.content,
        this.params.agents,
        this.params.userId,
        this.params.maxTurns
      );

      let finalMessage = '';
      for await (const event of eventGenerator) {
        if (event.type === 'agent_response') {
          finalMessage = event.message; // Capturing the last message for simplicity
        }
      }
      return finalMessage;
    } else if (this.params.agents.length === 1) {
      return agentManager.generateAgentResponse(this.params.agents[0].agentId, messages, this.params.userId);
    } else {
      return "I'm a default assistant. Please specify an agent for a more personalized response.";
    }
  }

  /**
   * Calculates and deducts credits for the interaction.
   */
  private async calculateAndDeductCredits(inputLength: number, outputLength: number): Promise<number> {
    const agent = this.params.agents[0];
    const provider = agent?.aiConfig.provider || 'openai';
    const modelName = agent?.aiConfig.modelName || 'gpt-3.5-turbo';

    const inputTokens = Math.ceil(inputLength / 4);
    const outputTokens = Math.ceil(outputLength / 4);

    const pricingResult = await this.deps.modelPricingService.getModelPricing(provider, modelName);
    if (!pricingResult.success || !pricingResult.data) {
      return 1; // Default cost
    }

    const pricing = pricingResult.data;
    const costPer1k = pricing.costPer1kTokens || 0;
    const inputCost = (inputTokens / 1000) * costPer1k;
    const outputCost = (outputTokens / 1000) * costPer1k;
    const creditsUsed = Math.ceil(inputCost + outputCost + pricing.costPerMessage);

    await this.deps.creditService.useCredits({
      userId: this.params.userId,
      amount: creditsUsed,
      reason: TransactionReason.AI_CHAT,
      metadata: {
        conversationId: this.params.conversationId,
        agentId: agent?.agentId,
        model: modelName,
      },
    });

    return creditsUsed;
  }

  /**
   * Helper to generate a stream with a single error event.
   */
  private async *streamError(error: string): AsyncGenerator<StreamEvent> {
    yield {
      type: 'error',
      data: { error },
      timestamp: Date.now(),
    } as ErrorStreamEvent;
  }
}