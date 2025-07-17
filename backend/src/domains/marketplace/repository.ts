import { Prisma, Agent, AgentRating, AgentCategory } from '@prisma/client';
import { db } from '../../config/database';
import {
  MarketplaceFilters,
  MarketplacePaginationInput,
  AgentWithUser,
} from './types';

export const findManyAgents = async (
  filters: MarketplaceFilters,
  pagination: MarketplacePaginationInput
): Promise<[AgentWithUser[], number]> => {
  const { page, limit } = pagination;
  const offset = (page - 1) * limit;

  const where: any = {
    isPublic: true,
    isTemplate: true,
  };

  if (filters.category) {
    where.category = filters.category;
  }

  if (filters.tags && filters.tags.length > 0) {
    where.tags = {
      hasEvery: filters.tags,
    };
  }

  if (filters.minRating) {
    where.rating = {
      gte: filters.minRating,
    };
  }

  if (filters.search) {
    where.OR = [
      {
        name: {
          contains: filters.search,
          mode: 'insensitive',
        },
      },
      {
        description: {
          contains: filters.search,
          mode: 'insensitive',
        },
      },
      {
        characteristics: {
          contains: filters.search,
          mode: 'insensitive',
        },
      },
    ];
  }

  const orderBy: any = {};
  switch (filters.sortBy) {
    case 'popular':
      orderBy.usageCount = filters.sortOrder;
      break;
    case 'rating':
      orderBy.rating = filters.sortOrder;
      break;
    case 'newest':
      orderBy.publishedAt = filters.sortOrder;
      break;
    case 'name':
      orderBy.name = filters.sortOrder;
      break;
    default:
      orderBy.usageCount = 'desc';
  }

  return Promise.all([
    db.agent.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        ratings: {
          select: {
            rating: true,
            review: true,
            createdAt: true,
            user: {
              select: {
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 5,
        },
      },
      orderBy,
      skip: offset,
      take: limit,
    }),
    db.agent.count({ where }),
  ]);
};

export const findAgentById = async (
  agentId: string
): Promise<AgentWithUser | null> => {
  return db.agent.findFirst({
    where: {
      id: agentId,
      isPublic: true,
      isTemplate: true,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
        },
      },
      ratings: {
        select: {
          rating: true,
          review: true,
          createdAt: true,
          user: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  });
};

export const findTemplateAgentById = async (
  agentId: string
): Promise<Agent | null> => {
  return db.agent.findFirst({
    where: {
      id: agentId,
      isPublic: true,
      isTemplate: true,
    },
  });
};

export const findImportedAgent = async (
  userId: string,
  templateId: string
): Promise<Agent | null> => {
  return db.agent.findFirst({
    where: {
      userId,
      templateId,
    },
  });
};

export const createAgent = async (
  data: Prisma.AgentCreateInput
): Promise<Agent> => {
  return db.agent.create({ data });
};

export const updateAgent = async (
  agentId: string,
  data: Prisma.AgentUpdateInput
): Promise<Agent> => {
  return db.agent.update({
    where: { id: agentId },
    data,
  });
};

export const createAgentUsage = async (data: Prisma.AgentUsageCreateInput) => {
  return db.agentUsage.create({ data });
};

export const upsertAgentRating = async (
  agentId: string,
  userId: string,
  rating: number,
  review?: string
): Promise<AgentRating> => {
  return db.agentRating.upsert({
    where: {
      agentId_userId: {
        agentId,
        userId,
      },
    },
    update: {
      rating,
      review,
    },
    create: {
      agentId,
      userId,
      rating,
      review,
    },
  });
};

export const getAgentRatingStats = async (agentId: string) => {
  const stats = await db.agentRating.aggregate({
    where: { agentId },
    _avg: {
      rating: true,
    },
    _count: {
      rating: true,
    },
  });

  return {
    average: stats._avg.rating,
    count: stats._count.rating,
  };
};

export const findAgentForPublication = async (
  agentId: string,
  userId: string
): Promise<Agent | null> => {
  return db.agent.findFirst({
    where: {
      id: agentId,
      userId,
    },
  });
};

export const findCategories = async (): Promise<AgentCategory[]> => {
  return db.agentCategory.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
};
