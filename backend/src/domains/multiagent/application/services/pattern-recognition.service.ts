import { z } from 'zod';
import { Message, AgentId } from '../../core/types';
import { Effect, fromPromise, runEffect } from '../../core/effects';
import { AIProvider } from '../../infrastructure/providers/provider.interface';

export const ConversationPatternSchema = z.object({
  pattern: z.enum([
    'greeting_exchange',
    'qa_in_progress',
    'new_topic',
    'consensus_forming',
    'debate_active',
    'conversation_stalled',
    'topic_transition',
    'casual_discussion',
    'problem_solving',
    'storytelling'
  ]).describe('The primary conversational pattern detected'),
  
  confidence: z.number().min(0).max(1).describe('Confidence level of the pattern detection'),
  
  context: z.object({
    topicSummary: z.string().describe('Brief summary of current topic'),
    conversationMood: z.enum(['friendly', 'formal', 'tense', 'excited', 'neutral']),
    expectedNextSpeaker: z.string().optional().describe('Who might naturally speak next based on context'),
    isQuestionPending: z.boolean().describe('Whether there is an unanswered question'),
    questioner: z.string().optional().describe('Who asked the pending question'),
  }),
  
  reasoning: z.string().describe('Brief explanation of why this pattern was identified')
});

export type ConversationPattern = z.infer<typeof ConversationPatternSchema>;

export const ResponseIntentSchema = z.object({
  shouldSpeak: z.boolean().describe('Whether this agent should speak in this context'),
  
  priority: z.enum(['high', 'medium', 'low', 'none']).describe('How urgently this agent should speak'),
  
  intent: z.enum([
    'answer_question',
    'ask_clarification',
    'share_opinion',
    'agree_elaborate',
    'disagree_respectfully',
    'change_topic',
    'summarize_discussion',
    'make_joke',
    'provide_example',
    'stay_silent'
  ]).describe('What the agent intends to do if speaking'),
  
  reasoning: z.string().describe('Why the agent should or should not speak'),
  
  suggestedDelay: z.number().describe('Milliseconds to wait before speaking (100-5000)')
});

export type ResponseIntent = z.infer<typeof ResponseIntentSchema>;

export interface ConversationMemory {
  recentMessages: Message[];
  conversationPhase: 'greeting' | 'discussion' | 'questioning' | 'concluding';
  activeTopic: string;
  lastSpeakers: AgentId[];
  silenceDuration: number;
  myLastSpeakTime?: number;
  unansweredQuestions: Array<{
    question: string;
    askedBy: string;
    timestamp: number;
  }>;
}

export const createPatternRecognizer = (provider: AIProvider) => {
  
  const recognizePattern = (memory: ConversationMemory): Effect<ConversationPattern> => {
    return fromPromise(async () => {
      const recentMessages = memory.recentMessages.slice(-7); // Last 7 messages for context
      
      const systemPrompt = `Analyze pattern. Phase: ${memory.conversationPhase}

Return JSON:
{
  "pattern": "greeting_exchange|qa_in_progress|new_topic|consensus_forming|debate_active|conversation_stalled|topic_transition|casual_discussion|problem_solving|storytelling",
  "confidence": 0.0-1.0,
  "context": {
    "topicSummary": "brief",
    "conversationMood": "friendly|formal|tense|excited|neutral",
    "expectedNextSpeaker": "who",
    "isQuestionPending": boolean,
    "questioner": "who asked if pending"
  },
  "reasoning": "brief"
}`;

      const messages: Message[] = [
        { role: 'system', content: systemPrompt, timestamp: Date.now() },
        ...recentMessages.map(m => ({
          role: 'assistant' as const,
          content: `[${m.speaker || m.agentId}]: ${m.content}`,
          timestamp: m.timestamp
        }))
      ];

      const result = await runEffect(
        provider.generateStructuredResponse(
          messages,
          'CRITICAL: Return ONLY a JSON object analyzing the conversation pattern. Do NOT generate dialogue. Do NOT continue the conversation. Output must be valid JSON only.',
          ConversationPatternSchema,
          { temperature: 0.3 }
        )
      );

      if (result.kind === 'error') {
        throw result.error;
      }

      return result.value as ConversationPattern;
    });
  };

  const generateResponseIntent = (
    agentContext: {
      agentId: AgentId;
      agentName: string;
      agentRole: string;
      agentCharacteristics: string;
      chatStyle: string;
    },
    pattern: ConversationPattern,
    memory: ConversationMemory
  ): Effect<ResponseIntent> => {
    return fromPromise(async () => {
      // Calculate time since this agent last spoke
      const timeSinceLastSpoke = memory.myLastSpeakTime 
        ? Date.now() - memory.myLastSpeakTime 
        : Infinity;
      
      const hasAgentResponded = memory.recentMessages.some(m => m.role === 'assistant');
      
      const systemPrompt = `Agent ${agentContext.agentName} must decide whether to speak.
Current pattern: ${pattern.pattern}
Has any agent responded yet: ${hasAgentResponded}
Your style: ${agentContext.chatStyle}
Your role: ${agentContext.agentRole}
Time since you last spoke: ${timeSinceLastSpoke}ms

Important: In conversations, agents should respond naturally. Don't all wait forever.

Return JSON:
{
  "shouldSpeak": boolean,
  "priority": "high|medium|low|none", 
  "intent": "answer_question|share_opinion|stay_silent",
  "reasoning": "brief",
  "suggestedDelay": number
}`;

      const recentMessages = memory.recentMessages.slice(-7);
      const messages: Message[] = [
        { role: 'system', content: systemPrompt, timestamp: Date.now() },
        ...recentMessages.map(m => ({
          role: 'assistant' as const,
          content: `[${m.speaker || m.agentId}]: ${m.content}`,
          timestamp: m.timestamp
        }))
      ];

      const result = await runEffect(
        provider.generateStructuredResponse(
          messages,
          'CRITICAL: Return ONLY a JSON object deciding if the agent should speak. Do NOT generate dialogue. Output must be valid JSON only.',
          ResponseIntentSchema,
          { temperature: 0.3 }
        )
      );

      if (result.kind === 'error') {
        throw result.error;
      }

      return result.value as ResponseIntent;
    });
  };

  return {
    recognizePattern,
    generateResponseIntent
  };
};