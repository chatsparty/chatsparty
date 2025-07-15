import { generateObject, generateText } from 'ai';
import {
  AgentSelection,
  AgentSelectionSchema,
  ConversationState,
  Message,
  TerminationDecision,
  TerminationDecisionSchema,
} from './types';
import {
  getModel,
  SUPERVISOR_MODEL,
  SUPERVISOR_PROMPTS,
} from './mastra.config';
import { retryWithBackoff } from '../../utils/retry';

export class SupervisorService {
  private async getConversationContext(
    messages: Message[],
    maxMessages: number = 10,
    maxSummaryTokens: number = 1500
  ): Promise<string> {
    if (messages.length <= maxMessages) {
      return messages
        .map(msg => `${msg.speaker || 'User'}: ${msg.content}`)
        .join('\n');
    }

    const recentMessages = messages.slice(-maxMessages);
    const oldMessages = messages.slice(0, -maxMessages);

    const summaryPrompt = `Summarize the following conversation. Focus on key decisions, unresolved questions, and the overall trajectory of the discussion. Be concise, but do not lose critical information. The summary will be used to provide context to an AI agent that needs to decide what to do next.

CONVERSATION:
${oldMessages.map(msg => `${msg.speaker || 'User'}: ${msg.content}`).join('\n')}

SUMMARY:`;

    const model = getModel(SUPERVISOR_MODEL.provider, SUPERVISOR_MODEL.model);
    const { text: summary } = await generateText({
      model,
      prompt: summaryPrompt,
      maxTokens: maxSummaryTokens,
    });

    return `Summary of earlier conversation:\n${summary}\n\nRecent messages:\n${recentMessages
      .map(msg => `${msg.speaker || 'User'}: ${msg.content}`)
      .join('\n')}`;
  }

  async selectNextAgent(
    state: ConversationState
  ): Promise<AgentSelection | null> {
    try {
      const conversationContext = await this.getConversationContext(
        state.messages
      );
      const agentsInfo = state.agents.map(a => ({
        id: a.id,
        name: a.name,
        characteristics: a.characteristics,
      }));

      const lastSpeakers = this.getLastSpeakers(state.messages);
      const selectionPrompt = this.buildSelectionPrompt(
        conversationContext,
        agentsInfo,
        lastSpeakers,
        state.messages
      );

      const model = getModel(SUPERVISOR_MODEL.provider, SUPERVISOR_MODEL.model);

      const result = await retryWithBackoff(
        () =>
          generateObject({
            model,
            schema: AgentSelectionSchema,
            prompt: selectionPrompt,
            system: SUPERVISOR_PROMPTS().agentSelection,
            temperature: SUPERVISOR_MODEL.temperature,
            maxTokens: SUPERVISOR_MODEL.maxTokens,
          }),
        {
          retries: 3,
          initialDelay: 1000,
          onRetry: (error, attempt) => {
            console.error(
              `Error in generateObject (attempt ${attempt}/3):`,
              error
            );
            if (error.name === 'NoObjectGeneratedError') {
              console.error('Model response:', error.response);
              console.error('Raw text:', error.text);
            }
          },
        }
      );

      const selectedAgent = result?.object || null;

      if (selectedAgent && lastSpeakers.includes(selectedAgent.agentId)) {
        const alternativeAgents = state.agents.filter(
          a => !lastSpeakers.includes(a.id)
        );

        if (alternativeAgents.length > 0) {
          console.log(
            `Supervisor chose a recent speaker (${selectedAgent.agentId}). Overriding with ${alternativeAgents[0].id} for variety.`
          );
          return {
            agentId: alternativeAgents[0].id,
            reasoning: `Forced variety to avoid repetition. Original choice was ${
              selectedAgent.agentId
            }.`,
          };
        }
        console.log(
          `All agents have spoken recently. Allowing supervisor's choice to repeat: ${selectedAgent.agentId}`
        );
      }

      if (selectedAgent && !selectedAgent.reasoning) {
        selectedAgent.reasoning = 'Supervisor selection.';
      }

      return selectedAgent;
    } catch (error) {
      console.error('Error selecting next agent:', error);
      const availableAgents = state.agents.filter(
        a => !this.getLastSpeakers(state.messages).includes(a.id)
      );

      if (availableAgents.length > 0) {
        return {
          agentId: availableAgents[0].id,
          reasoning:
            'Fallback selection due to error (chose non-recent speaker)',
        };
      } else if (state.agents.length > 0) {
        return {
          agentId: state.agents[0].id,
          reasoning:
            'Fallback selection due to error (all agents spoke recently)',
        };
      }

      return null;
    }
  }

