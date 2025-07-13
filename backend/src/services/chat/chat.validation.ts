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


// JSON Schema definitions for Fastify
export const chatRequestJsonSchema = {
  description: 'Single agent chat endpoint',
  tags: ['Chat'],
  security: [{ bearerAuth: [] }],
  body: {
    type: 'object',
    required: ['message'],
    properties: {
      message: { type: 'string' },
      agentId: { type: 'string' },
      conversationId: { type: 'string' },
      stream: { type: 'boolean' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            response: { type: 'string' },
            conversationId: { type: 'string' },
            messageId: { type: 'string' },
          },
        },
      },
    },
    400: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        error: { type: 'string' },
      },
    },
  },
};

// Validation helpers
export type ChatRequestInput = z.infer<typeof chatRequestSchema.shape.body>;
export type MultiAgentChatRequestInput = z.infer<typeof multiAgentChatRequestSchema.shape.body>;