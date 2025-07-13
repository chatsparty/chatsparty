import { z } from 'zod';
import { 
  CreateAgentInputSchema, 
  UpdateAgentInputSchema,
  AGENT_LIMITS 
} from './agent.types';
import { AIProvider } from '../connections/connection.types';

// Request body schemas
export const createAgentBodySchema = z.object({
  body: CreateAgentInputSchema,
});

export const updateAgentBodySchema = z.object({
  body: UpdateAgentInputSchema,
});

// Route parameter schemas
export const agentIdParamSchema = z.object({
  params: z.object({
    agentId: z.string().cuid('Invalid agent ID format'),
  }),
});

// Query parameter schemas
export const listAgentsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(AGENT_LIMITS.DEFAULT_AGENTS_PER_PAGE),
    name: z.string().optional(),
    connectionId: z.string().cuid().optional(),
    voiceEnabled: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
  }),
});

// Combined schemas for routes
export const createAgentSchema = z.object({
  body: CreateAgentInputSchema,
});

export const updateAgentSchema = z.object({
  params: z.object({
    agentId: z.string().cuid('Invalid agent ID format'),
  }),
  body: UpdateAgentInputSchema,
});

export const deleteAgentSchema = z.object({
  params: z.object({
    agentId: z.string().cuid('Invalid agent ID format'),
  }),
});

export const getAgentSchema = z.object({
  params: z.object({
    agentId: z.string().cuid('Invalid agent ID format'),
  }),
});

// Validation helper functions
export function validateAgentName(name: string): string | null {
  if (!name || name.trim().length === 0) {
    return 'Agent name is required';
  }
  if (name.length > AGENT_LIMITS.MAX_NAME_LENGTH) {
    return `Agent name must be less than ${AGENT_LIMITS.MAX_NAME_LENGTH} characters`;
  }
  return null;
}

export function validateAgentPrompt(prompt: string): string | null {
  if (!prompt || prompt.trim().length === 0) {
    return 'Agent prompt is required';
  }
  if (prompt.length > AGENT_LIMITS.MAX_PROMPT_LENGTH) {
    return `Agent prompt must be less than ${AGENT_LIMITS.MAX_PROMPT_LENGTH} characters`;
  }
  return null;
}

export function validateAgentCharacteristics(characteristics: string): string | null {
  if (!characteristics || characteristics.trim().length === 0) {
    return 'Agent characteristics are required';
  }
  if (characteristics.length > AGENT_LIMITS.MAX_CHARACTERISTICS_LENGTH) {
    return `Agent characteristics must be less than ${AGENT_LIMITS.MAX_CHARACTERISTICS_LENGTH} characters`;
  }
  return null;
}

// AI configuration validation
export function validateAIConfig(aiConfig: any): string | null {
  if (!aiConfig) {
    return 'AI configuration is required';
  }
  
  if (!aiConfig.provider) {
    return 'AI provider is required';
  }
  
  const validProviders: AIProvider[] = ['openai', 'anthropic', 'google', 'groq', 'ollama', 'vertex_ai'];
  if (!validProviders.includes(aiConfig.provider)) {
    return `Invalid AI provider. Must be one of: ${validProviders.join(', ')}`;
  }
  
  if (!aiConfig.modelName) {
    return 'Model name is required';
  }
  
  // For certain providers like vertex_ai, API key may not be required
  // if using default system configuration
  if (!aiConfig.connectionId && !aiConfig.apiKey && 
      !['vertex_ai', 'ollama'].includes(aiConfig.provider)) {
    return 'Either connectionId or apiKey must be provided';
  }
  
  return null;
}

// Chat style validation
export function validateChatStyle(chatStyle: any): string | null {
  if (!chatStyle) {
    return null; // Chat style is optional, will use defaults
  }
  
  const validValues = {
    friendliness: ['friendly', 'formal', 'balanced'],
    responseLength: ['short', 'medium', 'long'],
    personality: ['enthusiastic', 'reserved', 'balanced'],
    humor: ['witty', 'light', 'none'],
    expertiseLevel: ['beginner', 'intermediate', 'expert'],
  };
  
  for (const [key, values] of Object.entries(validValues)) {
    if (chatStyle[key] && !values.includes(chatStyle[key])) {
      return `Invalid ${key}. Must be one of: ${values.join(', ')}`;
    }
  }
  
  return null;
}

// Voice configuration validation
export function validateVoiceConfig(voiceConfig: any): string | null {
  if (!voiceConfig || !voiceConfig.voiceEnabled) {
    return null; // Voice is optional
  }
  
  if (voiceConfig.voiceEnabled && !voiceConfig.voiceConnectionId) {
    return 'Voice connection ID is required when voice is enabled';
  }
  
  return null;
}