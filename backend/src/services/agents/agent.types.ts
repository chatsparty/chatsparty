import { Agent, VoiceConnection } from '@prisma/client';
import { z } from 'zod';
import { 
  ModelConfigurationSchema, 
  ChatStyleSchema, 
  VoiceConfigSchema,
  ModelConfiguration,
  ChatStyle,
  VoiceConfig
} from '../ai/types';

// Agent creation input
export const CreateAgentInputSchema = z.object({
  name: z.string().min(1).max(100),
  prompt: z.string().min(1).max(5000),
  characteristics: z.string().min(1).max(2000),
  connectionId: z.string().cuid(),
  gender: z.enum(['MALE', 'FEMALE', 'NEUTRAL']).default('NEUTRAL'),
  aiConfig: ModelConfigurationSchema,
  chatStyle: ChatStyleSchema,
  voiceConfig: VoiceConfigSchema.optional(),
});

export type CreateAgentInput = z.infer<typeof CreateAgentInputSchema>;

// Agent update input
export const UpdateAgentInputSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  prompt: z.string().min(1).max(5000).optional(),
  characteristics: z.string().min(1).max(2000).optional(),
  connectionId: z.string().cuid().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'NEUTRAL']).optional(),
  aiConfig: ModelConfigurationSchema.optional(),
  chatStyle: ChatStyleSchema.optional(),
  voiceConfig: VoiceConfigSchema.optional(),
});

export type UpdateAgentInput = z.infer<typeof UpdateAgentInputSchema>;

// Agent response type with expanded relations
export interface AgentWithRelations extends Agent {
  voiceConnection?: VoiceConnection | null;
}

// Agent response formatting
export interface AgentResponse {
  id: string;
  name: string;
  prompt: string;
  characteristics: string;
  connectionId: string;
  gender: string;
  aiConfig: ModelConfiguration;
  chatStyle: ChatStyle;
  voiceConfig?: VoiceConfig;
  voiceEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Agent query filters
export interface AgentFilters {
  userId: string;
  name?: string;
  connectionId?: string;
  voiceEnabled?: boolean;
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
  console.log('🔍 Backend formatting agent:', { 
    id: agent.id, 
    name: agent.name, 
    connectionId: agent.connectionId,
    typeof_connectionId: typeof agent.connectionId,
    hasConnectionId: 'connectionId' in agent,
    agentKeys: Object.keys(agent)
  });
  
  const response = {
    id: agent.id,
    name: agent.name,
    prompt: agent.prompt,
    characteristics: agent.characteristics,
    connectionId: agent.connectionId,
    gender: agent.gender,
    aiConfig: agent.aiConfig as ModelConfiguration,
    chatStyle: agent.chatStyle as ChatStyle,
    voiceConfig: agent.voiceConnectionId && agent.voiceConnection ? {
      voiceEnabled: agent.voiceEnabled,
      voiceConnectionId: agent.voiceConnectionId,
      selectedVoiceId: agent.voiceConnection.voiceId || undefined,
      podcastSettings: agent.podcastSettings as Record<string, any> || undefined,
    } : undefined,
    voiceEnabled: agent.voiceEnabled,
    createdAt: agent.createdAt,
    updatedAt: agent.updatedAt,
  };
  
  console.log('🔍 Formatted response:', { 
    id: response.id, 
    name: response.name, 
    connectionId: response.connectionId 
  });
  
  return response;
}