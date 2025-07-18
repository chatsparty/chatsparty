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

async function generateAgentSelection(
  state: ConversationState,
): Promise<AgentSelection | null> {
  const conversationContext = await getConversationContext(state.messages);
  const agentsInfo = state.agents.map(a => ({
    id: a.id,
    name: a.name,
    characteristics: a.characteristics,
  }));

  const selectionPrompt = buildSelectionPrompt(
    conversationContext,
    agentsInfo,
    state.messages,
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
          error,
        );
        if (error.name === 'NoObjectGeneratedError') {
          console.error('Model response:', error.response);
          console.error('Raw text:', error.text);
        }
      },
    },
  );
  return result?.object || null;
}

function ensureVariety(
  selectedAgent: AgentSelection,
  agents: Array<{ id: string; name: string; characteristics: string }>,
  lastSpeakers: string[],
): AgentSelection {
  if (lastSpeakers.includes(selectedAgent.agentId)) {
    const alternativeAgents = agents.filter(
      a => !lastSpeakers.includes(a.id),
    );

    if (alternativeAgents.length > 0) {
      const newAgentId = alternativeAgents[0].id;
      console.log(
        `Supervisor chose a recent speaker (${selectedAgent.agentId}). Overriding with ${newAgentId} for variety.`,
      );
      return {
        agentId: newAgentId,
        reasoning: `Forced variety to avoid repetition. Original choice was ${selectedAgent.agentId}.`,
      };
    }
    console.log(
      `All agents have spoken recently. Allowing supervisor's choice to repeat: ${selectedAgent.agentId}`,
    );
  }
  return selectedAgent;
}

function addDefaultReasoning(selectedAgent: AgentSelection): AgentSelection {
  if (!selectedAgent.reasoning) {
    return { ...selectedAgent, reasoning: 'Supervisor selection.' };
  }
  return selectedAgent;
}

function createFallbackSelection(
  agents: Array<{ id: string; name: string; characteristics: string }>,
  lastSpeakers: string[],
): AgentSelection | null {
  const availableAgents = agents.filter(
    a => !lastSpeakers.includes(a.id),
  );

  if (availableAgents.length > 0) {
    return {
      agentId: availableAgents[0].id,
      reasoning: 'Fallback selection due to error (chose non-recent speaker)',
    };
  }

  if (agents.length > 0) {
    return {
      agentId: agents[0].id,
      reasoning: 'Fallback selection due to error (all agents spoke recently)',
    };
  }

  return null;
}

export async function selectNextAgent(
  state: ConversationState,
): Promise<AgentSelection | null> {
  const lastSpeakers = getLastSpeakers(state.messages);
  
  // Ensure agents have the correct type
  const agents = state.agents as Array<{ id: string; name: string; characteristics: string }>;

  try {
    const selectedAgent = await generateAgentSelection(state);

    if (!selectedAgent) {
      console.log('Agent selection returned no object, using fallback.');
      return createFallbackSelection(agents, lastSpeakers);
    }

    const varietyAssuredSelection = ensureVariety(
      selectedAgent,
      agents,
      lastSpeakers,
    );
    return addDefaultReasoning(varietyAssuredSelection);
  } catch (error) {
    console.error('Error selecting next agent:', error);
    return createFallbackSelection(agents, lastSpeakers);
  }
}
