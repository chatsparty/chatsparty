import {
  MarketplaceFilters,
  MarketplacePaginationInput,
  ImportAgentRequest,
  AgentRatingRequest,
  PublishAgentRequest,
  MarketplaceAgent,
  MarketplaceResponse,
  ImportAgentResponse,
  AgentRatingResponse,
} from '../../domains/marketplace/types';
import * as marketplaceManager from '../../domains/marketplace/orchestration/manager';

export class MarketplaceService {
  async getMarketplaceAgents(
    filters: MarketplaceFilters,
    pagination: MarketplacePaginationInput
  ): Promise<MarketplaceResponse> {
    return marketplaceManager.getMarketplaceAgents(filters, pagination);
  }

  async getAgentById(agentId: string): Promise<MarketplaceAgent> {
    return marketplaceManager.getAgentById(agentId);
  }

  async importAgent(
    userId: string,
    request: ImportAgentRequest
  ): Promise<ImportAgentResponse> {
    return marketplaceManager.importAgent(userId, request);
  }

  async rateAgent(
    userId: string,
    request: AgentRatingRequest
  ): Promise<AgentRatingResponse> {
    return marketplaceManager.rateAgent(userId, request);
  }

  async publishAgent(
    userId: string,
    request: PublishAgentRequest
  ): Promise<void> {
    return marketplaceManager.publishAgent(userId, request);
  }

  async getCategories(): Promise<string[]> {
    return marketplaceManager.getCategories();
  }
}
