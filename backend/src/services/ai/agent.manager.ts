import { Agent as MastraAgent } from '@mastra/core';
import { CoreMessage, generateText, LanguageModel } from 'ai';
import { getModel, mastra } from './mastra.config';
import { supervisorService } from './supervisor.service';
import {
  Agent,
  AgentSelection,
  TerminationDecision,
  Message,
  ConversationState,
  getAgentSystemPrompt,
} from './types';

export class AgentManager {
  private agents: Map<string, Agent> = new Map();
  private mastraAgents: Map<string, MastraAgent> = new Map();

  /**
   * Register an agent with the manager
   */
  async registerAgent(agent: Agent): Promise<void> {
    this.agents.set(agent.agentId, agent);

    const model = getModel(agent.aiConfig.provider, agent.aiConfig.modelName);
    const mastraAgent = new MastraAgent({
      name: agent.name,
      instructions: getAgentSystemPrompt(agent),
      model,
    });

    this.mastraAgents.set(agent.agentId, mastraAgent);

    if (!mastra.agents) {
      console.warn(
        'Mastra agents object is not initialized, creating empty object'
      );
      mastra.agents = {};
    }
    mastra.agents[agent.agentId] = mastraAgent;
  }

  /**
   * Unregister an agent
   */
  async unregisterAgent(agentId: string): Promise<void> {
    this.agents.delete(agentId);
    this.mastraAgents.delete(agentId);
    if (mastra.agents) {
      delete mastra.agents[agentId];
    }
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get all registered agents
   */
  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get Mastra agent instance
   */
  getMastraAgent(agentId: string): MastraAgent | undefined {
    return this.mastraAgents.get(agentId);
  }

  /**
   * Select next agent using supervisor logic
   */
  async selectNextAgent(
    state: ConversationState,
    _userId?: string
  ): Promise<AgentSelection | null> {
    return supervisorService.selectNextAgent(state);
  }

  /**
   * Check if conversation should terminate
   */
  async checkTermination(
    state: ConversationState,
    _userId?: string
  ): Promise<TerminationDecision> {
    return supervisorService.checkTermination(state);
  }

  /**
   * Generate agent response
   */
  async generateAgentResponse(
    agentId: string,
    conversationHistory: Message[],
    _userId?: string
  ): Promise<string> {
    const agent = this.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    const messages: CoreMessage[] = conversationHistory.map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    }));

    const model = getModel(agent.aiConfig.provider, agent.aiConfig.modelName);

    try {
      const result = await generateText({
        model,
        messages,
        system: getAgentSystemPrompt(agent),
        temperature: 0.7,
        maxTokens: agent.maxTokens || 1000,
      });

      if (!result.text || result.text.trim() === '') {
        return this._retryGenerateAgentResponse(agent, messages, model);
      }

      return result.text;
    } catch (error) {
      console.error(`Error generating text for agent ${agent.name}:`, error);
      throw error;
    }
  }

  private async _retryGenerateAgentResponse(
    agent: Agent,
    messages: CoreMessage[],
    model: LanguageModel
  ): Promise<string> {
    console.warn(`Agent ${agent.name} generated empty response. Retrying...`);

    const isGoogleModel =
      agent.aiConfig.provider === 'google' ||
      agent.aiConfig.provider === 'vertex_ai';

    const retryMessages: CoreMessage[] = isGoogleModel
      ? [
          ...messages,
          {
            role: 'user',
            content:
              'Please continue the conversation with a substantive response.',
          },
        ]
      : [
          ...messages,
          {
            role: 'system',
            content:
              'Please provide a substantive response to continue the conversation.',
          },
        ];

    try {
      const retryResult = await generateText({
        model,
        messages: retryMessages,
        system: getAgentSystemPrompt(agent),
        temperature: 0.8,
        maxTokens: agent.maxTokens || 1000,
      });

      if (!retryResult.text || retryResult.text.trim() === '') {
        console.error(
          `Agent ${agent.name} generated empty response after retry`
        );
        return 'Hey everyone!';
      }

      return retryResult.text;
    } catch (retryError) {
      console.error(`Error during retry for agent ${agent.name}:`, retryError);
      return 'Hey there!';
    }
  }
}

export const agentManager = new AgentManager();
