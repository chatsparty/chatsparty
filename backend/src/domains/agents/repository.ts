import { Prisma, PrismaClient, Agent } from '@prisma/client';
import { db } from '../../config/database';
import { AgentQueryOptions, PaginationOptions } from './types';

export class AgentRepository {
  private db: PrismaClient;

  constructor(database?: PrismaClient) {
    this.db = database || db;
  }

  async create(data: Prisma.AgentCreateInput): Promise<Agent> {
    return this.db.agent.create({ data });
  }

  async update(agentId: string, data: Prisma.AgentUpdateInput): Promise<Agent> {
    return this.db.agent.update({
      where: { id: agentId },
      data,
    });
  }

  async delete(agentId: string): Promise<void> {
    await this.db.agent.delete({
      where: { id: agentId },
    });
  }

  async findById(agentId: string): Promise<Agent | null> {
    return this.db.agent.findUnique({
      where: { id: agentId },
    });
  }

  async findUserAgent(userId: string, agentId: string): Promise<Agent | null> {
    return this.db.agent.findFirst({
      where: { id: agentId, userId },
    });
  }

  async findByName(
    userId: string,
    name: string,
    agentId?: string
  ): Promise<Agent | null> {
    const where: Prisma.AgentWhereInput = { userId, name };
    if (agentId) {
      where.NOT = { id: agentId };
    }
    return this.db.agent.findFirst({ where });
  }

  async getCount(userId: string): Promise<number> {
    return this.db.agent.count({
      where: { userId },
    });
  }

  async findMany(
    userId: string,
    options: AgentQueryOptions & PaginationOptions
  ): Promise<[Agent[], number]> {
    const { name, connectionId, page = 1, limit = 20 } = options;

    const where: Prisma.AgentWhereInput = { userId };

    if (name) {
      where.name = { contains: name, mode: 'insensitive' };
    }

    if (connectionId) {
      where.connectionId = connectionId;
    }

    const skip = (page - 1) * limit;

    return this.db.$transaction([
      this.db.agent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.agent.count({ where }),
    ]);
  }
}
