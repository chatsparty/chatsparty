import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  CreateAgentSchema,
  UpdateAgentSchema,
  AgentIdSchema,
  AgentQuerySchema,
  PaginationSchema,
  ListAgentsResponseSchema,
  PublicAgentSchema,
} from '../../domains/agents/types';
import { z } from 'zod';

const tags = ['Agents'];
const security = [{ bearerAuth: [] }];

export const createAgentSchema = {
  tags,
  security,
  description: 'Create a new agent',
  body: zodToJsonSchema(CreateAgentSchema),
  response: {
    201: zodToJsonSchema(PublicAgentSchema),
  },
};

export const listAgentsSchema = {
  tags,
  security,
  description: 'List agents with optional filters',
  querystring: zodToJsonSchema(AgentQuerySchema.merge(PaginationSchema)),
  response: {
    200: zodToJsonSchema(ListAgentsResponseSchema),
  },
};

export const getAgentSchema = {
  tags,
  security,
  description: 'Get a specific agent by ID',
  params: zodToJsonSchema(AgentIdSchema),
  response: {
    200: zodToJsonSchema(PublicAgentSchema),
  },
};

export const updateAgentSchema = {
  tags,
  security,
  description: 'Update an existing agent',
  params: zodToJsonSchema(AgentIdSchema),
  body: zodToJsonSchema(UpdateAgentSchema),
  response: {
    200: zodToJsonSchema(PublicAgentSchema),
  },
};

export const deleteAgentSchema = {
  tags,
  security,
  description: 'Delete an agent',
  params: zodToJsonSchema(AgentIdSchema),
  response: {
    204: {
      type: 'null',
      description: 'Agent deleted successfully',
    },
  },
};
