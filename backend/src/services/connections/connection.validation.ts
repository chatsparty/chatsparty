import { z } from 'zod';
import { PROVIDER_CONFIGS, AIProvider } from './connection.types';

// Helper to validate provider
const aiProviderSchema = z.enum([
  'openai',
  'anthropic',
  'google',
  'groq',
  'ollama',
  'vertex_ai',
] as const);

// Connection schemas
export const createConnectionSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters'),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  provider: aiProviderSchema,
  modelName: z.string()
    .min(1, 'Model name is required')
    .max(100, 'Model name must be less than 100 characters'),
  apiKey: z.string()
    .min(1, 'API key is required')
    .max(500, 'API key must be less than 500 characters')
    .optional(),
  baseUrl: z.string()
    .url('Invalid URL format')
    .max(500, 'Base URL must be less than 500 characters')
    .optional(),
  isActive: z.boolean().default(true),
}).refine((data) => {
  // Check if API key is required for the provider
  const providerConfig = PROVIDER_CONFIGS[data.provider as AIProvider];
  if (providerConfig.requiresApiKey && !data.apiKey) {
    return false;
  }
  return true;
}, {
  message: 'API key is required for this provider',
  path: ['apiKey'],
});

export const updateConnectionSchema = z.object({
  name: z.string()
    .min(1, 'Name cannot be empty')
    .max(100, 'Name must be less than 100 characters')
    .optional(),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .nullable()
    .optional(),
  modelName: z.string()
    .min(1, 'Model name cannot be empty')
    .max(100, 'Model name must be less than 100 characters')
    .optional(),
  apiKey: z.string()
    .min(1, 'API key cannot be empty')
    .max(500, 'API key must be less than 500 characters')
    .optional(),
  baseUrl: z.string()
    .url('Invalid URL format')
    .max(500, 'Base URL must be less than 500 characters')
    .nullable()
    .optional(),
  isActive: z.boolean().optional(),
});

export const testConnectionSchema = z.object({
  provider: aiProviderSchema,
  apiKey: z.string()
    .max(500, 'API key must be less than 500 characters')
    .optional(),
  baseUrl: z.string()
    .url('Invalid URL format')
    .max(500, 'Base URL must be less than 500 characters')
    .optional(),
  modelName: z.string()
    .max(100, 'Model name must be less than 100 characters')
    .optional(),
}).refine((data) => {
  // Check if API key is required for the provider
  const providerConfig = PROVIDER_CONFIGS[data.provider as AIProvider];
  if (providerConfig.requiresApiKey && !data.apiKey) {
    return false;
  }
  return true;
}, {
  message: 'API key is required for this provider',
  path: ['apiKey'],
});

// Query schemas
export const connectionIdSchema = z.object({
  id: z.string().cuid('Invalid connection ID'),
});

export const setDefaultSchema = z.object({
  connectionId: z.string().cuid('Invalid connection ID'),
});

export const connectionQuerySchema = z.object({
  includeInactive: z.boolean().default(false),
  provider: aiProviderSchema.optional(),
  onlyDefaults: z.boolean().default(false),
});

export const paginationSchema = z.object({
  limit: z.number().int().min(1).max(100).default(10),
  offset: z.number().int().min(0).default(0),
  orderBy: z.enum(['createdAt', 'updatedAt', 'name', 'provider']).default('createdAt'),
  orderDirection: z.enum(['asc', 'desc']).default('desc'),
});

// Type exports
export type CreateConnectionInput = z.infer<typeof createConnectionSchema>;
export type UpdateConnectionInput = z.infer<typeof updateConnectionSchema>;
export type TestConnectionInput = z.infer<typeof testConnectionSchema>;
export type ConnectionIdInput = z.infer<typeof connectionIdSchema>;
export type SetDefaultInput = z.infer<typeof setDefaultSchema>;
export type ConnectionQueryInput = z.infer<typeof connectionQuerySchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;