import { Agent as MastraAgent } from '@mastra/core';
import { CoreMessage, generateObject, generateText } from 'ai';
import { mastra, getModel, SUPERVISOR_MODEL, SUPERVISOR_PROMPTS } from './mastra.config';
import { 
  Agent, 
  AgentSelection, 
  AgentSelectionSchema,
  TerminationDecision,
  TerminationDecisionSchema,
  Message,
  ConversationState,
  getAgentSystemPrompt 
} from './types';

export class AgentManager {
  private agents: Map<string, Agent> = new Map();
  private mastraAgents: Map<string, MastraAgent> = new Map();

  /**
   * Register an agent with the manager
   */
  async registerAgent(agent: Agent): Promise<void> {
    // Store agent configuration
    this.agents.set(agent.agentId, agent);

    // Create Mastra agent instance
    const model = getModel(agent.aiConfig.provider, agent.aiConfig.modelName);
    const mastraAgent = new MastraAgent({
      name: agent.name,
      instructions: getAgentSystemPrompt(agent),
      model,
    });

    this.mastraAgents.set(agent.agentId, mastraAgent);
    
    // Register with Mastra instance
    mastra.agents[agent.agentId] = mastraAgent;
  }

  /**
   * Unregister an agent
   */
  async unregisterAgent(agentId: string): Promise<void> {
    this.agents.delete(agentId);
    this.mastraAgents.delete(agentId);
    delete mastra.agents[agentId];
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
    try {
      // Build selection context
      const recentMessages = state.messages.slice(-5);
      const agentsInfo = state.agents.map(a => ({
        id: a.id,
        name: a.name,
        characteristics: a.characteristics,
      }));

      // Get last speakers for anti-repetition
      const lastSpeakers: string[] = [];
      for (let i = state.messages.length - 1; i >= 0 && lastSpeakers.length < 3; i--) {
        const msg = state.messages[i];
        if (msg.role === 'assistant' && msg.speaker && !lastSpeakers.includes(msg.speaker)) {
          lastSpeakers.push(msg.speaker);
        }
      }

      // Build prompt
      const selectionPrompt = this.buildSelectionPrompt(recentMessages, agentsInfo, lastSpeakers);

      // Use supervisor model to select agent
      const model = getModel(SUPERVISOR_MODEL.provider, SUPERVISOR_MODEL.model);
      
      const result = await generateObject({
        model,
        schema: AgentSelectionSchema,
        prompt: selectionPrompt,
        system: SUPERVISOR_PROMPTS.agentSelection,
        temperature: SUPERVISOR_MODEL.temperature,
        maxTokens: SUPERVISOR_MODEL.maxTokens,
      });

      // Validate selection
      const selectedAgent = result.object;
      
      // Anti-repetition check
      if (selectedAgent && lastSpeakers.length > 0 && lastSpeakers[0] === selectedAgent.agentId) {
        // Force different agent
        const availableAgents = state.agents.filter(a => a.id !== lastSpeakers[0]);
        if (availableAgents.length > 0) {
          return {
            agentId: availableAgents[0].id,
            reasoning: 'Forced variety to avoid repetition',
          };
        }
      }

      return selectedAgent;
    } catch (error) {
      console.error('Error selecting next agent:', error);
      // Fallback to first available agent
      if (state.agents.length > 0) {
        return {
          agentId: state.agents[0].id,
          reasoning: 'Fallback selection due to error',
        };
      }
      return null;
    }
  }

  /**
   * Check if conversation should terminate
   */
  async checkTermination(
    state: ConversationState,
    _userId?: string
  ): Promise<TerminationDecision> {
    try {
      const recentMessages = state.messages.slice(-5);
      const terminationPrompt = this.buildTerminationPrompt(recentMessages);

      const model = getModel(SUPERVISOR_MODEL.provider, SUPERVISOR_MODEL.model);
      
      const result = await generateObject({
        model,
        schema: TerminationDecisionSchema,
        prompt: terminationPrompt,
        system: SUPERVISOR_PROMPTS.termination,
        temperature: SUPERVISOR_MODEL.temperature,
        maxTokens: SUPERVISOR_MODEL.maxTokens,
      });

      return result.object;
    } catch (error) {
      console.error('Error checking termination:', error);
      // Default to continue on error
      return {
        shouldTerminate: false,
        reason: 'Continuing due to parsing error',
      };
    }
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

    // Convert messages to CoreMessage format
    const messages: CoreMessage[] = conversationHistory.map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    }));

    // Get model for this agent
    const model = getModel(agent.aiConfig.provider, agent.aiConfig.modelName);

    // Generate response
    const result = await generateText({
      model,
      messages,
      system: getAgentSystemPrompt(agent),
      temperature: 0.7,
      maxTokens: 1000,
    });

    return result.text;
  }

  /**
   * Build agent selection prompt
   */
  private buildSelectionPrompt(
    recentMessages: Message[],
    agentsInfo: Array<{ id: string; name: string; characteristics: string }>,
    lastSpeakers: string[]
  ): string {
    let conversationContext = '';
    for (const msg of recentMessages) {
      const speaker = msg.speaker || 'User';
      conversationContext += `${speaker}: ${msg.content}\n`;
    }

    let agentsList = '';
    for (const agent of agentsInfo) {
      agentsList += `- ${agent.id}: ${agent.name} - ${agent.characteristics}\n`;
    }

    const lastSpeaker = recentMessages[recentMessages.length - 1]?.speaker || 'unknown';
    
    let antiRepetitionNote = '';
    if (lastSpeakers.length > 0) {
      const recentSpeakerNames = lastSpeakers.join(', ');
      antiRepetitionNote = `\nIMPORTANT ANTI-REPETITION RULE: The following agents have spoken recently: ${recentSpeakerNames}. You MUST select a DIFFERENT agent to ensure variety and natural conversation flow.`;
    }

    return `Available agents:
${agentsList}

Recent conversation:
${conversationContext}

Based on the conversation context and each agent's expertise, which agent should respond next?
Consider:
1. Which agent's expertise is most relevant to the current topic
2. Which agent hasn't spoken recently (for variety) - THIS IS CRITICAL
3. Which agent would provide the most valuable response
4. The selected agent should BUILD ON the current message, not repeat similar content

CRITICAL: The last message was from ${lastSpeaker}. You MUST select a DIFFERENT agent to avoid repetition.${antiRepetitionNote}`;
  }

  /**
   * Build termination check prompt
   */
  private buildTerminationPrompt(recentMessages: Message[]): string {
    let conversationContext = '';
    for (const msg of recentMessages) {
      const speaker = msg.speaker || 'User';
      conversationContext += `${speaker}: ${msg.content}\n`;
    }

    return `Recent conversation:
${conversationContext}

Has this conversation reached a natural conclusion? Consider:
1. Have the main topics been thoroughly discussed?
2. Are agents starting to repeat themselves?
3. Has the user's question/request been adequately addressed?
4. Are there clear ending signals in the recent messages?`;
  }
}

// Export singleton instance
export const agentManager = new AgentManager();