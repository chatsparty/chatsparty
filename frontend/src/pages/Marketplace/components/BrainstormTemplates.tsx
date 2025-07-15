import React from 'react';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';

interface BrainstormTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  duration: string;
  agents: {
    role: string;
    name: string;
    description: string;
    agentId: string;
  }[];
  usageCount: number;
  rating: number;
}

interface BrainstormTemplatesProps {
  templates: BrainstormTemplate[];
  onStartSession: (templateId: string) => void;
}

export const BrainstormTemplates: React.FC<BrainstormTemplatesProps> = ({
  templates,
  onStartSession,
}) => {

  return (
    <div>
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold mb-4">🧠 Brainstorm Sessions</h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Ready-to-use agent teams for structured brainstorming and creative collaboration
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {templates.map((template) => (
          <Card key={template.id} className="p-6 hover:shadow-lg transition-shadow">
            <div className="mb-4">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-xl font-semibold">{template.name}</h3>
                <Badge variant="secondary" className="capitalize">
                  {template.category}
                </Badge>
              </div>
              <p className="text-muted-foreground mb-4">{template.description}</p>
              
              <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-4">
                <span>⏱️ {template.duration}</span>
                <span>👥 {template.agents.length} agents</span>
                <span>⭐ {template.rating.toFixed(1)}</span>
                <span>🚀 {template.usageCount} sessions</span>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="font-medium mb-3">Agent Team:</h4>
              <div className="space-y-2">
                {template.agents.map((agent) => (
                  <div key={agent.agentId} className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-medium">
                        {agent.role.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{agent.role}</div>
                      <div className="text-xs text-muted-foreground">{agent.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button
              onClick={() => onStartSession(template.id)}
              className="w-full"
            >
              Start {template.name}
            </Button>
          </Card>
        ))}
      </div>

      {templates.length === 0 && (
        <Card className="p-12 text-center">
          <div className="text-4xl mb-4">🧠</div>
          <h3 className="text-lg font-semibold mb-2">No Brainstorm Templates Available</h3>
          <p className="text-muted-foreground">Check back later for ready-to-use brainstorm sessions.</p>
        </Card>
      )}
    </div>
  );
};