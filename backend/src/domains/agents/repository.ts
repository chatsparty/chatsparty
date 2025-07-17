import { Prisma, Agent } from '@prisma/client';
import { db } from '../../config/database';
import { AgentQueryOptions, PaginationOptions } from './types';

export const create = async (data: Prisma.AgentCreateInput): Promise<Agent> => {
  return db.agent.create({ data });
};

export const update = async (
  agentId: string,
  data: Prisma.AgentUpdateInput
): Promise<Agent> => {
  return db.agent.update({
    where: { id: agentId },
    data,
  });
};

export const deleteById = async (agentId: string): Promise<void> => {
  await db.agent.delete({
    where: { id: agentId },
  });
};

export const findById = async (agentId: string): Promise<Agent | null> => {
  return db.agent.findUnique({
    where: { id: agentId },
  });
};

export const findUserAgent = async (
  userId: string,
  agentId: string
): Promise<Agent | null> => {
  return db.agent.findFirst({
    where: { id: agentId, userId },
  });
};

export const findByName = async (
  userId: string,
  name: string,
  agentId?: string
): Promise<Agent | null> => {
  const where: Prisma.AgentWhereInput = { userId, name };
  if (agentId) {
    where.NOT = { id: agentId };
  }
  return db.agent.findFirst({ where });
};

export const getCount = async (userId: string): Promise<number> => {
  return db.agent.count({
    where: { userId },
  });
};

export const findMany = async (
  userId: string,
  options: AgentQueryOptions & PaginationOptions
): Promise<[Agent[], number]> => {
  const { name, connectionId, page = 1, limit = 20 } = options;

  const where: Prisma.AgentWhereInput = { userId };

  if (name) {
    where.name = { contains: name, mode: 'insensitive' };
  }

  if (connectionId) {
    where.connectionId = connectionId;
  }

  const skip = (page - 1) * limit;

  return db.$transaction([
    db.agent.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    db.agent.count({ where }),
  ]);
};
