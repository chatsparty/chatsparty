import { z } from 'zod';

export const MarketplaceFiltersSchema = z.object({
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  minRating: z.number().min(0).max(5).optional(),
  search: z.string().optional(),
  sortBy: z.enum(['popular', 'rating', 'newest', 'name']).default('popular'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const MarketplacePaginationInputSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export const ImportAgentSchema = z.object({
  agentId: z.string().min(1),
  customizations: z.object({
    name: z.string().min(1).max(100).optional(),
    characteristics: z.string().min(1).max(2000).optional(),
    aiConfig: z.any().optional(),
    chatStyle: z.any().optional(),
  }).optional(),
});

export const AgentRatingSchema = z.object({
  agentId: z.string().min(1),
  rating: z.number().min(1).max(5),
  review: z.string().max(1000).optional(),
});

export const PublishAgentSchema = z.object({
  agentId: z.string().min(1),
  category: z.string().min(1).max(50),
  tags: z.array(z.string().min(1).max(30)).max(10),
  description: z.string().min(1).max(500),
});

export const BrainstormTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  category: z.string().min(1).max(50),
  duration: z.string().min(1).max(50),
  agents: z.array(z.object({
    role: z.string().min(1).max(50),
    name: z.string().min(1).max(100),
    description: z.string().min(1).max(200),
    agentId: z.string().min(1),
  })).min(2).max(10),
});

export type BrainstormTemplateRequest = z.infer<typeof BrainstormTemplateSchema>;