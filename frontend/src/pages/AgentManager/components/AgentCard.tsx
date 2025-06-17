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
  onDelete: (agentId: string) => void;
}

const AgentCard: React.FC<AgentCardProps> = ({ agent, onEdit, onDelete }) => {
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(agent.agent_id);
  };

  return (
    <div
      className="p-4 bg-card rounded-md border border-border cursor-pointer hover:bg-accent hover:border-accent-foreground/20 transition-all duration-200 relative"
      onClick={() => onEdit(agent)}
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold text-md text-card-foreground">
          {agent.name}
        </h4>
        <button
          onClick={handleDeleteClick}
          className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded p-1 transition-colors duration-200"
          title="Delete agent"
        >
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
            <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
          </svg>
        </button>
      </div>
      <div className="flex flex-wrap gap-2 mb-2">
        <Badge 
          variant="secondary"
          className="text-xs font-mono max-w-32"
          title={`Full ID: ${agent.agent_id}`}
        >
          <span className="truncate">
            ID: {agent.agent_id.slice(0, 8)}...
          </span>
        </Badge>
        {agent.model_configuration && (
          <Badge 
            variant="outline"
            className="text-xs"
          >
            {agent.model_configuration.provider}: {agent.model_configuration.model_name}
          </Badge>
        )}
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed overflow-hidden line-clamp-2">
        {agent.characteristics}
      </p>
    </div>
  );
};

export default AgentCard;