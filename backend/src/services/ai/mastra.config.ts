import { Mastra } from '@mastra/core';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createVertex } from '@ai-sdk/google-vertex';
import { createGroq } from '@ai-sdk/groq';
import { config } from '../../config/env';

// Initialize AI model providers
const providers = {
  openai: config.OPENAI_API_KEY
    ? createOpenAI({
        apiKey: config.OPENAI_API_KEY,
      })
    : null,
  
  anthropic: config.ANTHROPIC_API_KEY
    ? createAnthropic({
        apiKey: config.ANTHROPIC_API_KEY,
      })
    : null,
  
  google: config.GOOGLE_API_KEY
    ? createGoogleGenerativeAI({
        apiKey: config.GOOGLE_API_KEY,
      })
    : null,
  
  vertex_ai: (config.VERTEX_PROJECT_ID && config.VERTEX_LOCATION) || 
             (process.env.DEFAULT_CONNECTION_PROJECT_ID && process.env.DEFAULT_CONNECTION_LOCATION)
    ? createVertex({
        project: config.VERTEX_PROJECT_ID || process.env.DEFAULT_CONNECTION_PROJECT_ID,
        location: config.VERTEX_LOCATION || process.env.DEFAULT_CONNECTION_LOCATION,
      })
    : null,
  
  groq: config.GROQ_API_KEY
    ? createGroq({
        apiKey: config.GROQ_API_KEY,
      })
    : null,
  
  // Note: Ollama provider is not available in AI SDK yet
  // Using OpenAI-compatible API for now
  ollama: config.OLLAMA_BASE_URL
    ? createOpenAI({
        apiKey: 'ollama', // Ollama doesn't require real API key
        baseURL: config.OLLAMA_BASE_URL || 'http://localhost:11434/v1',
      })
    : null,
};

// Export model providers for direct use
export const modelProviders = providers;

// Helper to get a model by provider and model name
export function getModel(provider: keyof typeof providers, modelName: string) {
  const providerInstance = providers[provider];
  if (!providerInstance) {
    throw new Error(`Model provider ${provider} is not configured. Please add the required configuration (API key, project ID, etc.).`);
  }
  
  return providerInstance(modelName);
}

// Initialize Mastra with multi-agent configuration
export const mastra = new Mastra({
  // Agent configuration will be dynamically added through agent manager
  agents: {},
  
  // Workflow configuration for multi-agent conversations
  workflows: {},
});

// Supervisor system prompts for multi-agent orchestration
export const SUPERVISOR_PROMPTS = {
  agentSelection: `You are a conversation supervisor for a natural group chat. Your role is to decide who speaks next OR if the conversation should pause.

IMPORTANT GROUP CHAT DYNAMICS:
- After a simple greeting (Hello, Hi, Hey), usually 1-2 people respond with brief greetings, then conversation naturally pauses
- Not everyone needs to greet back - that would be unnatural
- If someone just said hello and 1-2 agents already greeted back, the conversation should pause
- Long introductions after "Hello" are awkward - keep it brief and natural
- Sometimes NO ONE should respond (natural silence is normal)

Consider:
- Has the greeting already been acknowledged? If yes, maybe no one else needs to respond
- Would this person naturally speak up in this moment?
- Is this becoming repetitive or forced?

For simple greetings: Maximum 2 agents should respond, then let it pause naturally.`,

  termination: `You are a conversation supervisor analyzing whether a group chat should naturally pause.

CRITICAL RULES FOR GREETINGS:
- If user said "Hello/Hi/Hey" and 1-2 agents already responded with greetings, TERMINATE
- Simple greetings don't need everyone to respond - that's unnatural
- After brief greeting exchanges, conversations naturally pause until someone brings up a topic

Consider:
- Is this just a greeting exchange? If yes, and 2 agents responded, TERMINATE
- Are agents starting to repeat greetings? TERMINATE
- Is the conversation forced with no real topic? TERMINATE
- Natural pauses are GOOD - don't force conversation

Be aggressive about ending greeting-only conversations. Real group chats pause after "Hello" exchanges.`,
};

// Model configurations for supervisor decisions
export const SUPERVISOR_MODEL = {
  provider: 'vertex_ai' as const,
  model: 'gemini-2.0-flash-exp', // Fast, cost-effective for supervisor tasks
  temperature: 0.3, // Lower temperature for more consistent decisions
  maxTokens: 200, // Supervisor responses should be brief
};

// Export Mastra types for TypeScript support
export type MastraInstance = typeof mastra;
export type ModelProvider = keyof typeof providers;
export type ModelProviders = typeof providers;