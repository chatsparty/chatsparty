import { PrismaClient } from '@prisma/client';
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
  BrainstormTemplate,
  UseCaseTemplate 
} from './marketplace.types';
import { HttpError } from '../../utils/http-error';

export class MarketplaceService {
  constructor(private prisma: PrismaClient) {}

  async getMarketplaceAgents(
    filters: MarketplaceFilters,
    pagination: MarketplacePaginationInput
  ): Promise<MarketplaceResponse> {
    const { page, limit } = pagination;
    const offset = (page - 1) * limit;

    // Build where clause
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

    // Build order by clause
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

    const [agents, total] = await Promise.all([
      this.prisma.agent.findMany({
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
      this.prisma.agent.count({ where }),
    ]);

    const marketplaceAgents: MarketplaceAgent[] = agents
      .filter(agent => agent.user) // Filter out agents without user
      .map(agent => ({
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
        user: agent.user,
        aiConfig: agent.aiConfig,
        chatStyle: agent.chatStyle,
      }));

    return {
      agents: marketplaceAgents,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      filters,
    };
  }

  async getAgentById(agentId: string): Promise<MarketplaceAgent> {
    const agent = await this.prisma.agent.findFirst({
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

    if (!agent) {
      throw new HttpError('Agent not found', 404);
    }

    if (!agent.user) {
      throw new HttpError('Agent user not found', 404);
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
      user: agent.user,
      aiConfig: agent.aiConfig,
      chatStyle: agent.chatStyle,
    };
  }

  async importAgent(
    userId: string,
    request: ImportAgentRequest
  ): Promise<ImportAgentResponse> {
    console.log('🔍 Import agent request:', { userId, agentId: request.agentId });
    
    const templateAgent = await this.prisma.agent.findFirst({
      where: {
        id: request.agentId,
        isPublic: true,
        isTemplate: true,
      },
    });

    if (!templateAgent) {
      throw new HttpError('Template agent not found', 404);
    }

    console.log('🔍 Template agent found:', { id: templateAgent.id, name: templateAgent.name });

    // Check if user already has this agent
    const existingImport = await this.prisma.agent.findFirst({
      where: {
        userId,
        templateId: request.agentId,
      },
    });

    console.log('🔍 Existing import check:', { found: !!existingImport, existingId: existingImport?.id });

    if (existingImport) {
      throw new HttpError('Agent already imported', 409);
    }

    // Get user's default connection or system default
    const userConnection = await this.prisma.connection.findFirst({
      where: {
        userId,
        isDefault: true,
        isActive: true,
      },
    });

    // Use default connection ID if no user connection found
    const connectionId = userConnection?.id || 'default';
    
    // Create default AI config if none provided
    const defaultAiConfig = {
      provider: 'openai',
      modelName: 'gpt-3.5-turbo',
      connectionId: connectionId,
    };

    // Create imported agent
    console.log('🔍 Creating imported agent with data:', {
      name: request.customizations?.name || templateAgent.name,
      userId,
      connectionId,
      templateId: request.agentId,
      isPublic: false,
      isTemplate: false,
    });

    const importedAgent = await this.prisma.agent.create({
      data: {
        name: request.customizations?.name || templateAgent.name,
        prompt: templateAgent.prompt,
        characteristics: request.customizations?.characteristics || templateAgent.characteristics,
        connectionId: connectionId,
        aiConfig: request.customizations?.aiConfig || defaultAiConfig,
        chatStyle: request.customizations?.chatStyle || templateAgent.chatStyle,
        voiceConnectionId: templateAgent.voiceConnectionId,
        voiceEnabled: templateAgent.voiceEnabled,
        isPublic: false,
        isTemplate: false,
        category: templateAgent.category,
        tags: templateAgent.tags,
        description: templateAgent.description,
        templateId: request.agentId,
        isOriginal: false,
        userId,
      },
    });

    console.log('🔍 Imported agent created:', { id: importedAgent.id, name: importedAgent.name, userId: importedAgent.userId });

    // Update usage count and create usage record
    await Promise.all([
      this.prisma.agent.update({
        where: { id: request.agentId },
        data: {
          usageCount: {
            increment: 1,
          },
        },
      }),
      this.prisma.agentUsage.create({
        data: {
          agentId: request.agentId,
          userId,
          usageType: 'imported',
          metadata: {
            importedAgentId: importedAgent.id,
            customizations: request.customizations,
          },
        },
      }),
    ]);

    return {
      agent: {
        id: importedAgent.id,
        name: importedAgent.name,
        templateId: request.agentId,
        isOriginal: false,
      },
      success: true,
    };
  }

  async rateAgent(
    userId: string,
    request: AgentRatingRequest
  ): Promise<AgentRatingResponse> {
    const agent = await this.prisma.agent.findFirst({
      where: {
        id: request.agentId,
        isPublic: true,
        isTemplate: true,
      },
    });

    if (!agent) {
      throw new HttpError('Agent not found', 404);
    }

    // Check if user is rating their own agent
    if (agent.userId === userId) {
      throw new HttpError('Cannot rate your own agent', 400);
    }

    // Upsert rating
    const rating = await this.prisma.agentRating.upsert({
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

    // Recalculate agent rating
    const ratings = await this.prisma.agentRating.findMany({
      where: { agentId: request.agentId },
      select: { rating: true },
    });

    const avgRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
    
    await this.prisma.agent.update({
      where: { id: request.agentId },
      data: {
        rating: avgRating,
        ratingCount: ratings.length,
      },
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
  }

  async publishAgent(
    userId: string,
    request: PublishAgentRequest
  ): Promise<void> {
    const agent = await this.prisma.agent.findFirst({
      where: {
        id: request.agentId,
        userId,
      },
    });

    if (!agent) {
      throw new HttpError('Agent not found', 404);
    }

    if (agent.isPublic) {
      throw new HttpError('Agent is already published', 400);
    }

    await this.prisma.agent.update({
      where: { id: request.agentId },
      data: {
        isPublic: true,
        isTemplate: true,
        category: request.category,
        tags: request.tags,
        description: request.description,
        publishedAt: new Date(),
      },
    });
  }

  async getCategories(): Promise<string[]> {
    const categories = await this.prisma.agentCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { name: true },
    });

    return categories.map(c => c.name);
  }

  async getBrainstormTemplates(): Promise<BrainstormTemplate[]> {
    // This would be implemented with predefined templates
    // For now, return hardcoded templates
    return [
      {
        id: 'brainstorm-business-strategy',
        name: 'Business Strategy Session',
        description: 'Expert agents help you develop comprehensive business strategies',
        category: 'business',
        duration: '45-60 minutes',
        agents: [
          {
            role: 'Strategic Facilitator',
            name: 'Strategy Guide',
            description: 'Guides strategic thinking and facilitates discussions',
            agentId: 'template-strategy-facilitator',
          },
          {
            role: 'Market Analyst',
            name: 'Market Expert',
            description: 'Analyzes market conditions and competitive landscape',
            agentId: 'template-market-analyst',
          },
          {
            role: 'Risk Assessor',
            name: 'Risk Advisor',
            description: 'Identifies potential risks and mitigation strategies',
            agentId: 'template-risk-assessor',
          },
          {
            role: 'Innovation Catalyst',
            name: 'Innovation Spark',
            description: 'Generates creative solutions and innovative approaches',
            agentId: 'template-innovation-catalyst',
          },
        ],
        usageCount: 245,
        rating: 4.7,
      },
      {
        id: 'brainstorm-creative-campaign',
        name: 'Creative Campaign Brainstorm',
        description: 'Design compelling campaigns with creative and strategic input',
        category: 'creative',
        duration: '30-45 minutes',
        agents: [
          {
            role: 'Creative Director',
            name: 'Creative Lead',
            description: 'Leads creative vision and artistic direction',
            agentId: 'template-creative-director',
          },
          {
            role: 'Brand Strategist',
            name: 'Brand Expert',
            description: 'Ensures brand alignment and strategic messaging',
            agentId: 'template-brand-strategist',
          },
          {
            role: 'Audience Expert',
            name: 'Audience Insights',
            description: 'Provides deep audience understanding and preferences',
            agentId: 'template-audience-expert',
          },
          {
            role: 'Trend Spotter',
            name: 'Trend Analyst',
            description: 'Identifies current trends and cultural moments',
            agentId: 'template-trend-spotter',
          },
        ],
        usageCount: 189,
        rating: 4.5,
      },
    ];
  }

  async getUseCaseTemplates(): Promise<UseCaseTemplate[]> {
    return [
      {
        id: 'product-planning',
        name: 'Product Feature Planning',
        description: 'Plan and prioritize product features with expert guidance',
        category: 'product',
        agents: ['template-ux-designer', 'template-technical-lead', 'template-customer-advocate', 'template-data-analyst'],
        scenario: 'What features should we add to improve user engagement?',
        expectedOutcome: 'Prioritized feature roadmap with technical feasibility',
        estimatedDuration: '60-90 minutes',
      },
      {
        id: 'problem-solving',
        name: 'Problem Solving Session',
        description: 'Systematic approach to complex problem resolution',
        category: 'analysis',
        agents: ['template-systems-thinker', 'template-detail-detective', 'template-creative-problem-solver', 'template-solution-validator'],
        scenario: 'Our customer retention is declining. What\'s the root cause and solution?',
        expectedOutcome: 'Problem diagnosis and actionable solution plan',
        estimatedDuration: '45-60 minutes',
      },
    ];
  }
}