import { Connection as PrismaConnection } from '@prisma/client';

// AI Provider types
export type AIProvider = 
  | 'openai' 
  | 'anthropic' 
  | 'google' 
  | 'groq' 
  | 'ollama' 
  | 'vertex_ai';

// Connection types
export interface Connection extends PrismaConnection {}

export interface ConnectionWithModels extends Connection {
  availableModels?: ModelInfo[];
}

export interface PublicConnection {
  id: string;
  name: string;
  description: string | null;
  provider: string;
  modelName: string;
  baseUrl: string | null;
  isActive: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Model information
export interface ModelInfo {
  id: string;
  name: string;
  description?: string;
  contextWindow?: number;
  maxTokens?: number;
  capabilities?: string[];
}

// Request/Response types
export interface CreateConnectionRequest {
  name: string;
  description?: string;
  provider: AIProvider;
  modelName: string;
  apiKey?: string;
  baseUrl?: string;
  isActive?: boolean;
}

export interface UpdateConnectionRequest {
  name?: string;
  description?: string;
  modelName?: string;
  apiKey?: string;
  baseUrl?: string;
  isActive?: boolean;
  isDefault?: boolean;
}

export interface TestConnectionRequest {
  provider: AIProvider;
  apiKey?: string;
  baseUrl?: string;
  modelName?: string;
}

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

// Service response types
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Query options
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

// Provider configurations
export interface ProviderConfig {
  name: string;
  displayName: string;
  requiresApiKey: boolean;
  supportedModels: ModelInfo[];
  defaultModel: string;
  baseUrl?: string;
  customizable: boolean;
}

export const PROVIDER_CONFIGS: Record<AIProvider, ProviderConfig> = {
  openai: {
    name: 'openai',
    displayName: 'OpenAI',
    requiresApiKey: true,
    defaultModel: 'gpt-4-turbo-preview',
    customizable: true,
    supportedModels: [
      { id: 'gpt-4-turbo-preview', name: 'GPT-4 Turbo', contextWindow: 128000, maxTokens: 4096 },
      { id: 'gpt-4', name: 'GPT-4', contextWindow: 8192, maxTokens: 4096 },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', contextWindow: 16385, maxTokens: 4096 },
    ],
  },
  anthropic: {
    name: 'anthropic',
    displayName: 'Anthropic',
    requiresApiKey: true,
    defaultModel: 'claude-3-opus-20240229',
    customizable: true,
    supportedModels: [
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', contextWindow: 200000, maxTokens: 4096 },
      { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', contextWindow: 200000, maxTokens: 4096 },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', contextWindow: 200000, maxTokens: 4096 },
    ],
  },
  google: {
    name: 'google',
    displayName: 'Google AI',
    requiresApiKey: true,
    defaultModel: 'gemini-pro',
    customizable: true,
    supportedModels: [
      { id: 'gemini-pro', name: 'Gemini Pro', contextWindow: 32768, maxTokens: 2048 },
      { id: 'gemini-pro-vision', name: 'Gemini Pro Vision', contextWindow: 16384, maxTokens: 2048 },
    ],
  },
  groq: {
    name: 'groq',
    displayName: 'Groq',
    requiresApiKey: true,
    defaultModel: 'mixtral-8x7b-32768',
    customizable: true,
    supportedModels: [
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', contextWindow: 32768, maxTokens: 32768 },
      { id: 'llama2-70b-4096', name: 'LLaMA2 70B', contextWindow: 4096, maxTokens: 4096 },
    ],
  },
  ollama: {
    name: 'ollama',
    displayName: 'Ollama',
    requiresApiKey: false,
    defaultModel: 'llama2',
    baseUrl: 'http://localhost:11434',
    customizable: true,
    supportedModels: [
      { id: 'llama2', name: 'LLaMA 2', contextWindow: 4096 },
      { id: 'mistral', name: 'Mistral', contextWindow: 8192 },
      { id: 'codellama', name: 'Code LLaMA', contextWindow: 4096 },
    ],
  },
  vertex_ai: {
    name: 'vertex_ai',
    displayName: 'Vertex AI',
    requiresApiKey: true,
    defaultModel: 'gemini-pro',
    customizable: true,
    supportedModels: [
      { id: 'gemini-pro', name: 'Gemini Pro', contextWindow: 32768, maxTokens: 2048 },
      { id: 'text-bison', name: 'PaLM 2 (Text)', contextWindow: 8192, maxTokens: 1024 },
      { id: 'code-bison', name: 'PaLM 2 (Code)', contextWindow: 6144, maxTokens: 1024 },
    ],
  },
};