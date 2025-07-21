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
      
      const systemPrompt = `You are a conversation analyzer. DO NOT generate conversation dialogue. DO NOT continue the conversation.

Your ONLY task is to analyze the existing conversation and return a JSON object.

Current conversation state:
- Phase: ${memory.conversationPhase}
- Active topic: ${memory.activeTopic || 'Unknown'}
- Silence duration: ${memory.silenceDuration}ms
- Last speakers: ${memory.lastSpeakers.join(', ')}

Analyze the conversation flow and identify:
1. The primary conversational pattern
2. The mood and context
3. Whether someone should naturally speak next
4. Any pending questions or topics

IMPORTANT: Return ONLY a JSON object with NO other text. Do not generate dialogue or continue the conversation.

Return this exact JSON structure:
{
  "pattern": "greeting_exchange" | "qa_in_progress" | "new_topic" | "consensus_forming" | "debate_active" | "conversation_stalled" | "topic_transition" | "casual_discussion" | "problem_solving" | "storytelling",
  "confidence": 0.0-1.0,
  "context": {
    "topicSummary": "string",
    "conversationMood": "friendly" | "formal" | "tense" | "excited" | "neutral",
    "expectedNextSpeaker": "optional string",
    "isQuestionPending": boolean,
    "questioner": "optional string"
  },
  "reasoning": "string"
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
          { maxTokens: 300, temperature: 0.3 }
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
      responseThreshold: number;
    },
    pattern: ConversationPattern,
    memory: ConversationMemory
  ): Effect<ResponseIntent> => {
    return fromPromise(async () => {
      const timeSinceLastSpoke = memory.myLastSpeakTime 
        ? Date.now() - memory.myLastSpeakTime 
        : Infinity;

      const systemPrompt = `You are a decision analyzer for ${agentContext.agentName}. DO NOT generate conversation dialogue.

Your ONLY task is to analyze whether this agent should speak and return a JSON object.

Agent details:
- Name: ${agentContext.agentName}
- Role: ${agentContext.agentRole}
- Response threshold: ${agentContext.responseThreshold} (0=rarely speak, 1=eager to speak)
- Time since last spoke: ${timeSinceLastSpoke}ms

Current conversation pattern: ${pattern.pattern}
Pattern confidence: ${pattern.confidence}
Context: ${JSON.stringify(pattern.context)}

Based on:
1. Your role and expertise
2. The conversation pattern and context  
3. Your response threshold
4. Social conversation norms

Decide if you should speak and with what intent. Consider:
- Is it natural for you to speak now?
- Would your contribution add value?
- Are you the best agent to respond?
- Should you wait for others to speak first?

IMPORTANT: Return ONLY a JSON object with NO other text. Do not generate dialogue.

Return this exact JSON structure:
{
  "shouldSpeak": boolean,
  "priority": "high" | "medium" | "low" | "none",
  "intent": "answer_question" | "ask_clarification" | "share_opinion" | "agree_elaborate" | "disagree_respectfully" | "change_topic" | "summarize_discussion" | "make_joke" | "provide_example" | "stay_silent",
  "reasoning": "string",
  "suggestedDelay": number (100-5000)
}`;

      const recentMessages = memory.recentMessages.slice(-5);
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
          { maxTokens: 200, temperature: 0.3 }
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