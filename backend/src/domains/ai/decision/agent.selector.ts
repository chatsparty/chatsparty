import { generateObject } from 'ai';
import {
  AgentSelection,
  AgentSelectionSchema,
  ConversationState,
} from '../types';
import { SUPERVISOR_MODEL } from '../../../config/ai.config';
import { getModel } from '../providers/ai.provider.factory';
import { retryWithBackoff } from '../../../utils/retry';
import {
  buildSelectionPrompt,
  getSupervisorSystemPrompt,
} from '../generation/prompt.builder';
import {
  getConversationContext,
  getLastSpeakers,
} from '../state/conversation.helpers';

export async function selectNextAgent(
  state: ConversationState
): Promise<AgentSelection | null> {
  try {
    const conversationContext = await getConversationContext(state.messages);
    const agentsInfo = state.agents.map(a => ({
      id: a.id,
      name: a.name,
      characteristics: a.characteristics,
    }));

    const selectionPrompt = buildSelectionPrompt(
      conversationContext,
      agentsInfo,
      state.messages
    );

    const model = getModel(SUPERVISOR_MODEL.provider, SUPERVISOR_MODEL.model);

    const result = await retryWithBackoff(
      () =>
        generateObject({
          model,
          schema: AgentSelectionSchema,
          prompt: selectionPrompt,
          system: getSupervisorSystemPrompt('selection'),
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
    const lastSpeakers = getLastSpeakers(state.messages);

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
          reasoning: `Forced variety to avoid repetition. Original choice was ${selectedAgent.agentId}.`,
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
    const lastSpeakers = getLastSpeakers(state.messages);
    const availableAgents = state.agents.filter(
      a => !lastSpeakers.includes(a.id)
    );

    if (availableAgents.length > 0) {
      return {
        agentId: availableAgents[0].id,
        reasoning: 'Fallback selection due to error (chose non-recent speaker)',
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
