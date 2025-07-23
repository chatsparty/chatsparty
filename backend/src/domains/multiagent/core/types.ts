import { z } from 'zod';

export const ModelConfigurationSchema = z.object({
  provider: z.enum([
    'openai',
    'anthropic',
    'google',
    'vertex_ai',
    'groq',
    'ollama',
    'azure-openai',
  ]),
  modelName: z.string(),
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
  connectionId: z.string().optional(),
  resourceName: z.string().optional(), // Azure-specific
  apiVersion: z.string().optional(), // Azure-specific
});

export type ModelConfiguration = z.infer<typeof ModelConfigurationSchema>;

export const ChatStyleSchema = z.object({
  friendliness: z.enum(['friendly', 'formal', 'balanced']).default('friendly'),
  responseLength: z.enum(['short', 'medium', 'long']).default('medium'),
  personality: z
    .enum(['enthusiastic', 'reserved', 'balanced'])
    .default('balanced'),
  humor: z.enum(['witty', 'light', 'none']).default('light'),
  expertiseLevel: z
    .enum(['beginner', 'intermediate', 'expert'])
    .default('expert'),
});

export type ChatStyle = z.infer<typeof ChatStyleSchema>;

export const AgentIdSchema = z.string().brand('AgentId');
export type AgentId = z.infer<typeof AgentIdSchema>;

export const ConversationIdSchema = z.string().brand('ConversationId');
export type ConversationId = z.infer<typeof ConversationIdSchema>;

export const UserIdSchema = z.string().brand('UserId');
export type UserId = z.infer<typeof UserIdSchema>;

export const AgentSchema = z.object({
  agentId: AgentIdSchema,
  name: z.string(),
  prompt: z.string(),
  characteristics: z.string(),
  aiConfig: ModelConfigurationSchema,
  chatStyle: ChatStyleSchema,
  connectionId: z.string(),
  maxTokens: z.number().optional(),
});

export type Agent = z.infer<typeof AgentSchema>;

export const MessageRoleSchema = z.enum(['user', 'assistant', 'system']);
export type MessageRole = z.infer<typeof MessageRoleSchema>;

export const MessageSchema = z.object({
  role: MessageRoleSchema,
  content: z.string(),
  timestamp: z.number(),
  agentId: AgentIdSchema.optional(),
  speaker: z.string().optional(),
});

export type Message = z.infer<typeof MessageSchema>;

export type Result<T, E = Error> =
  | { kind: 'ok'; value: T }
  | { kind: 'error'; error: E };

export const ok = <T, E = Error>(value: T): Result<T, E> => ({
  kind: 'ok',
  value,
});
export const error = <E = Error>(error: E): Result<never, E> => ({
  kind: 'error',
  error,
});

export type NonEmptyArray<T> = [T, ...T[]];

export const isNonEmpty = <T>(arr: T[]): arr is NonEmptyArray<T> =>
  arr.length > 0;
