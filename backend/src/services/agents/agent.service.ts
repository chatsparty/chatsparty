import { PrismaClient } from '@prisma/client';
import { 
  CreateAgentInput, 
  UpdateAgentInput, 
  AgentResponse, 
  AgentFilters,
  formatAgentResponse,
  AGENT_LIMITS,
  AgentServiceResponse
} from './agent.types';
import {
  validateAgentName,
  validateAgentPrompt,
  validateAgentCharacteristics,
  validateAIConfig,
  validateChatStyle
} from './agent.validation';
import { Agent as MastraAgent } from '../ai/types';
import { agentManager } from '../ai/agent.manager';
import { DefaultConnectionService } from '../connections/default-connection.service';

export class AgentService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new agent
   */
  async createAgent(userId: string, input: CreateAgentInput): Promise<AgentServiceResponse<AgentResponse>> {
    try {
      // Validate input fields
      const nameError = validateAgentName(input.name);
      if (nameError) {
        return { success: false, error: nameError };
      }

      const promptError = validateAgentPrompt(input.prompt);
      if (promptError) {
        return { success: false, error: promptError };
      }

      const characteristicsError = validateAgentCharacteristics(input.characteristics);
      if (characteristicsError) {
        return { success: false, error: characteristicsError };
      }

      const aiConfigError = validateAIConfig(input.aiConfig);
      if (aiConfigError) {
        return { success: false, error: aiConfigError };
      }

      const chatStyleError = validateChatStyle(input.chatStyle);
      if (chatStyleError) {
        return { success: false, error: chatStyleError };
      }

      // Check agent limit
      const agentCount = await this.prisma.agent.count({
        where: { userId },
      });

      if (agentCount >= AGENT_LIMITS.MAX_AGENTS_PER_USER) {
        return { 
          success: false, 
          error: `You have reached the maximum limit of ${AGENT_LIMITS.MAX_AGENTS_PER_USER} agents` 
        };
      }

      // Validate connection exists and belongs to user
      let connection = await this.prisma.connection.findFirst({
        where: {
          id: input.connectionId,
          userId,
          isActive: true,
        },
      });

      // If not found, check if we can use the default connection
      if (!connection) {
        const defaultConnectionService = new DefaultConnectionService();
        const defaultConnResult = await defaultConnectionService.getSystemDefaultConnection();
        
        if (defaultConnResult.success && defaultConnResult.data) {
          const defaultConn = defaultConnResult.data;
          
          // Check if the requested connection ID matches the system default
          if (input.connectionId === defaultConn.id || 
              (input.connectionId === 'default' && defaultConn.isSystemDefault)) {
            // Use the default connection (create a pseudo-connection object)
            connection = {
              id: defaultConn.id,
              userId: userId, // Associate with current user for compatibility
              name: defaultConn.name,
              description: defaultConn.description,
              provider: defaultConn.provider,
              modelName: defaultConn.modelName,
              apiKey: defaultConn.apiKey,
              apiKeyEncrypted: defaultConn.apiKeyEncrypted,
              baseUrl: defaultConn.baseUrl,
              isActive: defaultConn.isActive,
              isDefault: defaultConn.isDefault,
              createdAt: defaultConn.createdAt,
              updatedAt: defaultConn.updatedAt,
            } as any;
            
            // Update the AI config with the default connection's provider and model
            if (!input.aiConfig || !input.aiConfig.provider) {
              input.aiConfig = {
                ...input.aiConfig,
                provider: defaultConn.provider as any,
                modelName: defaultConn.modelName,
              };
            }
          }
        }
      }

      // Final check
      if (!connection) {
        return { success: false, error: 'Invalid or inactive connection' };
      }

      // Create the agent
      const agent = await this.prisma.agent.create({
        data: {
          name: input.name,
          prompt: input.prompt,
          characteristics: input.characteristics,
          connectionId: input.connectionId,
          gender: input.gender || 'NEUTRAL',
          aiConfig: input.aiConfig,
          chatStyle: input.chatStyle,
          userId,
        },
      });

      // Register agent with Mastra AI manager
      const mastraAgent: MastraAgent = {
        agentId: agent.id,
        name: agent.name,
        prompt: agent.prompt,
        characteristics: agent.characteristics,
        aiConfig: agent.aiConfig as any,
        chatStyle: agent.chatStyle as any,
        connectionId: agent.connectionId,
        gender: agent.gender as any,
      };

      await agentManager.registerAgent(mastraAgent);

      return { 
        success: true, 
        data: formatAgentResponse(agent) 
      };
    } catch (error) {
      console.error('Error creating agent:', error);
      return { 
        success: false, 
        error: 'Failed to create agent' 
      };
    }
  }

  /**
   * Get an agent by ID
   */
  async getAgent(userId: string, agentId: string): Promise<AgentServiceResponse<AgentResponse>> {
    try {
      const agent = await this.prisma.agent.findFirst({
        where: {
          id: agentId,
          userId,
        },
      });

      if (!agent) {
        return { success: false, error: 'Agent not found' };
      }

      return { 
        success: true, 
        data: formatAgentResponse(agent) 
      };
    } catch (error) {
      console.error('Error getting agent:', error);
      return { 
        success: false, 
        error: 'Failed to get agent' 
      };
    }
  }

  /**
   * List agents with filters
   */
  async listAgents(
    filters: AgentFilters,
    page: number = 1,
    limit: number = AGENT_LIMITS.DEFAULT_AGENTS_PER_PAGE
  ): Promise<AgentServiceResponse<{ agents: AgentResponse[]; total: number; page: number; limit: number }>> {
    try {
      const skip = (page - 1) * limit;

      const where: any = {
        userId: filters.userId,
      };

      if (filters.name) {
        where.name = {
          contains: filters.name,
          mode: 'insensitive',
        };
      }

      if (filters.connectionId) {
        where.connectionId = filters.connectionId;
      }

      const [agents, total] = await Promise.all([
        this.prisma.agent.findMany({
          where,
          skip,
          take: limit,
          orderBy: {
            createdAt: 'desc',
          },
        }),
        this.prisma.agent.count({ where }),
      ]);

      return {
        success: true,
        data: {
          agents: agents.map(formatAgentResponse),
          total,
          page,
          limit,
        },
      };
    } catch (error) {
      console.error('Error listing agents:', error);
      return { 
        success: false, 
        error: 'Failed to list agents' 
      };
    }
  }

  /**
   * Update an agent
   */
  async updateAgent(
    userId: string, 
    agentId: string, 
    input: UpdateAgentInput
  ): Promise<AgentServiceResponse<AgentResponse>> {
    try {
      // Check agent exists and belongs to user
      const existingAgent = await this.prisma.agent.findFirst({
        where: {
          id: agentId,
          userId,
        },
      });

      if (!existingAgent) {
        return { success: false, error: 'Agent not found' };
      }

      // Validate input fields if provided
      if (input.name) {
        const nameError = validateAgentName(input.name);
        if (nameError) {
          return { success: false, error: nameError };
        }
      }

      if (input.prompt) {
        const promptError = validateAgentPrompt(input.prompt);
        if (promptError) {
          return { success: false, error: promptError };
        }
      }

      if (input.characteristics) {
        const characteristicsError = validateAgentCharacteristics(input.characteristics);
        if (characteristicsError) {
          return { success: false, error: characteristicsError };
        }
      }

      if (input.aiConfig) {
        const aiConfigError = validateAIConfig(input.aiConfig);
        if (aiConfigError) {
          return { success: false, error: aiConfigError };
        }
      }

      if (input.chatStyle) {
        const chatStyleError = validateChatStyle(input.chatStyle);
        if (chatStyleError) {
          return { success: false, error: chatStyleError };
        }
      }

      // Validate connection if changing
      if (input.connectionId) {
        let connection = await this.prisma.connection.findFirst({
          where: {
            id: input.connectionId,
            userId,
            isActive: true,
          },
        });

        // If not found, check if we can use the default connection
        if (!connection) {
          const defaultConnectionService = new DefaultConnectionService();
          const defaultConnResult = await defaultConnectionService.getSystemDefaultConnection();
          
          if (defaultConnResult.success && defaultConnResult.data) {
            const defaultConn = defaultConnResult.data;
            
            // Check if the requested connection ID matches the system default
            if (input.connectionId === defaultConn.id || 
                (input.connectionId === 'default' && defaultConn.isSystemDefault)) {
              // Default connection is valid
              connection = defaultConn as any;
              
              // Update the AI config with the default connection's provider and model if not provided
              if (!input.aiConfig || !input.aiConfig.provider) {
                input.aiConfig = {
                  ...input.aiConfig,
                  provider: defaultConn.provider as any,
                  modelName: defaultConn.modelName,
                };
              }
            }
          }
        }

        if (!connection) {
          return { success: false, error: 'Invalid or inactive connection' };
        }
      }

      // Update the agent
      const updateData: any = {};

      if (input.name !== undefined) updateData.name = input.name;
      if (input.prompt !== undefined) updateData.prompt = input.prompt;
      if (input.characteristics !== undefined) updateData.characteristics = input.characteristics;
      if (input.connectionId !== undefined) updateData.connectionId = input.connectionId;
      if (input.gender !== undefined) updateData.gender = input.gender;
      if (input.aiConfig !== undefined) updateData.aiConfig = input.aiConfig;
      if (input.chatStyle !== undefined) updateData.chatStyle = input.chatStyle;

      const agent = await this.prisma.agent.update({
        where: { id: agentId },
        data: updateData,
      });

      // Update agent in Mastra AI manager
      const mastraAgent: MastraAgent = {
        agentId: agent.id,
        name: agent.name,
        prompt: agent.prompt,
        characteristics: agent.characteristics,
        aiConfig: agent.aiConfig as any,
        chatStyle: agent.chatStyle as any,
        connectionId: agent.connectionId,
        gender: agent.gender as any,
      };

      await agentManager.registerAgent(mastraAgent);

      return { 
        success: true, 
        data: formatAgentResponse(agent) 
      };
    } catch (error) {
      console.error('Error updating agent:', error);
      return { 
        success: false, 
        error: 'Failed to update agent' 
      };
    }
  }

  /**
   * Delete an agent
   */
  async deleteAgent(userId: string, agentId: string): Promise<AgentServiceResponse<void>> {
    try {
      // Check agent exists and belongs to user
      const agent = await this.prisma.agent.findFirst({
        where: {
          id: agentId,
          userId,
        },
      });

      if (!agent) {
        return { success: false, error: 'Agent not found' };
      }

      // Delete the agent (cascade will handle related records)
      await this.prisma.agent.delete({
        where: { id: agentId },
      });

      // TODO: Unregister agent from Mastra AI manager when implemented

      return { success: true };
    } catch (error) {
      console.error('Error deleting agent:', error);
      return { 
        success: false, 
        error: 'Failed to delete agent' 
      };
    }
  }

  /**
   * Get agents by connection
   */
  async getAgentsByConnection(
    userId: string, 
    connectionId: string
  ): Promise<AgentServiceResponse<AgentResponse[]>> {
    try {
      const agents = await this.prisma.agent.findMany({
        where: {
          userId,
          connectionId,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return {
        success: true,
        data: agents.map(formatAgentResponse),
      };
    } catch (error) {
      console.error('Error getting agents by connection:', error);
      return { 
        success: false, 
        error: 'Failed to get agents by connection' 
      };
    }
  }

  /**
   * Duplicate an agent
   */
  async duplicateAgent(
    userId: string, 
    agentId: string, 
    newName?: string
  ): Promise<AgentServiceResponse<AgentResponse>> {
    try {
      // Get the original agent
      const originalAgent = await this.prisma.agent.findFirst({
        where: {
          id: agentId,
          userId,
        },
      });

      if (!originalAgent) {
        return { success: false, error: 'Agent not found' };
      }

      // Check agent limit
      const agentCount = await this.prisma.agent.count({
        where: { userId },
      });

      if (agentCount >= AGENT_LIMITS.MAX_AGENTS_PER_USER) {
        return { 
          success: false, 
          error: `You have reached the maximum limit of ${AGENT_LIMITS.MAX_AGENTS_PER_USER} agents` 
        };
      }

      // Create the duplicate
      const duplicatedAgent = await this.prisma.agent.create({
        data: {
          name: newName || `${originalAgent.name} (Copy)`,
          prompt: originalAgent.prompt,
          characteristics: originalAgent.characteristics,
          connectionId: originalAgent.connectionId,
          gender: originalAgent.gender,
          aiConfig: originalAgent.aiConfig,
          chatStyle: originalAgent.chatStyle,
          voiceEnabled: originalAgent.voiceEnabled,
          voiceConnectionId: originalAgent.voiceConnectionId,
          podcastSettings: originalAgent.podcastSettings,
          userId,
        },
        include: {
          voiceConnection: true,
        },
      });

      // Register the duplicated agent with Mastra AI manager
      const mastraAgent: MastraAgent = {
        agentId: duplicatedAgent.id,
        name: duplicatedAgent.name,
        prompt: duplicatedAgent.prompt,
        characteristics: duplicatedAgent.characteristics,
        aiConfig: duplicatedAgent.aiConfig as any,
        chatStyle: duplicatedAgent.chatStyle as any,
        connectionId: duplicatedAgent.connectionId,
        gender: duplicatedAgent.gender as any,
        voiceConfig: duplicatedAgent.voiceConnectionId ? {
          voiceEnabled: duplicatedAgent.voiceEnabled,
          voiceConnectionId: duplicatedAgent.voiceConnectionId,
          selectedVoiceId: duplicatedAgent.voiceConnection?.voiceId || undefined,
          podcastSettings: duplicatedAgent.podcastSettings as Record<string, any> || undefined,
        } : undefined,
      };

      await agentManager.registerAgent(mastraAgent);

      return { 
        success: true, 
        data: formatAgentResponse(duplicatedAgent) 
      };
    } catch (error) {
      console.error('Error duplicating agent:', error);
      return { 
        success: false, 
        error: 'Failed to duplicate agent' 
      };
    }
  }
}

// Import the database instance
import { db } from '../../config/database';

// Create singleton instance  
export const agentService = new AgentService(db);