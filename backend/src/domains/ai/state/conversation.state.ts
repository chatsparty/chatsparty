import { Agent, ConversationState, Message } from '../types';

interface InitializeStateParams {
  initialMessage: string;
  agents: Agent[];
  userId: string | null;
  existingMessages?: Message[];
  maxTurns: number;
  conversationId: string;
}

export function initializeState({
  initialMessage,
  agents,
  userId,
  existingMessages,
  maxTurns,
  conversationId,
}: InitializeStateParams): ConversationState {
  return {
    messages: existingMessages || [
      {
        role: 'user',
        content: initialMessage,
        speaker: 'user',
        timestamp: Date.now(),
      },
    ],
    agents: agents.map(a => ({
      id: a.agentId,
      name: a.name,
      characteristics: a.characteristics,
    })),
    currentSpeaker: null,
    turnCount: 0,
    maxTurns,
    conversationComplete: false,
    userId: userId || null,
    conversationId,
  };
}

export function addMessageToState(
  state: ConversationState,
  message: Message
): ConversationState {
  return {
    ...state,
    messages: [...state.messages, message],
    turnCount: state.turnCount + 1,
    currentSpeaker: message.agentId || message.speaker || null,
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
