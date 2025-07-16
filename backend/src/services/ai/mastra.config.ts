import { Agent, Mastra } from '@mastra/core';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createVertex } from '@ai-sdk/google-vertex';
import { createGroq } from '@ai-sdk/groq';
import fs from 'fs';
import path from 'path';
import { config } from '../../config/env';
import { getDefaultConnectionConfig } from '../../config/default-connection.config';

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

  vertex_ai:
    (config.VERTEX_PROJECT_ID && config.VERTEX_LOCATION) ||
    (process.env.DEFAULT_CONNECTION_PROJECT_ID &&
      process.env.DEFAULT_CONNECTION_LOCATION)
      ? createVertex({
          project:
            config.VERTEX_PROJECT_ID ||
            process.env.DEFAULT_CONNECTION_PROJECT_ID,
          location:
            config.VERTEX_LOCATION || process.env.DEFAULT_CONNECTION_LOCATION,
        })
      : null,

  groq: config.GROQ_API_KEY
    ? createGroq({
        apiKey: config.GROQ_API_KEY,
      })
    : null,

  ollama: config.OLLAMA_BASE_URL
    ? createOpenAI({
        apiKey: 'ollama',
        baseURL: config.OLLAMA_BASE_URL || 'http://localhost:11434/v1',
      })
    : null,
};

export const modelProviders = providers;

export function getModel(provider: keyof typeof providers, modelName: string) {
  const providerInstance = providers[provider];
  if (!providerInstance) {
    throw new Error(
      `Model provider ${provider} is not configured. Please add the required configuration (API key, project ID, etc.).`
    );
  }

  return providerInstance(modelName);
}

interface MastraWithAgents extends Mastra {
  agents: { [key: string]: Agent };
}

const mastraInstance = new Mastra({
  agents: {},
  workflows: {},
});

export const mastra = mastraInstance as MastraWithAgents;

const loadPrompts = () => {
  const filePath = path.join(__dirname, 'supervisor-prompts.md');
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const prompts = fileContent.split('## ').slice(1);

  const promptMap: { [key: string]: string } = {};
  prompts.forEach(p => {
    const [title, ...content] = p.split('\n');
    const key = title.trim().toLowerCase().replace(/\s+/g, '_');
    promptMap[key] = content.join('\n').trim();
  });

  return {
    agentSelection: promptMap.agent_selection,
    termination: promptMap.termination,
  };
};

export const SUPERVISOR_PROMPTS = () => loadPrompts();

const defaultConnection = getDefaultConnectionConfig();

if (defaultConnection) {
  console.info(
    `🤖 Supervisor using default connection model: ${defaultConnection.provider}/${defaultConnection.modelName}`
  );
} else {
  console.info(
    '🤖 Supervisor using fallback model: vertex_ai/gemini-2.0-flash-exp'
  );
}

export const SUPERVISOR_MODEL: {
  provider: ModelProvider;
  model: string;
  temperature: number;
  maxTokens: number;
} = {
  provider: (defaultConnection?.provider || 'vertex_ai') as ModelProvider,
  model: defaultConnection?.modelName || 'gemini-2.5-flash',
  temperature: 0.3,
  maxTokens: 4096,
};

export type MastraInstance = typeof mastra;
export type ModelProvider = keyof typeof providers;
export type ModelProviders = typeof providers;
