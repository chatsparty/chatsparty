import { z } from 'zod';
import {
  ConversationId,
  UserId,
  AgentId,
  Agent,
  Message,
  NonEmptyArray,
} from '../core/types';
import { ConversationEvent } from './events';
import { ConversationStateKind } from './constants';

export type ConversationState =
  | { kind: typeof ConversationStateKind.Idle }
  | { kind: typeof ConversationStateKind.SelectingAgent; context: ConversationContext }
  | {
      kind: typeof ConversationStateKind.GeneratingResponse;
      context: ConversationContext;
      selectedAgent: AgentId;
    }
  | { kind: typeof ConversationStateKind.WaitingForTurn; context: ConversationContext }
  | { kind: typeof ConversationStateKind.Terminated; context: ConversationContext; reason: string };

export const ConversationContextSchema = z.object({
  conversationId: z.string().refine((_val): _val is ConversationId => true),
  userId: z.string().refine((_val): _val is UserId => true),
  agents: z.array(
    z.object({
      id: z.string().refine((_val): _val is AgentId => true),
      name: z.string(),
      characteristics: z.string(),
    })
  ),
  messages: z.array(z.any()),
  turnCount: z.number(),
  maxTurns: z.number(),
  eventHistory: z.array(z.any()),
});

export type ConversationContext = z.infer<typeof ConversationContextSchema>;

export const startConversation = (
  conversationId: ConversationId,
  userId: UserId,
  agents: NonEmptyArray<Agent>,
  maxTurns: number,
  initialMessage: string
): ConversationState => ({
  kind: ConversationStateKind.SelectingAgent,
  context: {
    conversationId,
    userId,
    agents: agents.map(a => ({
      id: a.agentId,
      name: a.name,
      characteristics: a.characteristics,
    })),
    messages: [
      {
        role: 'user' as const,
        content: initialMessage,
        speaker: 'User',
        timestamp: Date.now(),
      },
    ],
    turnCount: 0,
    maxTurns,
    eventHistory: [],
  },
});

export const selectAgent = (
  state: ConversationState,
  agentId: AgentId
): ConversationState => {
  if (state.kind !== ConversationStateKind.SelectingAgent) {
    return state;
  }

  return {
    kind: ConversationStateKind.GeneratingResponse,
    context: state.context,
    selectedAgent: agentId,
  };
};

export const addMessage = (
  state: ConversationState,
  message: Message
): ConversationState => {
  if (state.kind !== ConversationStateKind.GeneratingResponse) {
    return state;
  }

  const newContext: ConversationContext = {
    ...state.context,
    messages: [...state.context.messages, message],
    turnCount: state.context.turnCount + 1,
  };

  if (newContext.turnCount >= newContext.maxTurns) {
    return {
      kind: ConversationStateKind.Terminated,
      context: newContext,
      reason: 'Maximum turns reached',
    };
  }

  return {
    kind: ConversationStateKind.WaitingForTurn,
    context: newContext,
  };
};

export const continueTurn = (state: ConversationState): ConversationState => {
  if (state.kind !== ConversationStateKind.WaitingForTurn) {
    return state;
  }

  return {
    kind: ConversationStateKind.SelectingAgent,
    context: state.context,
  };
};

export const terminateConversation = (
  state: ConversationState,
  reason: string
): ConversationState => {
  if (state.kind === ConversationStateKind.Terminated || state.kind === ConversationStateKind.Idle) {
    return state;
  }

  return {
    kind: ConversationStateKind.Terminated,
    context:
      state.kind === ConversationStateKind.SelectingAgent ||
      state.kind === ConversationStateKind.GeneratingResponse ||
      state.kind === ConversationStateKind.WaitingForTurn
        ? state.context
        : {
            conversationId: '' as ConversationId,
            userId: '' as UserId,
            agents: [],
            messages: [],
            turnCount: 0,
            maxTurns: 0,
            eventHistory: [],
          },
    reason,
  };
};

export const applyEvent = (
  state: ConversationState,
  event: ConversationEvent
): ConversationState => {
  switch (event.type) {
    case 'ConversationStarted':
      return state;

    case 'AgentSelected':
      return selectAgent(state, event.agentId);

    case 'MessageGenerated':
      return addMessage(state, {
        ...event.message,
        agentId: event.message.agentId as AgentId | undefined
      });

    case 'TurnCompleted':
      return continueTurn(state);

    case 'ConversationTerminated':
      return terminateConversation(state, event.reason);

    case 'ErrorOccurred':
      return terminateConversation(state, `Error: ${event.error}`);

    default:
      return state;
  }
};

export const isIdle = (state: ConversationState): state is { kind: 'Idle' } =>
  state.kind === ConversationStateKind.Idle;

export const isSelectingAgent = (
  state: ConversationState
): state is { kind: 'SelectingAgent'; context: ConversationContext } =>
  state.kind === ConversationStateKind.SelectingAgent;

export const isGeneratingResponse = (
  state: ConversationState
): state is {
  kind: 'GeneratingResponse';
  context: ConversationContext;
  selectedAgent: AgentId;
} => state.kind === ConversationStateKind.GeneratingResponse;

export const isWaitingForTurn = (
  state: ConversationState
): state is { kind: 'WaitingForTurn'; context: ConversationContext } =>
  state.kind === ConversationStateKind.WaitingForTurn;

export const isTerminated = (
  state: ConversationState
): state is {
  kind: 'Terminated';
  context: ConversationContext;
  reason: string;
} => state.kind === ConversationStateKind.Terminated;

export const getProgress = (state: ConversationState): number => {
  if (state.kind === ConversationStateKind.Idle) return 0;
  if (state.kind === ConversationStateKind.Terminated) return 100;

  const context = 'context' in state ? state.context : null;
  if (!context) return 0;

  return Math.round((context.turnCount / context.maxTurns) * 100);
};
