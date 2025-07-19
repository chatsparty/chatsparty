import { AgentId } from '../core/types';

// Conversation State Kinds
export const ConversationStateKind = {
  Idle: 'Idle',
  SelectingAgent: 'SelectingAgent',
  GeneratingResponse: 'GeneratingResponse',
  WaitingForTurn: 'WaitingForTurn',
  Terminated: 'Terminated',
} as const;

export type ConversationStateKindType = typeof ConversationStateKind[keyof typeof ConversationStateKind];

// Event Types
export const ConversationEventType = {
  ConversationStarted: 'ConversationStarted',
  ConversationJoined: 'ConversationJoined',
  AgentSelected: 'AgentSelected',
  MessageGenerated: 'MessageGenerated',
  TurnCompleted: 'TurnCompleted',
  ConversationTerminated: 'ConversationTerminated',
  ErrorOccurred: 'ErrorOccurred',
} as const;

export type ConversationEventTypeValue = typeof ConversationEventType[keyof typeof ConversationEventType];

// Agent Constants
export const CONTROLLER_AGENT_ID = 'controller' as AgentId;
export const CONTROLLER_AGENT_NAME = 'Controller';

// Termination Keywords
export const TERMINATION_KEYWORD = 'TERMINATE';
export const CONTINUATION_KEYWORD = 'CONTINUE';

// Farewell Keywords
export const FAREWELL_KEYWORDS = [
  'goodbye',
  'bye',
  'see you',
  'talk later',
  'thanks',
  'thank you',
] as const;

// Vertex AI Safety Settings
export const VertexAISafetyCategory = {
  HATE_SPEECH: 'HARM_CATEGORY_HATE_SPEECH',
  DANGEROUS_CONTENT: 'HARM_CATEGORY_DANGEROUS_CONTENT',
  SEXUALLY_EXPLICIT: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
  HARASSMENT: 'HARM_CATEGORY_HARASSMENT',
} as const;

export const VertexAISafetyThreshold = {
  BLOCK_NONE: 'BLOCK_NONE',
  BLOCK_ONLY_HIGH: 'BLOCK_ONLY_HIGH',
  BLOCK_MEDIUM_AND_ABOVE: 'BLOCK_MEDIUM_AND_ABOVE',
  BLOCK_LOW_AND_ABOVE: 'BLOCK_LOW_AND_ABOVE',
} as const;

// Default Safety Settings for Vertex AI
export const DEFAULT_VERTEX_AI_SAFETY_SETTINGS = [
  {
    category: VertexAISafetyCategory.HATE_SPEECH,
    threshold: VertexAISafetyThreshold.BLOCK_NONE,
  },
  {
    category: VertexAISafetyCategory.DANGEROUS_CONTENT,
    threshold: VertexAISafetyThreshold.BLOCK_NONE,
  },
  {
    category: VertexAISafetyCategory.SEXUALLY_EXPLICIT,
    threshold: VertexAISafetyThreshold.BLOCK_NONE,
  },
  {
    category: VertexAISafetyCategory.HARASSMENT,
    threshold: VertexAISafetyThreshold.BLOCK_NONE,
  },
] as const;