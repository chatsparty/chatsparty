import { Agent as PrismaAgent } from '@prisma/client';
import { z } from 'zod';
import {
  CreateAgentInputSchema,
  UpdateAgentInputSchema,
} from './agent.schemas';
import {
  ModelConfiguration,
  ChatStyle,
  Agent as DomainAgent,
} from '../../domains/ai/types';

export type CreateAgentInput = z.infer<typeof CreateAgentInputSchema>;
export type UpdateAgentInput = z.infer<typeof UpdateAgentInputSchema>;

export interface AgentWithRelations extends PrismaAgent {}

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
  if (!agent.aiConfig || typeof agent.aiConfig !== 'object') {
    throw new Error(`Agent ${agent.id} has missing or invalid aiConfig`);
  }
  const validAiConfig = agent.aiConfig as ModelConfiguration;

  // Ensure chatStyle has default values
  const chatStyle = (agent.chatStyle as any) || {};
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
export function toDomainAgent(agentResponse: AgentResponse): DomainAgent {
  return {
    agentId: agentResponse.id,
    name: agentResponse.name,
    prompt: agentResponse.prompt,
    characteristics: agentResponse.characteristics,
    aiConfig: agentResponse.aiConfig,
    chatStyle: agentResponse.chatStyle,
    connectionId: agentResponse.connectionId,
  };
}
