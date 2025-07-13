import { z } from 'zod';
import {
  CreateAgentInputSchema,
  UpdateAgentInputSchema,
} from './agent.schemas';

export const createAgentBodySchema = z.object({
  body: CreateAgentInputSchema,
});

export const updateAgentBodySchema = z.object({
  body: UpdateAgentInputSchema,
});

export const agentIdParamSchema = z.object({
  params: z.object({
    agentId: z.string().cuid('Invalid agent ID format'),
  }),
});

export const listAgentsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce
      .number()
      .int()
      .positive()
      .max(100)
      .default(20),
    name: z.string().optional(),
    connectionId: z.string().cuid().optional(),
    voiceEnabled: z
      .enum(['true', 'false'])
      .transform(val => val === 'true')
      .optional(),
  }),
});

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

export function validateVoiceConfig(voiceConfig: any): string | null {
  if (!voiceConfig || !voiceConfig.voiceEnabled) {
    return null;
  }

  if (voiceConfig.voiceEnabled && !voiceConfig.voiceConnectionId) {
    return 'Voice connection ID is required when voice is enabled';
  }

  return null;
}
