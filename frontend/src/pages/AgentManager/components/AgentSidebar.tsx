import React from 'react';
import { Button } from '@/components/ui/button';
import AgentCard from './AgentCard';

interface Agent {
  agent_id: string;
  name: string;
  prompt: string;
  characteristics: string;
}

interface AgentSidebarProps {
  agents: Agent[];
  onCreateAgent: () => void;
  onEditAgent: (agent: Agent) => void;
}

const AgentSidebar: React.FC<AgentSidebarProps> = ({ 
  agents, 
  onCreateAgent, 
  onEditAgent 
}) => {
  return (
    <div className="w-80 bg-card border-r border-border flex flex-col">
      <div className="p-5 border-b border-border">
        <h2 className="text-lg font-semibold mb-4 text-card-foreground">🤖 Agent Manager</h2>
        <Button
          onClick={onCreateAgent}
          className="w-full"
        >
          + Create New Agent
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="text-sm font-semibold mb-4 text-muted-foreground">
          Your Agents ({agents.length})
        </h3>
        
        {agents.length === 0 ? (
          <div className="text-center text-muted-foreground p-5 text-sm">
            <p>No agents created yet.</p>
            <p>Create your first agent to get started!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {agents.map((agent) => (
              <AgentCard
                key={agent.agent_id}
                agent={agent}
                onEdit={onEditAgent}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentSidebar;