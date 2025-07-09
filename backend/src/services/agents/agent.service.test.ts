import { describe, it, expect, beforeEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { AgentService } from './agent.service';
import { CreateAgentInput } from './agent.types';

// Mock Prisma Client
const mockPrisma = {
  agent: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  connection: {
    findFirst: jest.fn(),
  },
  voiceConnection: {
    findFirst: jest.fn(),
  },
} as any as PrismaClient;

describe('AgentService', () => {
  let agentService: AgentService;
  const userId = 'test-user-id';

  beforeEach(() => {
    agentService = new AgentService(mockPrisma);
    jest.clearAllMocks();
  });

  describe('createAgent', () => {
    const validInput: CreateAgentInput = {
      name: 'Test Agent',
      prompt: 'You are a helpful assistant',
      characteristics: 'Friendly and knowledgeable',
      connectionId: 'test-connection-id',
      gender: 'neutral',
      aiConfig: {
        provider: 'openai',
        modelName: 'gpt-4',
        apiKey: 'test-key',
      },
      chatStyle: {
        friendliness: 'friendly',
        responseLength: 'medium',
        personality: 'balanced',
        humor: 'light',
        expertiseLevel: 'expert',
      },
    };

    it('should create an agent successfully', async () => {
      mockPrisma.agent.count.mockResolvedValue(0);
      mockPrisma.connection.findFirst.mockResolvedValue({
        id: 'test-connection-id',
        userId,
        isActive: true,
      });
      mockPrisma.agent.create.mockResolvedValue({
        id: 'new-agent-id',
        ...validInput,
        userId,
        voiceEnabled: false,
        voiceConnectionId: null,
        podcastSettings: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await agentService.createAgent(userId, validInput);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.name).toBe(validInput.name);
    });

    it('should fail if agent limit is reached', async () => {
      mockPrisma.agent.count.mockResolvedValue(50);

      const result = await agentService.createAgent(userId, validInput);

      expect(result.success).toBe(false);
      expect(result.error).toContain('maximum limit');
    });

    it('should fail with invalid agent name', async () => {
      const invalidInput = { ...validInput, name: '' };

      const result = await agentService.createAgent(userId, invalidInput);

      expect(result.success).toBe(false);
      expect(result.error).toContain('name is required');
    });
  });

  describe('getAgent', () => {
    it('should get an agent successfully', async () => {
      const mockAgent = {
        id: 'agent-id',
        name: 'Test Agent',
        prompt: 'Test prompt',
        characteristics: 'Test characteristics',
        connectionId: 'connection-id',
        gender: 'neutral',
        aiConfig: {},
        chatStyle: {},
        voiceEnabled: false,
        voiceConnectionId: null,
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.agent.findFirst.mockResolvedValue(mockAgent);

      const result = await agentService.getAgent(userId, 'agent-id');

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('agent-id');
    });

    it('should fail if agent not found', async () => {
      mockPrisma.agent.findFirst.mockResolvedValue(null);

      const result = await agentService.getAgent(userId, 'nonexistent-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Agent not found');
    });
  });
});