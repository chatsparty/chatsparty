// This file is kept for potential future use
// All types are now inlined in their respective components to avoid Vite HMR issues

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
  createdAt: string;
  publishedAt: string;
  user: {
    id: string;
    name: string;
  };
  aiConfig: any;
  chatStyle: any;
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
  filters: any;
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
    createdAt: string;
  };
  success: boolean;
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

export interface AgentRating {
  id: string;
  rating: number;
  review: string;
  createdAt: string;
  user: {
    name: string;
  };
}