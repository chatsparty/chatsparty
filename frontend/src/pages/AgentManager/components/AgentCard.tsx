import React from 'react';
import { Badge } from '@/components/ui/badge';

interface ModelConfig {
  provider: string;
  model_name: string;
  api_key?: string;
  base_url?: string;
}

interface Agent {
  agent_id: string;
  name: string;
  prompt: string;
  characteristics: string;
  model_configuration?: ModelConfig;
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
      <div className="flex flex-wrap gap-2 mb-2">
        <Badge 
          variant="secondary"
          className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-sm font-mono"
        >
          ID: {agent.agent_id}
        </Badge>
        {agent.model_configuration && (
          <Badge 
            variant="outline"
            className="text-xs px-2 py-1 rounded-sm"
          >
            {agent.model_configuration.provider}: {agent.model_configuration.model_name}
          </Badge>
        )}
      </div>
      <p className="text-sm text-gray-600 leading-relaxed overflow-hidden line-clamp-2">
        {agent.characteristics}
      </p>
    </div>
  );
};

export default AgentCard;