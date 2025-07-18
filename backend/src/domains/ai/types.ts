import { z } from 'zod';

export const ModelConfigurationSchema = z.object({
  provider: z.enum([
    'openai',
    'anthropic',
    'google',
    'vertex_ai',
    'groq',
    'ollama',
  ]),
  modelName: z.string(),
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
  connectionId: z.string().optional(),
});

export type ModelConfiguration = z.infer<typeof ModelConfigurationSchema>;

export const ChatStyleSchema = z.object({
  friendliness: z.enum(['friendly', 'formal', 'balanced']).default('friendly'),
  responseLength: z.enum(['short', 'medium', 'long']).default('medium'),
  personality: z
    .enum(['enthusiastic', 'reserved', 'balanced'])
    .default('balanced'),
  humor: z.enum(['witty', 'light', 'none']).default('light'),
  expertiseLevel: z
    .enum(['beginner', 'intermediate', 'expert'])
    .default('expert'),
});

export type ChatStyle = z.infer<typeof ChatStyleSchema>;

export const AgentSchema = z.object({
  agentId: z.string(),
  name: z.string(),
  prompt: z.string(),
  characteristics: z.string(),
  aiConfig: ModelConfigurationSchema,
  chatStyle: ChatStyleSchema,
  connectionId: z.string(),
  maxTokens: z.number().optional(),
});

export type Agent = z.infer<typeof AgentSchema>;

export const MessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  timestamp: z.number().optional(),
  agentId: z.string().optional(),
  speaker: z.string().optional(),
});

export type Message = z.infer<typeof MessageSchema>;

export const ConversationMessageSchema = z.object({
  speaker: z.string(),
  message: z.string(),
  timestamp: z.number(),
  agentId: z.string().optional(),
  messageType: z.enum(['message', 'error', 'status']).default('message'),
});

export type ConversationMessage = z.infer<typeof ConversationMessageSchema>;

export const ConversationStateSchema = z.object({
  messages: z.array(MessageSchema),
  agents: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      characteristics: z.string(),
    })
  ),
  currentSpeaker: z.string().optional().nullable(),
  turnCount: z.number().default(0),
  maxTurns: z.number().default(10),
  conversationComplete: z.boolean().default(false),
  userId: z.string().optional().nullable(),
  conversationId: z.string(),
});

export type ConversationState = z.infer<typeof ConversationStateSchema>;

export const AgentSelectionSchema = z.object({
  agentId: z.string().describe('The ID of the agent that should respond next'),
  reasoning: z
    .string()
    .describe('Brief explanation of why this agent was selected')
    .optional(),
  turns: z
    .number()
    .describe('Number of turns the selected agent should take. Default is 1.')
    .optional(),
});

export type AgentSelection = z.infer<typeof AgentSelectionSchema>;

export const TerminationDecisionSchema = z.object({
  shouldTerminate: z.boolean().describe('Whether the conversation should end'),
  reason: z.string().describe('Brief explanation of the decision').optional(),
});

export type TerminationDecision = z.infer<typeof TerminationDecisionSchema>;

export type WorkflowEvent =
  | {
      type: 'agent_response';
      agentId: string;
      agentName: string;
      message: string;
      timestamp: number;
    }
  | { type: 'conversation_complete'; message: string }
  | { type: 'error'; message: string }
  | { type: 'status'; message: string; agentId?: string; agentName?: string };

export interface StreamEvent {
  type: 'thinking' | 'message' | 'error' | 'complete';
  agentId: string;
  agentName: string;
  content?: string;
  message?: string;
  timestamp?: number;
}

export interface MultiAgentConversationOptions {
  conversationId: string;
  agentIds: string[];
  initialMessage: string;
  maxTurns: number;
  userId: string;
  fileAttachments?: any;
  projectId?: string;
  existingMessages?: Message[];
}

export interface ContinueConversationOptions {
  conversationId: string;
  message: string;
  agentIds: string[];
  userId: string;
  maxTurns?: number;
}