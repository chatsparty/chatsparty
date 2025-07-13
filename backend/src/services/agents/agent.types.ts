import { Agent } from '@prisma/client';
import { z } from 'zod';
import { 
  ModelConfigurationSchema, 
  ChatStyleSchema,
  ModelConfiguration,
  ChatStyle
} from '../ai/types';

// Agent creation input
export const CreateAgentInputSchema = z.object({
  name: z.string().min(1).max(100),
  prompt: z.string().min(1).max(5000),
  characteristics: z.string().min(1).max(2000),
  connectionId: z.string().cuid(),
  aiConfig: ModelConfigurationSchema,
  chatStyle: ChatStyleSchema,
});

export type CreateAgentInput = z.infer<typeof CreateAgentInputSchema>;

// Agent update input
export const UpdateAgentInputSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  prompt: z.string().min(1).max(5000).optional(),
  characteristics: z.string().min(1).max(2000).optional(),
  connectionId: z.string().cuid().optional(),
  aiConfig: ModelConfigurationSchema.optional(),
  chatStyle: ChatStyleSchema.optional(),
});

export type UpdateAgentInput = z.infer<typeof UpdateAgentInputSchema>;

// Agent response type
export interface AgentWithRelations extends Agent {}

// Agent response formatting
export interface AgentResponse {
  id: string;
  name: string;
  prompt: string;
  characteristics: string;
  connectionId: string;
  aiConfig: ModelConfiguration;
  chatStyle: ChatStyle;
  createdAt: Date;
  updatedAt: Date;
}

// Agent query filters
export interface AgentFilters {
  userId: string;
  name?: string;
  connectionId?: string;
}

// Agent service response types
export interface AgentServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Agent validation errors
export interface AgentValidationError {
  field: string;
  message: string;
}

// Agent limits
export const AGENT_LIMITS = {
  MAX_NAME_LENGTH: 100,
  MAX_PROMPT_LENGTH: 5000,
  MAX_CHARACTERISTICS_LENGTH: 2000,
  MAX_AGENTS_PER_USER: 50,
  DEFAULT_AGENTS_PER_PAGE: 20,
} as const;

// Helper function to format agent response
export function formatAgentResponse(agent: AgentWithRelations): AgentResponse {
  return {
    id: agent.id,
    name: agent.name,
    prompt: agent.prompt,
    characteristics: agent.characteristics,
    connectionId: agent.connectionId,
    aiConfig: agent.aiConfig as ModelConfiguration,
    chatStyle: agent.chatStyle as ChatStyle,
    createdAt: agent.createdAt,
    updatedAt: agent.updatedAt,
  };
}