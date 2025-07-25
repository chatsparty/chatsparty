export interface MarketplaceAgent {
  id: string;
  name: string;
  description: string;
  characteristics: string;
  category: string;
  tags: string[];
  rating: number;
  ratingCount: number;
  usageCount: number;
  createdAt: Date;
  publishedAt: Date;
  user: {
    id: string;
    name: string;
  };
  aiConfig: any;
  chatStyle: any;
}

export interface MarketplaceFilters {
  category?: string;
  tags?: string[];
  minRating?: number;
  search?: string;
  sortBy?: 'popular' | 'rating' | 'newest' | 'name';
  sortOrder?: 'asc' | 'desc';
}

export interface MarketplacePaginationInput {
  page: number;
  limit: number;
}

export interface MarketplacePagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface MarketplaceResponse {
  agents: MarketplaceAgent[];
  pagination: MarketplacePagination;
  filters: MarketplaceFilters;
}

export interface ImportAgentRequest {
  agentId: string;
  customizations?: {
    name?: string;
    characteristics?: string;
    aiConfig?: any;
    chatStyle?: any;
  };
}

export interface ImportAgentResponse {
  agent: {
    id: string;
    name: string;
    templateId: string;
    isOriginal: boolean;
  };
  success: boolean;
}

export interface AgentRatingRequest {
  agentId: string;
  rating: number;
  review?: string;
}

export interface AgentRatingResponse {
  rating: {
    id: string;
    rating: number;
    review: string;
    createdAt: Date;
  };
  success: boolean;
}

export interface PublishAgentRequest {
  agentId: string;
  category: string;
  tags: string[];
  description: string;
}

export interface BrainstormTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  duration: string;
  agents: {
    role: string;
    name: string;
    description: string;
    agentId: string;
  }[];
  usageCount: number;
  rating: number;
}

export interface UseCaseTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  agents: string[];
  scenario: string;
  expectedOutcome: string;
  estimatedDuration: string;
}