import { z } from 'zod';

// Chat request schemas
export const chatRequestSchema = z.object({
  body: z.object({
    message: z.string().min(1, 'Message cannot be empty').max(10000, 'Message is too long'),
    agentId: z.string().uuid().optional(),
    conversationId: z.string().uuid().optional(),
    stream: z.boolean().default(true),
  }),
});

export const multiAgentChatRequestSchema = z.object({
  body: z.object({
    message: z.string().min(1, 'Message cannot be empty').max(10000, 'Message is too long'),
    agentIds: z.array(z.string().uuid()).min(2, 'At least 2 agents required for multi-agent chat').max(10, 'Maximum 10 agents allowed'),
    conversationId: z.string().uuid().optional(),
    maxTurns: z.number().int().min(1).max(50).default(10),
    stream: z.boolean().default(true),
  }),
});

// Conversation query schemas
export const getConversationSchema = z.object({
  params: z.object({
    conversationId: z.string().uuid(),
  }),
});

export const listConversationsSchema = z.object({
  query: z.object({
    page: z.number().int().positive().default(1),
    limit: z.number().int().positive().max(100).default(20),
    agentId: z.string().uuid().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    search: z.string().optional(),
  }),
});

export const deleteConversationSchema = z.object({
  params: z.object({
    conversationId: z.string().uuid(),
  }),
});

// Message schemas
export const addMessageSchema = z.object({
  params: z.object({
    conversationId: z.string().uuid(),
  }),
  body: z.object({
    message: z.string().min(1).max(10000),
    role: z.enum(['user', 'assistant']),
    agentId: z.string().uuid().optional(),
  }),
});

export const getMessagesSchema = z.object({
  params: z.object({
    conversationId: z.string().uuid(),
  }),
  query: z.object({
    limit: z.number().int().positive().max(1000).default(100),
    offset: z.number().int().min(0).default(0),
  }),
});

export const createConversationSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title cannot be empty').max(100, 'Title is too long'),
    agentIds: z.array(z.string().uuid()).min(1, 'At least 1 agent required').max(10, 'Maximum 10 agents allowed'),
    metadata: z.record(z.any()).optional(),
  }),
});

// Validation helpers
export type ChatRequestInput = z.infer<typeof chatRequestSchema.shape.body>;
export type MultiAgentChatRequestInput = z.infer<typeof multiAgentChatRequestSchema.shape.body>;
export type ConversationListQuery = z.infer<typeof listConversationsSchema.shape.query>;
export type AddMessageInput = z.infer<typeof addMessageSchema.shape.body>;
export type GetMessagesQuery = z.infer<typeof getMessagesSchema.shape.query>;
export type CreateConversationInput = z.infer<typeof createConversationSchema.shape.body>;