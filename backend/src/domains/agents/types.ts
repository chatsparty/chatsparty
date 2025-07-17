import { z } from 'zod';
import { Agent as PrismaAgent } from '@prisma/client';
import { ModelConfigurationSchema, ChatStyleSchema } from '../ai/types';

export interface Agent extends PrismaAgent {}

export const PublicAgentSchema = z.object({
  id: z.string().cuid(),
  name: z.string(),
  prompt: z.string(),
  characteristics: z.string(),
  connectionId: z.string().cuid(),
  aiConfig: ModelConfigurationSchema,
  chatStyle: ChatStyleSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type PublicAgent = z.infer<typeof PublicAgentSchema>;

export const CreateAgentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  prompt: z.string().min(1, 'Prompt is required').max(5000),
  characteristics: z.string().min(1, 'Characteristics are required').max(2000),
  connectionId: z
    .string()
    .refine(
      id =>
        id === 'default' ||
        id.startsWith('system-default-') ||
        /^c[^\s-]{8,}$/i.test(id),
      'Connection ID must be "default", "system-default-{provider}", or a valid CUID'
    ),
  aiConfig: ModelConfigurationSchema,
  chatStyle: ChatStyleSchema,
});

export const UpdateAgentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  prompt: z.string().min(1).max(5000).optional(),
  characteristics: z.string().min(1).max(2000).optional(),
  connectionId: z
    .string()
    .refine(
      id =>
        id === 'default' ||
        id.startsWith('system-default-') ||
        /^c[^\s-]{8,}$/i.test(id),
      'Connection ID must be "default", "system-default-{provider}", or a valid CUID'
    )
    .optional(),
  aiConfig: ModelConfigurationSchema.optional(),
  chatStyle: ChatStyleSchema.optional(),
});

export const AgentIdSchema = z.object({
  id: z.string().cuid('Invalid agent ID format'),
});

export const AgentQuerySchema = z.object({
  name: z.string().optional(),
  connectionId: z.string().optional(),
});

export const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const ListAgentsResponseSchema = z.object({
  agents: z.array(PublicAgentSchema),
  pagination: z.object({
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
  }),
});

export type CreateAgentRequest = z.infer<typeof CreateAgentSchema>;
export type UpdateAgentRequest = z.infer<typeof UpdateAgentSchema>;
export type AgentQueryOptions = z.infer<typeof AgentQuerySchema>;
export type PaginationOptions = z.infer<typeof PaginationSchema>;

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface AgentListResponse {
  agents: PublicAgent[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}
