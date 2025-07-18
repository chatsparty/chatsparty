import { z } from 'zod';
import { AgentId, ConversationId, UserId, Message } from '../core/types';

const ConversationIdSchema = z
  .string()
  .refine((_val): _val is ConversationId => true);
const UserIdSchema = z.string().refine((_val): _val is UserId => true);
const AgentIdSchema = z.string().refine((_val): _val is AgentId => true);
const MessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  timestamp: z.number(),
  agentId: z.string().optional(),
  speaker: z.string().optional(),
});

const BaseEventSchema = z.object({
  eventId: z.string(),
  conversationId: ConversationIdSchema,
  timestamp: z.number(),
  version: z.number().default(1),
});

export const ConversationStartedEventSchema = BaseEventSchema.extend({
  type: z.literal('ConversationStarted'),
  userId: UserIdSchema,
  agentIds: z.array(AgentIdSchema),
  maxTurns: z.number(),
  initialMessage: z.string(),
});

export const AgentSelectedEventSchema = BaseEventSchema.extend({
  type: z.literal('AgentSelected'),
  agentId: AgentIdSchema,
  reasoning: z.string().optional(),
});

export const MessageGeneratedEventSchema = BaseEventSchema.extend({
  type: z.literal('MessageGenerated'),
  message: MessageSchema,
});

export const ConversationTerminatedEventSchema = BaseEventSchema.extend({
  type: z.literal('ConversationTerminated'),
  reason: z.string(),
});

export const TurnCompletedEventSchema = BaseEventSchema.extend({
  type: z.literal('TurnCompleted'),
  turnNumber: z.number(),
});

export const ErrorOccurredEventSchema = BaseEventSchema.extend({
  type: z.literal('ErrorOccurred'),
  error: z.string(),
  agentId: AgentIdSchema.optional(),
});

export const ConversationEventSchema = z.discriminatedUnion('type', [
  ConversationStartedEventSchema,
  AgentSelectedEventSchema,
  MessageGeneratedEventSchema,
  ConversationTerminatedEventSchema,
  TurnCompletedEventSchema,
  ErrorOccurredEventSchema,
]);

export type ConversationEvent = z.infer<typeof ConversationEventSchema>;
export type ConversationStartedEvent = z.infer<
  typeof ConversationStartedEventSchema
>;
export type AgentSelectedEvent = z.infer<typeof AgentSelectedEventSchema>;
export type MessageGeneratedEvent = z.infer<typeof MessageGeneratedEventSchema>;
export type ConversationTerminatedEvent = z.infer<
  typeof ConversationTerminatedEventSchema
>;
export type TurnCompletedEvent = z.infer<typeof TurnCompletedEventSchema>;
export type ErrorOccurredEvent = z.infer<typeof ErrorOccurredEventSchema>;

export const createConversationStartedEvent = (
  params: Omit<
    ConversationStartedEvent,
    'eventId' | 'timestamp' | 'type' | 'version'
  >
): ConversationStartedEvent => ({
  ...params,
  type: 'ConversationStarted',
  eventId: crypto.randomUUID(),
  timestamp: Date.now(),
  version: 1,
});

export const createAgentSelectedEvent = (
  conversationId: ConversationId,
  agentId: AgentId,
  reasoning?: string
): AgentSelectedEvent => ({
  type: 'AgentSelected',
  eventId: crypto.randomUUID(),
  conversationId,
  agentId,
  reasoning,
  timestamp: Date.now(),
  version: 1,
});

export const createMessageGeneratedEvent = (
  conversationId: ConversationId,
  message: Message
): MessageGeneratedEvent => ({
  type: 'MessageGenerated',
  eventId: crypto.randomUUID(),
  conversationId,
  message,
  timestamp: Date.now(),
  version: 1,
});

export const createConversationTerminatedEvent = (
  conversationId: ConversationId,
  reason: string
): ConversationTerminatedEvent => ({
  type: 'ConversationTerminated',
  eventId: crypto.randomUUID(),
  conversationId,
  reason,
  timestamp: Date.now(),
  version: 1,
});

export const createTurnCompletedEvent = (
  conversationId: ConversationId,
  turnNumber: number
): TurnCompletedEvent => ({
  type: 'TurnCompleted',
  eventId: crypto.randomUUID(),
  conversationId,
  turnNumber,
  timestamp: Date.now(),
  version: 1,
});

export const createErrorOccurredEvent = (
  conversationId: ConversationId,
  error: string,
  agentId?: AgentId
): ErrorOccurredEvent => ({
  type: 'ErrorOccurred',
  eventId: crypto.randomUUID(),
  conversationId,
  error,
  agentId,
  timestamp: Date.now(),
  version: 1,
});
