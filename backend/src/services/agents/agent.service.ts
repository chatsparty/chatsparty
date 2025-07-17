import { PrismaClient } from '@prisma/client';
import {
  CreateAgentInput,
  UpdateAgentInput,
  AgentResponse,
  AgentFilters,
  formatAgentResponse,
  AGENT_LIMITS,
} from './agent.types';
import * as Fallback from '../../domains/connections/fallback';
import { HttpError } from '../../utils/http-error';
import { db } from '../../config/database';

const prisma = db;

async function validateConnection(userId: string, connectionId: string) {
  const connection = await prisma.connection.findFirst({
    where: { id: connectionId, userId, isActive: true },
  });

  if (connection) {
    return connection;
  }

  if (
    connectionId === 'default' ||
    connectionId.startsWith('system-fallback-')
  ) {
    const fallbackConnResponse = await Fallback.getFallbackConnection();

    if (fallbackConnResponse.success && fallbackConnResponse.data) {
      return { ...fallbackConnResponse.data, userId };
    } else {
      throw new HttpError(
        fallbackConnResponse.error || 'Fallback connection is not available',
        404
      );
    }
  }

  throw new HttpError('Connection not found or is not active', 404);
}

async function createAgent(
  userId: string,
  input: CreateAgentInput
): Promise<AgentResponse> {
  const agentCount = await prisma.agent.count({ where: { userId } });
  if (agentCount >= AGENT_LIMITS.MAX_AGENTS_PER_USER) {
    throw new HttpError(
      `You have reached the maximum limit of ${AGENT_LIMITS.MAX_AGENTS_PER_USER} agents.`,
      403
    );
  }

  if (typeof input.connectionId !== 'string') {
    throw new HttpError('connectionId must be a string', 400);
  }
  const connection = await validateConnection(userId, input.connectionId);

  const agent = await prisma.agent.create({
    data: {
      ...(input as any),
      connectionId: connection.id,
      userId,
    },
  });

  return formatAgentResponse(agent);
}

async function getAgent(
  userId: string,
  agentId: string
): Promise<AgentResponse> {
  const agent = await prisma.agent.findFirst({
    where: { id: agentId, userId },
  });

  if (!agent) {
    throw new HttpError('Agent not found', 404);
  }
  return formatAgentResponse(agent);
}

async function listAgents(
  filters: AgentFilters,
  page: number,
  limit: number
): Promise<{
  agents: AgentResponse[];
  pagination: { total: number; page: number; limit: number };
}> {
  const skip = (page - 1) * limit;
  const where: any = { userId: filters.userId };

  if (filters.name) {
    where.name = { contains: filters.name, mode: 'insensitive' };
  }
  if (filters.connectionId) {
    where.connectionId = filters.connectionId;
  }

  const [agents, total] = await prisma.$transaction([
    prisma.agent.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.agent.count({ where }),
  ]);

  return {
    agents: agents.map(formatAgentResponse),
    pagination: { total, page, limit },
  };
}

async function updateAgent(
  userId: string,
  agentId: string,
  input: UpdateAgentInput
): Promise<AgentResponse> {
  const existingAgent = await prisma.agent.findFirst({
    where: { id: agentId, userId },
  });

  if (!existingAgent) {
    throw new HttpError('Agent not found', 404);
  }

  if (input.connectionId) {
    if (typeof input.connectionId !== 'string') {
      throw new HttpError('connectionId must be a string', 400);
    }
    await validateConnection(userId, input.connectionId);
  }

  const agent = await prisma.agent.update({
    where: { id: agentId },
    data: input as any,
  });

  return formatAgentResponse(agent);
}

async function deleteAgent(userId: string, agentId: string): Promise<void> {
  const agent = await prisma.agent.findFirst({
    where: { id: agentId, userId },
  });

  if (!agent) {
    throw new HttpError('Agent not found', 404);
  }

  await prisma.agent.delete({ where: { id: agentId } });
}

export const agentService = {
  createAgent,
  getAgent,
  listAgents,
  updateAgent,
  deleteAgent,
};
