import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

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

// JSON Schema exports for Fastify
export const conversationSchemas = {
  createConversation: {
    body: zodToJsonSchema(createConversationSchema.shape.body),
  },
  getConversation: {
    params: zodToJsonSchema(getConversationSchema.shape.params),
  },
  listConversations: {
    querystring: zodToJsonSchema(listConversationsSchema.shape.query),
  },
  deleteConversation: {
    params: zodToJsonSchema(deleteConversationSchema.shape.params),
  },
  addMessage: {
    params: zodToJsonSchema(addMessageSchema.shape.params),
    body: zodToJsonSchema(addMessageSchema.shape.body),
  },
  getMessages: {
    params: zodToJsonSchema(getMessagesSchema.shape.params),
    querystring: zodToJsonSchema(getMessagesSchema.shape.query),
  },
};

// Validation helpers
export type ConversationListQuery = z.infer<typeof listConversationsSchema.shape.query>;
export type AddMessageInput = z.infer<typeof addMessageSchema.shape.body>;
export type GetMessagesQuery = z.infer<typeof getMessagesSchema.shape.query>;
export type CreateConversationInput = z.infer<typeof createConversationSchema.shape.body>;