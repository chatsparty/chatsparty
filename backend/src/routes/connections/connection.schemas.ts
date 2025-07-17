import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  CreateConnectionSchema as createConnectionZodSchema,
  UpdateConnectionSchema as updateConnectionZodSchema,
  TestConnectionSchema as testConnectionZodSchema,
  ConnectionIdSchema,
  SetDefaultSchema,
  ConnectionQuerySchema,
  PaginationSchema,
  ListConnectionsResponseSchema,
  PublicConnectionSchema,
} from '../../domains/connections/types';
import { z } from 'zod';

const tags = ['Connections'];
const security = [{ bearerAuth: [] }];

export const createConnectionSchema = {
  tags,
  security,
  body: zodToJsonSchema(createConnectionZodSchema),
  response: {
    201: zodToJsonSchema(PublicConnectionSchema),
  },
};

export const listConnectionsSchema = {
  tags,
  security,
  querystring: zodToJsonSchema(ConnectionQuerySchema.merge(PaginationSchema)),
  response: {
    200: zodToJsonSchema(ListConnectionsResponseSchema),
  },
};

export const getConnectionSchema = {
  tags,
  security,
  params: zodToJsonSchema(ConnectionIdSchema),
  response: {
    200: zodToJsonSchema(
      PublicConnectionSchema.extend({
        availableModels: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
          })
        ),
      })
    ),
  },
};

export const updateConnectionSchema = {
  tags,
  security,
  params: zodToJsonSchema(ConnectionIdSchema),
  body: zodToJsonSchema(updateConnectionZodSchema),
  response: {
    200: zodToJsonSchema(PublicConnectionSchema),
  },
};

export const deleteConnectionSchema = {
  tags,
  security,
  params: zodToJsonSchema(ConnectionIdSchema),
  response: {
    204: {
      type: 'null',
    },
  },
};

export const testConnectionSchema = {
  tags,
  security,
  body: zodToJsonSchema(testConnectionZodSchema),
  response: {
    200: zodToJsonSchema(
      z.object({
        success: z.boolean(),
        message: z.string(),
        availableModels: z
          .array(
            z.object({
              id: z.string(),
              name: z.string(),
            })
          )
          .optional(),
        error: z.string().optional(),
      })
    ),
  },
};

export const setDefaultConnectionSchema = {
  tags,
  security,
  body: zodToJsonSchema(SetDefaultSchema),
  response: {
    200: zodToJsonSchema(PublicConnectionSchema),
  },
};

export const getDefaultConnectionSchema = {
  tags,
  security,
  params: zodToJsonSchema(z.object({ provider: z.string() })),
  response: {
    200: zodToJsonSchema(PublicConnectionSchema),
  },
};

export const getProviderInfoSchema = {
  tags,
  params: zodToJsonSchema(z.object({ provider: z.string() })),
  response: {
    200: zodToJsonSchema(
      z.object({
        name: z.string(),
        displayName: z.string(),
        requiresApiKey: z.boolean(),
        defaultModel: z.string(),
        customizable: z.boolean(),
      })
    ),
  },
};

export const getProvidersSchema = {
  tags,
  response: {
    200: zodToJsonSchema(
      z.array(
        z.object({
          name: z.string(),
          displayName: z.string(),
          requiresApiKey: z.boolean(),
          defaultModel: z.string(),
          customizable: z.boolean(),
        })
      )
    ),
  },
};

export const getProviderModelsSchema = {
  tags,
  params: zodToJsonSchema(z.object({ provider: z.string() })),
  response: {
    200: zodToJsonSchema(
      z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          description: z.string().optional(),
          contextWindow: z.number().optional(),
          maxTokens: z.number().optional(),
        })
      )
    ),
  },
};
