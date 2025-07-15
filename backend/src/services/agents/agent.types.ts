import { Agent } from '@prisma/client';
import { z } from 'zod';
import {
  CreateAgentInputSchema,
  UpdateAgentInputSchema,
} from './agent.schemas';
import { ModelConfiguration, ChatStyle } from '../ai/types';

export type CreateAgentInput = z.infer<typeof CreateAgentInputSchema>;
export type UpdateAgentInput = z.infer<typeof UpdateAgentInputSchema>;

export interface AgentWithRelations extends Agent {}

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

export interface AgentFilters {
  userId: string;
  name?: string;
  connectionId?: string;
}

export interface AgentServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface AgentValidationError {
  field: string;
  message: string;
}

export const AGENT_LIMITS = {
  MAX_NAME_LENGTH: 100,
  MAX_PROMPT_LENGTH: 5000,
  MAX_CHARACTERISTICS_LENGTH: 2000,
  MAX_AGENTS_PER_USER: 50,
  DEFAULT_AGENTS_PER_PAGE: 20,
} as const;

export function formatAgentResponse(agent: AgentWithRelations): AgentResponse {
  // Ensure aiConfig has required fields
  const aiConfig = agent.aiConfig as any;
  const validAiConfig: ModelConfiguration = {
    provider: aiConfig?.provider || 'openai',
    modelName: aiConfig?.modelName || aiConfig?.model || 'gpt-3.5-turbo',
    connectionId: aiConfig?.connectionId || agent.connectionId,
    apiKey: aiConfig?.apiKey,
    baseUrl: aiConfig?.baseUrl,
  };

  // Ensure chatStyle has default values
  const chatStyle = agent.chatStyle as any || {};
  const validChatStyle: ChatStyle = {
    friendliness: chatStyle?.friendliness || 'friendly',
    responseLength: chatStyle?.responseLength || 'medium',
    personality: chatStyle?.personality || 'balanced',
    humor: chatStyle?.humor || 'light',
    expertiseLevel: chatStyle?.expertiseLevel || 'expert',
  };

  return {
    id: agent.id,
    name: agent.name,
    prompt: agent.prompt,
    characteristics: agent.characteristics,
    connectionId: agent.connectionId,
    aiConfig: validAiConfig,
    chatStyle: validChatStyle,
    createdAt: agent.createdAt,
    updatedAt: agent.updatedAt,
  };
}