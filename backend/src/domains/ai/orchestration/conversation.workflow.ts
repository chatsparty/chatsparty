import { Agent, Message, WorkflowEvent } from '../types';
import * as AgentRegistry from '../state/agent.registry';
import * as ConversationState from '../state/conversation.state';
import { generateAgentResponse } from '../generation/response.generator';
import { selectNextAgent } from '../decision/agent.selector';
import { checkTermination } from '../decision/conversation.terminator';

export async function* runMultiAgentConversation(
  conversationId: string,
  initialMessage: string,
  agents: Agent[],
  userId?: string,
  maxTurns: number = 10,
  existingMessages?: Message[]
): AsyncGenerator<WorkflowEvent, void, unknown> {
  const agentRegistry: AgentRegistry.AgentRegistry = new Map();
  const mastraRegistry: AgentRegistry.MastraAgentRegistry = new Map();

  try {
    // 1. Register Agents
    for (const agent of agents) {
      AgentRegistry.registerAgent(agentRegistry, mastraRegistry, agent);
    }

    // 2. Initialize State
    let state = ConversationState.initializeState({
      initialMessage,
      agents,
      userId: userId || null,
      existingMessages,
      maxTurns,
      conversationId,
    });

    yield { type: 'status', message: 'Conversation initialized' };

    // 3. Main Conversation Loop
    while (!state.conversationComplete && state.turnCount < state.maxTurns) {
      // 3a. Select next agent
      const selection = await selectNextAgent(state);

      if (!selection || !selection.agentId || (selection.turns ?? 1) === 0) {
        yield { type: 'status', message: 'Conversation paused' };
        break;
      }

      const agent = AgentRegistry.getAgent(agentRegistry, selection.agentId);
      if (!agent) {
        throw new Error(`Agent ${selection.agentId} not found in registry`);
      }

      yield {
        type: 'status',
        message: `${agent.name} is thinking...`,
        agentId: agent.agentId,
        agentName: agent.name,
      };

      // 3b. Generate response
      const response = await generateAgentResponse(agent, state.messages);

      // 3c. Update state
      const responseMessage: Message = {
        role: 'assistant',
        content: response,
        speaker: agent.name,
        agentId: agent.agentId,
        timestamp: Date.now(),
      };
      state = ConversationState.addMessageToState(state, responseMessage);

      yield {
        type: 'agent_response',
        agentId: selection.agentId,
        agentName: agent.name,
        message: response,
        timestamp: responseMessage.timestamp || Date.now(),
      };

      // 3d. Check for termination
      if (state.messages && state.messages.length >= 3) {
        const termination = await checkTermination(state);
        if (termination.shouldTerminate) {
          state = ConversationState.completeConversation(state);
        }
      }
    }

    yield {
      type: 'conversation_complete',
      message: 'Conversation has reached a natural conclusion',
    };
  } catch (error) {
    yield {
      type: 'error',
      message: `Error in conversation: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  } finally {
    // 4. Cleanup
    for (const agent of agents) {
      AgentRegistry.unregisterAgent(
        agentRegistry,
        mastraRegistry,
        agent.agentId
      );
    }
  }
}
