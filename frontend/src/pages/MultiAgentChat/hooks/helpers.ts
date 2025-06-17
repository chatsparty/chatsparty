import type { Agent } from '../types';
import { AGENT_COLORS } from './constants';

export const createAgentHelpers = (agents: Agent[]) => {
  const getAgentName = (agentId: string): string => {
    return agents.find(a => a.agent_id === agentId)?.name || agentId;
  };

  const getAgentColor = (agentId: string): string => {
    const index = agents.findIndex(a => a.agent_id === agentId);
    return AGENT_COLORS[index % AGENT_COLORS.length] || '#6c757d';
  };

  return { getAgentName, getAgentColor };
};