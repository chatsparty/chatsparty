import { Agent, Message, WorkflowEvent, ConversationState } from '../types';
import { selectNextAgent } from '../decision/agent.selector';
import { shouldTerminateConversation } from '../decision/conversation.terminator';
import { generateResponse } from '../generation/response.generator';
import { createLogger } from '../../../config/logger';

const logger = createLogger('conversation.workflow');
import { addMessage as saveConversationMessage } from '../../conversations/orchestration';
import {
  addMessage,
  completeConversation,
  createInitialState,
  incrementTurn,
  setCurrentSpeaker,
} from '../state/state-functions';

const CONTROLLER_AGENT_ID = 'controller';

function getControllerAgent(agents: Agent[]): Agent {
  const controllerAgent = agents.find(
    agent => agent.agentId === CONTROLLER_AGENT_ID
  );
  if (controllerAgent) {
    return controllerAgent;
  }

  const highestTierAgent = agents.reduce((prev, current) => {
    const tierOrder = {
      openai: 1,
      anthropic: 2,
      google: 3,
      vertex_ai: 4,
      groq: 5,
      ollama: 6,
    };
    const prevTier = tierOrder[prev.aiConfig.provider];
    const currentTier = tierOrder[current.aiConfig.provider];
    return prevTier < currentTier ? prev : current;
  });

  return {
    ...highestTierAgent,
    agentId: CONTROLLER_AGENT_ID,
    name: 'Controller',
    prompt: 'You are a conversation controller.',
    characteristics: 'You are a conversation controller.',
  };
}

async function saveMessage(
  userId: string,
  conversationId: string,
  message: Message
) {
  // Only save user and assistant messages, skip system messages
  if (message.role === 'user' || message.role === 'assistant') {
    await saveConversationMessage(conversationId, {
      role: message.role,
      content: message.content,
      agentId: message.agentId,
      speaker: message.speaker || '',
      timestamp: message.timestamp || Date.now(),
    });
  }
}

async function takeTurn(
  state: ConversationState,
  agents: Agent[],
  controllerAgent: Agent
): Promise<{ newState: ConversationState; event?: WorkflowEvent }> {
  const terminationDecision = await shouldTerminateConversation(
    agents,
    [...state.messages],
    controllerAgent,
    state.turnCount,
    state.maxTurns
  );

  if (terminationDecision.shouldTerminate) {
    return {
      newState: completeConversation(state),
      event: {
        type: 'conversation_complete',
        message:
          terminationDecision.reason || 'Conversation has concluded.',
      },
    };
  }

  const agentSelection = await selectNextAgent(
    agents,
    [...state.messages],
    controllerAgent
  );

  const nextAgent = agents.find(
    agent => agent.agentId === agentSelection.agentId
  );

  if (!nextAgent) {
    return {
      newState: state,
      event: {
        type: 'error',
        message: `Could not find agent with ID: ${agentSelection.agentId}`,
      },
    };
  }

  const stateWithSpeaker = setCurrentSpeaker(state, nextAgent.name);

  const response = await generateResponse(
    nextAgent,
    agents,
    [...stateWithSpeaker.messages]
  );

  const agentMessage: Message = {
    role: 'assistant',
    content: response,
    agentId: nextAgent.agentId,
    speaker: nextAgent.name,
    timestamp: Date.now(),
  };

  const stateWithMessage = addMessage(stateWithSpeaker, agentMessage);
  await saveMessage(state.userId!, state.conversationId, agentMessage);

  return {
    newState: incrementTurn(stateWithMessage),
    event: {
      type: 'agent_response',
      agentId: nextAgent.agentId,
      agentName: nextAgent.name,
      message: response,
      timestamp: agentMessage.timestamp!,
    },
  };
}

export async function* runMultiAgentConversation(
  conversationId: string,
  initialMessage: string,
  agents: Agent[],
  userId: string,
  maxTurns: number = 10,
  existingMessages: Message[] = []
): AsyncGenerator<WorkflowEvent> {
  let state = createInitialState(
    conversationId,
    agents,
    userId,
    maxTurns,
    existingMessages
  );

  if (existingMessages.length === 0) {
    const userMessage: Message = {
      role: 'user',
      content: initialMessage,
      speaker: 'User',
      timestamp: Date.now(),
    };
    state = addMessage(state, userMessage);
    await saveMessage(userId, conversationId, userMessage);
  }

  const controllerAgent = getControllerAgent(agents);

  while (!state.conversationComplete && state.turnCount < state.maxTurns) {
    try {
      const { newState, event } = await takeTurn(
        state,
        agents,
        controllerAgent
      );
      state = newState;
      if (event) {
        yield event;
      }
    } catch (error) {
      logger.error('Error in conversation workflow:', error);
      yield {
        type: 'error',
        message:
          error instanceof Error ? error.message : 'An unknown error occurred',
      };
      break;
    }
  }

  if (!state.conversationComplete) {
    yield {
      type: 'conversation_complete',
      message: 'Maximum turns reached.',
    };
  }
}
