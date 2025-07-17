import { useState, useCallback, useEffect } from "react";
import axios from "axios";
import { API_BASE_URL } from "../../../config/api";

// Create axios instance with auth
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add auth interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

interface MarketplaceAgent {
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

interface MarketplacePagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface MarketplaceResponse {
  agents: MarketplaceAgent[];
  pagination: MarketplacePagination;
  filters: any;
}

interface ImportAgentRequest {
  agentId: string;
  customizations?: {
    name?: string;
    characteristics?: string;
    aiConfig?: any;
    chatStyle?: any;
  };
}

interface ImportAgentResponse {
  agent: {
    id: string;
    name: string;
    templateId: string;
    isOriginal: boolean;
  };
  success: boolean;
}

interface AgentRatingRequest {
  agentId: string;
  rating: number;
  review?: string;
}

interface AgentRatingResponse {
  rating: {
    id: string;
    rating: number;
    review: string;
    createdAt: string;
  };
  success: boolean;
}

interface FilterOptions {
  category?: string;
  tags?: string[];
  minRating?: number;
  search?: string;
  sortBy?: "popular" | "rating" | "newest" | "name";
  sortOrder?: "asc" | "desc";
}

export const useMarketplace = () => {
  const [agents, setAgents] = useState<MarketplaceAgent[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<MarketplacePagination>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [categories, setCategories] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = useCallback(
    async (filters: FilterOptions, page = 1) => {
      setLoading(true);
      setError(null);

      try {
        const queryParams = new URLSearchParams({
          page: page.toString(),
          limit: pagination.limit.toString(),
          ...(filters.category && { category: filters.category }),
          ...(filters.search && { search: filters.search }),
          ...(filters.minRating && { minRating: filters.minRating.toString() }),
          ...(filters.sortBy && { sortBy: filters.sortBy }),
          ...(filters.sortOrder && { sortOrder: filters.sortOrder }),
        });

        if (filters.tags && filters.tags.length > 0) {
          filters.tags.forEach((tag) => queryParams.append("tags", tag));
        }

        const response = await api.get<MarketplaceResponse>(
          `/marketplace/agents?${queryParams.toString()}`
        );

        setAgents(response.data.agents);
        setPagination(response.data.pagination);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch agents");
      } finally {
        setLoading(false);
      }
    },
    [pagination.limit]
  );

  const fetchAgentById = useCallback(
    async (agentId: string): Promise<MarketplaceAgent | null> => {
      try {
        const response = await api.get<MarketplaceAgent>(
          `/marketplace/agents/${agentId}`
        );
        return response.data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch agent");
        return null;
      }
    },
    []
  );

  const importAgent = useCallback(
    async (
      agentId: string,
      customizations?: any
    ): Promise<ImportAgentResponse | null> => {
      try {
        const request: ImportAgentRequest = {
          agentId,
          customizations,
        };

        const response = await api.post<ImportAgentResponse>(
          "/marketplace/agents/import",
          request
        );
        return response.data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to import agent");
        return null;
      }
    },
    []
  );

  const rateAgent = useCallback(
    async (
      agentId: string,
      rating: number,
      review?: string
    ): Promise<AgentRatingResponse | null> => {
      try {
        const request: AgentRatingRequest = {
          agentId,
          rating,
          review,
        };

        const response = await api.post<AgentRatingResponse>(
          "/marketplace/agents/rate",
          request
        );
        return response.data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to rate agent");
        return null;
      }
    },
    []
  );

  const publishAgent = useCallback(
    async (
      agentId: string,
      category: string,
      tags: string[],
      description: string
    ): Promise<boolean> => {
      try {
        await api.post("/marketplace/agents/publish", {
          agentId,
          category,
          tags,
          description,
        });
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to publish agent"
        );
        return false;
      }
    },
    []
  );

  const fetchCategories = useCallback(async () => {
    try {
      const response = await api.get<string[]>("/marketplace/categories");
      setCategories(response.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch categories"
      );
    }
  }, []);

  // Load initial data
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return {
    agents,
    loading,
    pagination,
    categories,
    error,
    fetchAgents,
    fetchAgentById,
    importAgent,
    rateAgent,
    publishAgent,
    fetchCategories,
  };
};
