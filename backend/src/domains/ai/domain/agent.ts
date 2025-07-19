import { Agent, AgentId, Message, ChatStyle } from '../core/types';
import { CONTROLLER_AGENT_ID, CONTROLLER_AGENT_NAME } from './constants';

export type SelectionCriteria = {
  conversationHistory: Message[];
  availableAgents: Agent[];
  lastSpeaker?: AgentId;
};

export type AgentCapability =
  | 'conversation'
  | 'technical'
  | 'creative'
  | 'analytical'
  | 'educational';

export interface AgentWithCapabilities extends Agent {
  capabilities: AgentCapability[];
  priority: number;
}

export type SelectionStrategy = (criteria: SelectionCriteria) => AgentId;

export const roundRobinStrategy: SelectionStrategy = criteria => {
  const { availableAgents, lastSpeaker } = criteria;

  if (availableAgents.length === 0) {
    throw new Error('No agents available');
  }

  if (!lastSpeaker) {
    return availableAgents[0].agentId;
  }

  const lastIndex = availableAgents.findIndex(a => a.agentId === lastSpeaker);
  const nextIndex = (lastIndex + 1) % availableAgents.length;

  return availableAgents[nextIndex].agentId;
};

export const randomStrategy: SelectionStrategy = criteria => {
  const { availableAgents, lastSpeaker } = criteria;

  const filtered = lastSpeaker
    ? availableAgents.filter(a => a.agentId !== lastSpeaker)
    : availableAgents;

  if (filtered.length === 0) {
    return availableAgents[0].agentId;
  }

  const randomIndex = Math.floor(Math.random() * filtered.length);
  return filtered[randomIndex].agentId;
};



export type PromptTemplate = {
  base: string;
  variables: Record<string, string>;
  style: ChatStyle;
};

export const createPromptTemplate = (
  base: string,
  variables: Record<string, string> = {},
  style: ChatStyle
): PromptTemplate => ({
  base,
  variables,
  style,
});

export const interpolateTemplate = (template: PromptTemplate): string => {
  let result = template.base;

  Object.entries(template.variables).forEach(([key, value]) => {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  });

  const styleInstructions = formatChatStyle(template.style);
  result += `\n\n${styleInstructions}`;

  return result;
};

const formatChatStyle = (style: ChatStyle): string => {
  const instructions: string[] = [];

  if (style.friendliness === 'friendly') {
    instructions.push('Be warm and approachable in your responses.');
  } else if (style.friendliness === 'formal') {
    instructions.push('Maintain a professional and formal tone.');
  }

  if (style.responseLength === 'short') {
    instructions.push('Keep responses brief and concise.');
  } else if (style.responseLength === 'long') {
    instructions.push('Provide detailed and comprehensive responses.');
  }

  if (style.humor === 'witty') {
    instructions.push('Feel free to include appropriate humor.');
  } else if (style.humor === 'none') {
    instructions.push('Keep responses serious and focused.');
  }

  return instructions.join(' ');
};

export type AgentRegistry = Map<AgentId, Agent>;

export const createAgentRegistry = (agents: Agent[]): AgentRegistry => {
  const registry = new Map<AgentId, Agent>();
  agents.forEach(agent => registry.set(agent.agentId, agent));
  return registry;
};

export const getAgentFromRegistry = (
  registry: AgentRegistry,
  agentId: AgentId
): Agent | undefined => {
  return registry.get(agentId);
};

export const selectControllerAgent = (agents: Agent[]): Agent => {
  const existingController = agents.find(a => a.agentId === CONTROLLER_AGENT_ID);
  if (existingController) {
    return existingController;
  }

  const tierPriority: Record<string, number> = {
    openai: 1,
    anthropic: 2,
    google: 3,
    vertex_ai: 4,
    groq: 5,
    ollama: 6,
  };

  const sortedAgents = [...agents].sort((a, b) => {
    const aTier = tierPriority[a.aiConfig.provider] ?? 999;
    const bTier = tierPriority[b.aiConfig.provider] ?? 999;
    return aTier - bTier;
  });

  const baseAgent = sortedAgents[0];

  return {
    ...baseAgent,
    agentId: CONTROLLER_AGENT_ID,
    name: CONTROLLER_AGENT_NAME,
    prompt:
      'You are a conversation controller responsible for managing the flow of conversation.',
    characteristics: 'Analytical, impartial, and focused on conversation flow.',
  };
};
