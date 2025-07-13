import { z } from 'zod';

// Model configuration schema
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

// Chat style configuration
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

// Voice configuration
export const VoiceConfigSchema = z.object({
  voiceEnabled: z.boolean().default(false),
  voiceConnectionId: z.string().optional(),
  selectedVoiceId: z.string().optional(),
  
});

export type VoiceConfig = z.infer<typeof VoiceConfigSchema>;

// Agent schema
export const AgentSchema = z.object({
  agentId: z.string(),
  name: z.string(),
  prompt: z.string(),
  characteristics: z.string(),
  aiConfig: ModelConfigurationSchema,
  chatStyle: ChatStyleSchema,
  connectionId: z.string(),
  voiceConfig: VoiceConfigSchema.optional(),
});

export type Agent = z.infer<typeof AgentSchema>;

// Message types
export const MessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  timestamp: z.number().optional(),
  agentId: z.string().optional(),
  speaker: z.string().optional(),
});

export type Message = z.infer<typeof MessageSchema>;

// Conversation message (for streaming)
export const ConversationMessageSchema = z.object({
  speaker: z.string(),
  message: z.string(),
  timestamp: z.number(),
  agentId: z.string().optional(),
  messageType: z.enum(['message', 'error', 'status']).default('message'),
});

export type ConversationMessage = z.infer<typeof ConversationMessageSchema>;

// Conversation state for multi-agent workflows
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

// Supervisor decision schemas
export const AgentSelectionSchema = z.object({
  agentId: z.string().describe('The ID of the agent that should respond next'),
  reasoning: z
    .string()
    .describe('Brief explanation of why this agent was selected'),
});

export type AgentSelection = z.infer<typeof AgentSelectionSchema>;

export const TerminationDecisionSchema = z.object({
  shouldTerminate: z.boolean().describe('Whether the conversation should end'),
  reason: z.string().describe('Brief explanation of the decision'),
});

export type TerminationDecision = z.infer<typeof TerminationDecisionSchema>;

// Workflow event types
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
  | { type: 'status'; message: string };

// Agent helper methods
export function getAgentSystemPrompt(agent: Agent): string {
  const styleInstructions: string[] = [];

  // Build style instructions based on chat style
  if (agent.chatStyle.friendliness === 'friendly') {
    styleInstructions.push(
      'Be warm, approachable, and friendly in your responses.'
    );
  } else if (agent.chatStyle.friendliness === 'formal') {
    styleInstructions.push('Maintain a professional and formal tone.');
  } else {
    styleInstructions.push(
      'Use a balanced, neither too casual nor too formal tone.'
    );
  }

  if (agent.chatStyle.responseLength === 'short') {
    styleInstructions.push(
      'Keep your responses brief and concise (1-2 sentences when possible).'
    );
  } else if (agent.chatStyle.responseLength === 'long') {
    styleInstructions.push(
      'Provide detailed, comprehensive responses with explanations.'
    );
  } else {
    styleInstructions.push(
      'Keep responses moderate in length - informative but not overly long.'
    );
  }

  if (agent.chatStyle.personality === 'enthusiastic') {
    styleInstructions.push('Show enthusiasm and energy in your responses.');
  } else if (agent.chatStyle.personality === 'reserved') {
    styleInstructions.push('Be thoughtful and measured in your responses.');
  } else {
    styleInstructions.push(
      'Maintain a balanced, engaging but not overwhelming personality.'
    );
  }

  if (agent.chatStyle.humor === 'witty') {
    styleInstructions.push('Feel free to include appropriate humor and wit.');
  } else if (agent.chatStyle.humor === 'light') {
    styleInstructions.push('Occasionally use light humor when appropriate.');
  } else {
    styleInstructions.push('Keep responses serious and focused.');
  }

  if (agent.chatStyle.expertiseLevel === 'beginner') {
    styleInstructions.push(
      'Explain concepts simply, as if speaking to a beginner.'
    );
  } else if (agent.chatStyle.expertiseLevel === 'intermediate') {
    styleInstructions.push(
      'Use moderate technical language appropriate for someone with some experience.'
    );
  } else {
    styleInstructions.push(
      'You can use technical language and assume advanced knowledge.'
    );
  }

  const styleText = styleInstructions.join(' ');

  return `You are ${agent.name}. 

Your role and characteristics: ${agent.characteristics}

Your specific instructions: ${agent.prompt}

Communication style: ${styleText}

CONVERSATION CONTEXT:
- You may see previous messages from other assistants in the conversation history
- Read the conversation carefully to understand what has been discussed
- Build on the conversation naturally without repeating previous points
- Provide your own unique perspective and response
- Only generate YOUR response - do not write responses for others

GROUP CHAT ETIQUETTE:
- For simple greetings (Hello/Hi/Hey), respond BRIEFLY - just "Hey!" or "Hello there!" is enough
- Don't give long introductions after a simple greeting - that's awkward
- If others already greeted, you might just acknowledge with a brief "Hey everyone"
- Match the energy - simple greeting gets simple response

Please respond in character according to your role, characteristics, and communication style.`;
}
