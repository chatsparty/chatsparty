import { ConversationState, Message, Agent } from '../types';

export function createInitialState(
  conversationId: string,
  agents: Agent[],
  userId: string,
  maxTurns: number,
  existingMessages: Message[] = []
): ConversationState {
  return {
    conversationId,
    agents: agents.map(agent => ({
      id: agent.agentId,
      name: agent.name,
      characteristics: agent.characteristics,
    })),
    userId,
    maxTurns,
    messages: existingMessages,
    turnCount: Math.floor(
      existingMessages.filter(m => m.role === 'assistant').length
    ),
    conversationComplete: false,
    currentSpeaker: null,
  };
}

export function addMessage(
  state: ConversationState,
  message: Message
): ConversationState {
  return {
    ...state,
    messages: [...state.messages, message],
  };
}

export function incrementTurn(
  state: ConversationState
): ConversationState {
  return {
    ...state,
    turnCount: state.turnCount + 1,
  };
}

export function completeConversation(
  state: ConversationState
): ConversationState {
  return {
    ...state,
    conversationComplete: true,
  };
}

export function setCurrentSpeaker(
  state: ConversationState,
  speaker: string
): ConversationState {
  return {
    ...state,
    currentSpeaker: speaker,
  };
}
