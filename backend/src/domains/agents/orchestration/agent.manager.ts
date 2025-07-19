import {
  Agent,
  CreateAgentRequest,
  UpdateAgentRequest,
  ServiceResponse,
  AgentQueryOptions,
  PaginationOptions,
  AgentListResponse,
  PublicAgent,
} from '../types';
import * as agentRepository from '../repository';
import { findUserConnection } from '../../connections/repository';
import * as Fallback from '../../connections/decision/fallback';
import {
  AgentNotFoundError,
  DuplicateAgentError,
  AgentValidationError,
  ConnectionNotFoundError,
} from '../../../utils/errors';
import { Agent as AIAgent } from '../../multiagent/core/types';
import { db } from '../../../config/database';

const AGENT_LIMITS = {
  MAX_AGENTS_PER_USER: 50,
};

async function _validateConnection(userId: string, connectionId: string) {
  const connection = await findUserConnection(userId, connectionId);

  if (connection && connection.isActive) {
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
      throw new ConnectionNotFoundError(
        fallbackConnResponse.error || 'Fallback connection is not available'
      );
    }
  }

  throw new ConnectionNotFoundError('Connection not found or is not active');
}

function _toPublicAgent(agent: Agent): PublicAgent {
  return {
    id: agent.id,
    name: agent.name,
    prompt: agent.prompt,
    characteristics: agent.characteristics,
    connectionId: agent.connectionId,
    chatStyle: agent.chatStyle as any,
    createdAt: agent.createdAt.toISOString(),
    updatedAt: agent.updatedAt.toISOString(),
  };
}

export async function createAgent(
  userId: string,
  request: CreateAgentRequest
): Promise<ServiceResponse<PublicAgent>> {
  try {
    const agentCount = await agentRepository.getCount(userId);
    if (agentCount >= AGENT_LIMITS.MAX_AGENTS_PER_USER) {
      throw new AgentValidationError(
        `You have reached the maximum limit of ${AGENT_LIMITS.MAX_AGENTS_PER_USER} agents.`
      );
    }

    const existingAgent = await agentRepository.findByName(
      userId,
      request.name
    );
    if (existingAgent) {
      throw new DuplicateAgentError();
    }

    const connection = await _validateConnection(userId, request.connectionId);

    const agent = await agentRepository.create({
      ...request,
      connection: {
        connect: {
          id: connection.id,
        },
      },
      user: {
        connect: {
          id: userId,
        },
      },
    });

    return { success: true, data: _toPublicAgent(agent) };
  } catch (error: unknown) {
    console.error('Error creating agent:', error);
    if (
      error instanceof AgentValidationError ||
      error instanceof DuplicateAgentError ||
      error instanceof ConnectionNotFoundError
    ) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to create agent' };
  }
}

