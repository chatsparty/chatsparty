import { PrismaClient } from '@prisma/client';
import {
  CreateAgentInput,
  UpdateAgentInput,
  AgentResponse,
  AgentFilters,
  formatAgentResponse,
  AGENT_LIMITS,
} from './agent.types';
import { Agent as MastraAgent } from '../ai/types';
import { agentManager } from '../ai/agent.manager';
import { SystemDefaultConnectionService } from '../connections/system-default-connection.service';
import { HttpError } from '../../utils/http-error';
import { db } from '../../config/database';

export class AgentService {
  private defaultConnectionService: SystemDefaultConnectionService;

  constructor(
    private prisma: PrismaClient,
    defaultConnectionService: SystemDefaultConnectionService
  ) {
    this.defaultConnectionService = defaultConnectionService;
  }

  private async validateConnection(userId: string, connectionId: string) {
    console.log(`Validating connection - userId: ${userId}, connectionId: ${connectionId}`);
    
    const connection = await this.prisma.connection.findFirst({
      where: { id: connectionId, userId, isActive: true },
    });

    if (connection) {
      console.log(`Found user connection: ${connection.id}`);
      return connection;
    }

    if (connectionId === 'default' || connectionId.startsWith('system-default-')) {
      console.log(`Attempting to get system default connection`);
      const defaultConnResponse =
        await this.defaultConnectionService.getSystemDefaultConnection();

      console.log(`Default connection response:`, defaultConnResponse);
      
      if (defaultConnResponse.success && defaultConnResponse.data) {
        return { ...defaultConnResponse.data, userId };
      } else {
        throw new HttpError(
          defaultConnResponse.error || 'Default connection is not available',
          404
        );
      }
    }

    throw new HttpError('Connection not found or is not active', 404);
  }

  async createAgent(
    userId: string,
    input: CreateAgentInput
  ): Promise<AgentResponse> {
    const agentCount = await this.prisma.agent.count({ where: { userId } });
    if (agentCount >= AGENT_LIMITS.MAX_AGENTS_PER_USER) {
      throw new HttpError(
        `You have reached the maximum limit of ${AGENT_LIMITS.MAX_AGENTS_PER_USER} agents.`,
        403
      );
    }

    const connection = await this.validateConnection(
      userId,
      input.connectionId
    );

    const agent = await this.prisma.agent.create({
      data: {
        ...input,
        connectionId: connection.id,
        userId,
      },
    });

    const mastraAgent: MastraAgent = {
      agentId: agent.id,
      name: agent.name,
      prompt: agent.prompt,
      characteristics: agent.characteristics,
      aiConfig: agent.aiConfig as any,
      chatStyle: agent.chatStyle as any,
      connectionId: agent.connectionId,
    };

    await agentManager.registerAgent(mastraAgent);
    return formatAgentResponse(agent);
  }

  async getAgent(userId: string, agentId: string): Promise<AgentResponse> {
    const agent = await this.prisma.agent.findFirst({
      where: { id: agentId, userId },
    });

    if (!agent) {
      throw new HttpError('Agent not found', 404);
    }
    return formatAgentResponse(agent);
  }

  async listAgents(
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

    const [agents, total] = await this.prisma.$transaction([
      this.prisma.agent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.agent.count({ where }),
    ]);

    return {
      agents: agents.map(formatAgentResponse),
      pagination: { total, page, limit },
    };
  }

  async updateAgent(
    userId: string,
    agentId: string,
    input: UpdateAgentInput
  ): Promise<AgentResponse> {
    const existingAgent = await this.prisma.agent.findFirst({
      where: { id: agentId, userId },
    });

    if (!existingAgent) {
      throw new HttpError('Agent not found', 404);
    }

    if (input.connectionId) {
      await this.validateConnection(userId, input.connectionId);
    }

    const agent = await this.prisma.agent.update({
      where: { id: agentId },
      data: input,
    });

    const mastraAgent: MastraAgent = {
      agentId: agent.id,
      name: agent.name,
      prompt: agent.prompt,
      characteristics: agent.characteristics,
      aiConfig: agent.aiConfig as any,
      chatStyle: agent.chatStyle as any,
      connectionId: agent.connectionId,
    };

    await agentManager.registerAgent(mastraAgent);
    return formatAgentResponse(agent);
  }

  async deleteAgent(userId: string, agentId: string): Promise<void> {
    const agent = await this.prisma.agent.findFirst({
      where: { id: agentId, userId },
    });

    if (!agent) {
      throw new HttpError('Agent not found', 404);
    }

    await this.prisma.agent.delete({ where: { id: agentId } });
    await agentManager.unregisterAgent(agentId);
  }
}

const defaultConnectionService = new SystemDefaultConnectionService();
export const agentService = new AgentService(db, defaultConnectionService);
