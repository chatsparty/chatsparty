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
  AgentWithUser,
} from '../types';
import * as repository from '../repository';
import { HttpError } from '../../../utils/http-error';
import { findFirst as findFirstConnection } from '../../connections/repository';
import { DEFAULT_MARKETPLACE_AI_CONFIG } from '../../../config/ai.config';
import { db } from '../../../config/database';

const toMarketplaceAgent = (agent: AgentWithUser): MarketplaceAgent => {
  if (!agent.user) {
    throw new HttpError('Agent user not found', 500);
  }
  return {
    id: agent.id,
    name: agent.name,
    description: agent.description || '',
    characteristics: agent.characteristics,
    category: agent.category || '',
    tags: agent.tags,
    rating: agent.rating,
    ratingCount: agent.ratingCount,
    usageCount: agent.usageCount,
    createdAt: agent.createdAt,
    publishedAt: agent.publishedAt!,
    user: {
      id: agent.user.id,
      name: agent.user.name || '',
    },
    aiConfig: agent.aiConfig,
    chatStyle: agent.chatStyle,
  };
};

export const getMarketplaceAgents = async (
  filters: MarketplaceFilters,
  pagination: MarketplacePaginationInput
): Promise<MarketplaceResponse> => {
  const [agents, total] = await repository.findManyAgents(filters, pagination);

  const marketplaceAgents: MarketplaceAgent[] = agents
    .filter(agent => agent.user)
    .map(toMarketplaceAgent);

  return {
    agents: marketplaceAgents,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      pages: Math.ceil(total / pagination.limit),
    },
    filters,
  };
};

export const getAgentById = async (
  agentId: string
): Promise<MarketplaceAgent> => {
  const agent = await repository.findAgentById(agentId);

  if (!agent) {
    throw new HttpError('Agent not found', 404);
  }

  return toMarketplaceAgent(agent);
};

export const importAgent = async (
  userId: string,
  request: ImportAgentRequest
): Promise<ImportAgentResponse> => {
  const templateAgent = await repository.findTemplateAgentById(request.agentId);

  if (!templateAgent) {
    throw new HttpError('Template agent not found', 404);
  }

  const existingImport = await repository.findImportedAgent(
    userId,
    request.agentId
  );

  if (existingImport) {
    throw new HttpError('Agent already imported', 409);
  }

  const userConnection = await findFirstConnection(
    userId,
    DEFAULT_MARKETPLACE_AI_CONFIG.provider
  );
  const connectionId = userConnection?.id || 'default';

  const defaultAiConfig = {
    ...DEFAULT_MARKETPLACE_AI_CONFIG,
    connectionId,
  };

  const importedAgent = await db.$transaction(async tx => {
    const agent = await tx.agent.create({
      data: {
        name: request.customizations?.name || templateAgent.name,
        prompt: templateAgent.prompt,
        characteristics:
          request.customizations?.characteristics ||
          templateAgent.characteristics,
        connectionId: connectionId,
        aiConfig: (request.customizations?.aiConfig as any) || defaultAiConfig,
        chatStyle:
          (request.customizations?.chatStyle as any) || templateAgent.chatStyle,
        voiceConnection: templateAgent.voiceConnectionId
          ? { connect: { id: templateAgent.voiceConnectionId } }
          : undefined,
        voiceEnabled: templateAgent.voiceEnabled,
        isPublic: false,
        isTemplate: false,
        category: templateAgent.category,
        tags: templateAgent.tags,
        description: templateAgent.description,
        template: { connect: { id: templateAgent.id } },
        isOriginal: false,
        user: { connect: { id: userId } },
      },
    });

    await tx.agent.update({
      where: { id: request.agentId },
      data: {
        usageCount: {
          increment: 1,
        },
      },
    });

    await tx.agentUsage.create({
      data: {
        agent: { connect: { id: request.agentId } },
        user: { connect: { id: userId } },
        usageType: 'imported',
        metadata: {
          importedAgentId: agent.id,
          customizations: request.customizations,
        },
      },
    });

    return agent;
  });

  return {
    agent: {
      id: importedAgent.id,
      name: importedAgent.name,
      templateId: request.agentId,
      isOriginal: false,
    },
    success: true,
  };
};

export const rateAgent = async (
  userId: string,
  request: AgentRatingRequest
): Promise<AgentRatingResponse> => {
  const agent = await repository.findTemplateAgentById(request.agentId);

  if (!agent) {
    throw new HttpError('Agent not found', 404);
  }

  if (agent.userId === userId) {
    throw new HttpError('Cannot rate your own agent', 400);
  }

  const rating = await db.$transaction(async tx => {
    const newRating = await tx.agentRating.upsert({
      where: {
        agentId_userId: {
          agentId: request.agentId,
          userId,
        },
      },
      update: {
        rating: request.rating,
        review: request.review,
      },
      create: {
        agentId: request.agentId,
        userId,
        rating: request.rating,
        review: request.review,
      },
    });

    const stats = await tx.agentRating.aggregate({
      where: { agentId: request.agentId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await tx.agent.update({
      where: { id: request.agentId },
      data: {
        rating: stats._avg.rating || 0,
        ratingCount: stats._count.rating,
      },
    });

    return newRating;
  });

  return {
    rating: {
      id: rating.id,
      rating: rating.rating,
      review: rating.review || '',
      createdAt: rating.createdAt,
    },
    success: true,
  };
};

export const publishAgent = async (
  userId: string,
  request: PublishAgentRequest
): Promise<void> => {
  const agent = await repository.findAgentForPublication(
    request.agentId,
    userId
  );

  if (!agent) {
    throw new HttpError('Agent not found', 404);
  }

  if (agent.isPublic) {
    throw new HttpError('Agent is already published', 400);
  }

  await repository.updateAgent(request.agentId, {
    isPublic: true,
    isTemplate: true,
    category: request.category,
    tags: request.tags,
    description: request.description,
    publishedAt: new Date(),
  });
};

export const getCategories = async (): Promise<string[]> => {
  const categories = await repository.findCategories();
  return categories.map(c => c.name);
};