  async checkTermination(
    state: ConversationState
  ): Promise<TerminationDecision> {
    try {
      const conversationContext = await this.getConversationContext(
        state.messages,
        5
      );
      const terminationPrompt =
        this.buildTerminationPrompt(conversationContext);
      const model = getModel(SUPERVISOR_MODEL.provider, SUPERVISOR_MODEL.model);

      const result = await retryWithBackoff(
        () =>
          generateObject({
            model,
            schema: TerminationDecisionSchema,
            prompt: terminationPrompt,
            system: SUPERVISOR_PROMPTS().termination,
            temperature: SUPERVISOR_MODEL.temperature,
            maxTokens: SUPERVISOR_MODEL.maxTokens,
          }),
        {
          retries: 3,
          initialDelay: 1000,
          onRetry: (error, attempt) => {
            console.error(
              `Error in termination check (attempt ${attempt}/3):`,
              error
            );
            if (error.name === 'NoObjectGeneratedError') {
              console.error('Model response:', error.response);
              console.error('Raw text:', error.text);
            }
          },
        }
      );

      const decision = result?.object || {
        shouldTerminate: false,
        reason: 'Parse error, continuing',
      };

      if (decision && !decision.reason) {
        decision.reason = 'Supervisor decision.';
      }

      return decision;
    } catch (error) {
      console.error('Error checking termination:', error);
      return {
        shouldTerminate: false,
        reason: 'Continuing due to parsing error',
      };
    }
  }

  private getLastSpeakers(messages: Message[]): string[] {
    const lastSpeakers: string[] = [];
    for (let i = messages.length - 1; i >= 0 && lastSpeakers.length < 3; i--) {
      const msg = messages[i];
      if (msg.speaker && !lastSpeakers.includes(msg.speaker)) {
        lastSpeakers.push(msg.speaker);
      }
    }
    return lastSpeakers;
  }

  private buildSelectionPrompt(
    conversationContext: string,
    agentsInfo: Array<{ id: string; name: string; characteristics: string }>,
    lastSpeakers: string[],
    allMessages: Message[]
  ): string {
    const agentsList = agentsInfo
      .map(agent => `- ${agent.id}: ${agent.name} - ${agent.characteristics}`)
      .join('\n');

    const lastSpeaker =
      allMessages[allMessages.length - 1]?.speaker || 'unknown';

    const antiRepetitionNote =
      lastSpeakers.length > 0
        ? `\nIMPORTANT ANTI-REPETITION RULE: The following agents have spoken recently: ${lastSpeakers.join(
            ', '
          )}. You MUST select a DIFFERENT agent to ensure variety and natural conversation flow.`
        : '';

    return `
Available agents:
${agentsList}

Recent conversation:
${conversationContext}
`
      .replace('{{lastSpeaker}}', lastSpeaker)
      .replace('{{antiRepetitionNote}}', antiRepetitionNote)
      .replace('{{agentIdExample}}', agentsInfo[0]?.id || 'agent1');
  }

  private buildTerminationPrompt(conversationContext: string): string {
    return `
Conversation context:
${conversationContext}
`;
  }
}

export const supervisorService = new SupervisorService();
