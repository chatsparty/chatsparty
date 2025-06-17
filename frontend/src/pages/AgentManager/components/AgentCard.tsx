import React from 'react';
import { Badge } from '@/components/ui/badge';

interface Agent {
  agent_id: string;
  name: string;
  prompt: string;
  characteristics: string;
}

interface AgentCardProps {
  agent: Agent;
  onEdit: (agent: Agent) => void;
}

const AgentCard: React.FC<AgentCardProps> = ({ agent, onEdit }) => {
  return (
    <div
      className="p-4 bg-gray-50 rounded-md border border-gray-200 cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-all duration-200"
      onClick={() => onEdit(agent)}
    >
      <h4 className="font-semibold text-md text-gray-700 mb-2">
        {agent.name}
      </h4>
      <Badge 
        variant="secondary"
        className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-sm mb-2 font-mono"
      >
        ID: {agent.agent_id}
      </Badge>
      <p className="text-sm text-gray-600 leading-relaxed overflow-hidden line-clamp-2">
        {agent.characteristics}
      </p>
    </div>
  );
};

export default AgentCard;