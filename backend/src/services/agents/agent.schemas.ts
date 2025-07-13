import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  ModelConfigurationSchema,
  ChatStyleSchema,
} from '../ai/types';

const AgentSchema = z.object({
  id: z.string().cuid(),
  name: z.string(),
  prompt: z.string(),
  characteristics: z.string(),
  connectionId: z.string().cuid(),
  aiConfig: ModelConfigurationSchema,
  chatStyle: ChatStyleSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateAgentInputSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  prompt: z.string().min(1, 'Prompt is required').max(5000),
  characteristics: z.string().min(1, 'Characteristics are required').max(2000),
  connectionId: z.string().cuid('Invalid connection ID'),
  aiConfig: ModelConfigurationSchema,
  chatStyle: ChatStyleSchema,
});

export const UpdateAgentInputSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  prompt: z.string().min(1).max(5000).optional(),
  characteristics: z.string().min(1).max(2000).optional(),
  connectionId: z.string().cuid().optional(),
  aiConfig: ModelConfigurationSchema.optional(),
  chatStyle: ChatStyleSchema.optional(),
});

const paramsSchema = z.object({
  agentId: z.string().cuid('Invalid agent ID format'),
});

const querystringSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  name: z.string().optional(),
  connectionId: z.string().cuid().optional(),
});

const AgentResponseSchema = AgentSchema.extend({
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const ListAgentsResponseSchema = z.object({
  agents: z.array(AgentResponseSchema),
  pagination: z.object({
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
  }),
});

export const agentSchemas = {
  createAgent: {
    description: 'Create a new agent',
    tags: ['Agents'],
    security: [{ bearerAuth: [] }],
    body: zodToJsonSchema(CreateAgentInputSchema),
    response: {
      201: zodToJsonSchema(AgentResponseSchema),
    },
  },
  getAgent: {
    description: 'Get a specific agent by ID',
    tags: ['Agents'],
    security: [{ bearerAuth: [] }],
    params: zodToJsonSchema(paramsSchema),
    response: {
      200: zodToJsonSchema(AgentResponseSchema),
    },
  },
  listAgents: {
    description: 'List agents with optional filters',
    tags: ['Agents'],
    security: [{ bearerAuth: [] }],
    querystring: zodToJsonSchema(querystringSchema),
    response: {
      200: zodToJsonSchema(ListAgentsResponseSchema),
    },
  },
  updateAgent: {
    description: 'Update an existing agent',
    tags: ['Agents'],
    security: [{ bearerAuth: [] }],
    params: zodToJsonSchema(paramsSchema),
    body: zodToJsonSchema(UpdateAgentInputSchema),
    response: {
      200: zodToJsonSchema(AgentResponseSchema),
    },
  },
  deleteAgent: {
    description: 'Delete an agent',
    tags: ['Agents'],
    security: [{ bearerAuth: [] }],
    params: zodToJsonSchema(paramsSchema),
    response: {
      204: {
        type: 'null',
        description: 'Agent deleted successfully',
      },
    },
  },
};