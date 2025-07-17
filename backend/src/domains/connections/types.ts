import { z } from 'zod';
import { Connection as PrismaConnection } from '@prisma/client';
import { PROVIDER_CONFIGS } from './providers/provider.info';

export const AIProviderSchema = z.enum([
  'openai',
  'anthropic',
  'google',
  'groq',
  'ollama',
  'vertex_ai',
] as const);

export type AIProvider = z.infer<typeof AIProviderSchema>;

export interface Connection extends PrismaConnection {}

export interface ConnectionWithModels extends Connection {
  availableModels?: ModelInfo[];
}

export const PublicConnectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  provider: z.string(),
  modelName: z.string(),
  baseUrl: z.string().url().nullable().optional(),
  isActive: z.boolean(),
  isDefault: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type PublicConnection = z.infer<typeof PublicConnectionSchema>;

export interface ModelInfo {
  id: string;
  name: string;
  description?: string;
  contextWindow?: number;
  maxTokens?: number;
  capabilities?: string[];
}

export interface ProviderConfig {
  name: string;
  displayName: string;
  requiresApiKey: boolean;
  supportedModels: ModelInfo[];
  defaultModel: string;
  baseUrl?: string;
  customizable: boolean;
}

export const CreateConnectionSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Name is required')
      .max(100, 'Name must be less than 100 characters'),
    description: z
      .string()
      .max(500, 'Description must be less than 500 characters')
      .optional(),
    provider: AIProviderSchema,
    modelName: z
      .string()
      .min(1, 'Model name is required')
      .max(100, 'Model name must be less than 100 characters'),
    apiKey: z
      .string()
      .min(1, 'API key is required')
      .max(500, 'API key must be less than 500 characters')
      .optional(),
    baseUrl: z
      .string()
      .url('Invalid URL format')
      .max(500, 'Base URL must be less than 500 characters')
      .optional(),
    isActive: z.boolean().default(true),
  })
  .refine(
    data => {
      const providerConfig = PROVIDER_CONFIGS[data.provider];
      if (providerConfig.requiresApiKey && !data.apiKey) {
        return false;
      }
      return true;
    },
    {
      message: 'API key is required for this provider',
      path: ['apiKey'],
    }
  );

export const UpdateConnectionSchema = z.object({
  name: z
    .string()
    .min(1, 'Name cannot be empty')
    .max(100, 'Name must be less than 100 characters')
    .optional(),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .nullable()
    .optional(),
  modelName: z
    .string()
    .min(1, 'Model name cannot be empty')
    .max(100, 'Model name must be less than 100 characters')
    .optional(),
  apiKey: z
    .string()
    .min(1, 'API key cannot be empty')
    .max(500, 'API key must be less than 500 characters')
    .optional(),
  baseUrl: z
    .string()
    .url('Invalid URL format')
    .max(500, 'Base URL must be less than 500 characters')
    .nullable()
    .optional(),
  isActive: z.boolean().optional(),
});

export const TestConnectionSchema = z
  .object({
    provider: AIProviderSchema,
    apiKey: z
      .string()
      .max(500, 'API key must be less than 500 characters')
      .optional(),
    baseUrl: z
      .string()
      .url('Invalid URL format')
      .max(500, 'Base URL must be less than 500 characters')
      .optional(),
    modelName: z
      .string()
      .max(100, 'Model name must be less than 100 characters')
      .optional(),
  })
  .refine(
    data => {
      const providerConfig = PROVIDER_CONFIGS[data.provider];
      if (providerConfig.requiresApiKey && !data.apiKey) {
        return false;
      }
      return true;
    },
    {
      message: 'API key is required for this provider',
      path: ['apiKey'],
    }
  );

export const ConnectionIdSchema = z.object({
  id: z.string(),
});

export const SetDefaultSchema = z.object({
  connectionId: z.string(),
});

export const ConnectionQuerySchema = z.object({
  includeInactive: z.boolean().default(false),
  provider: AIProviderSchema.optional(),
  onlyDefaults: z.boolean().default(false),
});

export const PaginationSchema = z.object({
  limit: z.number().int().min(1).max(100).default(10),
  offset: z.number().int().min(0).default(0),
  orderBy: z
    .enum(['createdAt', 'updatedAt', 'name', 'provider'])
    .default('createdAt'),
  orderDirection: z.enum(['asc', 'desc']).default('desc'),
});

export const ListConnectionsResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(PublicConnectionSchema),
});

export type CreateConnectionRequest = z.infer<typeof CreateConnectionSchema>;
export type UpdateConnectionRequest = z.infer<typeof UpdateConnectionSchema>;
export type TestConnectionRequest = z.infer<typeof TestConnectionSchema>;
export type ConnectionIdInput = z.infer<typeof ConnectionIdSchema>;
export type SetDefaultInput = z.infer<typeof SetDefaultSchema>;
export type ConnectionQueryInput = z.infer<typeof ConnectionQuerySchema>;
export type PaginationInput = z.infer<typeof PaginationSchema>;

export interface TestConnectionResponse {
  success: boolean;
  message: string;
  availableModels?: ModelInfo[];
  error?: string;
}

export interface ConnectionListResponse {
  connections: PublicConnection[];
  total: number;
  defaultConnectionId?: string;
}

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ConnectionQueryOptions {
  includeInactive?: boolean;
  provider?: AIProvider;
  onlyDefaults?: boolean;
}

export interface PaginationOptions {
  limit?: number;
  offset?: number;
  orderBy?: 'createdAt' | 'updatedAt' | 'name' | 'provider';
  orderDirection?: 'asc' | 'desc';
}