export async function getAgentById(
  userId: string,
  agentId: string
): Promise<ServiceResponse<PublicAgent>> {
  try {
    const agent = await agentRepository.findUserAgent(userId, agentId);
    if (!agent) {
      throw new AgentNotFoundError();
    }
    return { success: true, data: _toPublicAgent(agent) };
  } catch (error: unknown) {
    console.error('Error getting agent:', error);
    if (error instanceof AgentNotFoundError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to get agent' };
  }
}

export async function listAgents(
  userId: string,
  options: AgentQueryOptions & PaginationOptions
): Promise<ServiceResponse<AgentListResponse>> {
  try {
    const [agents, total] = await agentRepository.findMany(userId, options);

    const publicAgents = agents.map(_toPublicAgent);

    return {
      success: true,
      data: {
        agents: publicAgents,
        pagination: {
          total,
          page: options.page || 1,
          limit: options.limit || 20,
        },
      },
    };
  } catch (error) {
    console.error('Error listing agents:', error);
    return { success: false, error: 'Failed to list agents' };
  }
}

export async function updateAgent(
  userId: string,
  agentId: string,
  request: UpdateAgentRequest
): Promise<ServiceResponse<PublicAgent>> {
  try {
    const existingAgent = await agentRepository.findUserAgent(userId, agentId);
    if (!existingAgent) {
      throw new AgentNotFoundError();
    }

    if (request.name) {
      const duplicateAgent = await agentRepository.findByName(
        userId,
        request.name,
        agentId
      );
      if (duplicateAgent) {
        throw new DuplicateAgentError();
      }
    }

    if (request.connectionId) {
      await _validateConnection(userId, request.connectionId);
    }

    const agent = await agentRepository.update(agentId, request);

    return { success: true, data: _toPublicAgent(agent) };
  } catch (error: unknown) {
    console.error('Error updating agent:', error);
    if (
      error instanceof AgentNotFoundError ||
      error instanceof DuplicateAgentError ||
      error instanceof ConnectionNotFoundError
    ) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to update agent' };
  }
}

export async function deleteAgent(
  userId: string,
  agentId: string
): Promise<ServiceResponse<void>> {
  try {
    const existingAgent = await agentRepository.findUserAgent(userId, agentId);
    if (!existingAgent) {
      throw new AgentNotFoundError();
    }
    await agentRepository.deleteById(agentId);
    return { success: true };
  } catch (error: unknown) {
    console.error('Error deleting agent:', error);
    if (error instanceof AgentNotFoundError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to delete agent' };
  }
}

export async function getAgentWithFullConfig(
  userId: string,
  agentId: string
): Promise<ServiceResponse<AIAgent>> {
  try {
    const agent = await agentRepository.findUserAgent(userId, agentId);
    if (!agent) {
      throw new AgentNotFoundError();
    }

    let connection = await findUserConnection(userId, agent.connectionId);

    let apiKey: string | undefined;
    let baseUrl: string | undefined;

    if (connection) {
      apiKey = connection.apiKey || undefined;
      baseUrl = connection.baseUrl || undefined;
    } else if (
      agent.connectionId === 'default' ||
      agent.connectionId.startsWith('system-fallback-')
    ) {
      const fallbackResponse = await Fallback.getFallbackConnection();
      if (fallbackResponse.success && fallbackResponse.data) {
        apiKey = fallbackResponse.data.apiKey || undefined;
        baseUrl = fallbackResponse.data.baseUrl || undefined;
      } else if (agent.connectionId.startsWith('system-fallback-')) {
        const provider = Fallback.getProviderFromConnectionId(
          agent.connectionId
        );
        if (provider === 'vertex_ai') {
          console.log(
            '[Agent Manager] Using default Google Cloud credentials for Vertex AI'
          );
        }
      }
    }

    if (!connection && !apiKey) {
      const platformDefault = await db.connection.findFirst({
        where: {
          isDefault: true,
          isActive: true,
        },
      });
      if (platformDefault) {
        connection = platformDefault;
        apiKey = platformDefault.apiKey || undefined;
        baseUrl = platformDefault.baseUrl || undefined;
      }
    }

    const connectionConfig = connection?.config as {
      modelName?: string;
    } | null;
    const aiConfig = {
      provider: (connection?.provider || 'vertex_ai') as
        | 'openai'
        | 'anthropic'
        | 'google'
        | 'vertex_ai'
        | 'groq'
        | 'ollama',
      modelName: connectionConfig?.modelName || 'gemini-2.5-flash',
      apiKey,
      baseUrl,
      connectionId: agent.connectionId,
    };

    const aiAgent: AIAgent = {
      agentId: agent.id as any,
      name: agent.name,
      prompt: agent.prompt,
      characteristics: agent.characteristics,
      aiConfig,
      chatStyle: agent.chatStyle as any,
      connectionId: agent.connectionId,
    };

    return { success: true, data: aiAgent };
  } catch (error: unknown) {
    console.error('Error getting agent with full config:', error);
    if (error instanceof AgentNotFoundError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to get agent configuration' };
  }
}
