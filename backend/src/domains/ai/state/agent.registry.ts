import { Agent as MastraAgent } from '@mastra/core';
import { Agent } from '../types';
import { getModel } from '../providers/ai.provider.factory';
import { buildAgentSystemPrompt } from '../generation/prompt.builder';

export type AgentRegistry = Map<string, Agent>;
export type MastraAgentRegistry = Map<string, MastraAgent>;

export function registerAgent(
  agentRegistry: AgentRegistry,
  mastraRegistry: MastraAgentRegistry,
  agent: Agent
): void {
  agentRegistry.set(agent.agentId, agent);

  const model = getModel(agent.aiConfig.provider, agent.aiConfig.modelName);
  const mastraAgent = new MastraAgent({
    name: agent.name,
    instructions: buildAgentSystemPrompt(agent),
    model,
  });

  mastraRegistry.set(agent.agentId, mastraAgent);
}

export function unregisterAgent(
  agentRegistry: AgentRegistry,
  mastraRegistry: MastraAgentRegistry,
  agentId: string
): void {
  agentRegistry.delete(agentId);
  mastraRegistry.delete(agentId);
}

export function getAgent(
  agentRegistry: AgentRegistry,
  agentId: string
): Agent | undefined {
  return agentRegistry.get(agentId);
}

export function getAllAgents(agentRegistry: AgentRegistry): Agent[] {
  return Array.from(agentRegistry.values());
}

export function getMastraAgent(
  mastraRegistry: MastraAgentRegistry,
  agentId: string
): MastraAgent | undefined {
  return mastraRegistry.get(agentId);
}
