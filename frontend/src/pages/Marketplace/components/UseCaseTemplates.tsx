import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';

interface UseCaseTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  agents: string[];
  scenario: string;
  expectedOutcome: string;
  estimatedDuration: string;
}

interface UseCaseTemplatesProps {
  templates: UseCaseTemplate[];
  onStartUseCase: (templateId: string) => void;
}

export const UseCaseTemplates: React.FC<UseCaseTemplatesProps> = ({
  templates,
  onStartUseCase,
}) => {
  const { t } = useTranslation();

  return (
    <div>
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold mb-4">🎯 Use Case Templates</h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Structured workflows for common business and creative challenges
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <Card key={template.id} className="p-6 hover:shadow-lg transition-shadow">
            <div className="mb-4">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold">{template.name}</h3>
                <Badge variant="secondary" className="capitalize">
                  {template.category}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-4">{template.description}</p>
            </div>

            <div className="space-y-3 mb-6">
              <div>
                <h4 className="font-medium text-sm mb-2">Scenario:</h4>
                <p className="text-sm text-muted-foreground italic">"{template.scenario}"</p>
              </div>
              
              <div>
                <h4 className="font-medium text-sm mb-2">Expected Outcome:</h4>
                <p className="text-sm text-muted-foreground">{template.expectedOutcome}</p>
              </div>
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>⏱️ {template.estimatedDuration}</span>
                <span>👥 {template.agents.length} agents</span>
              </div>
            </div>

            <Button
              onClick={() => onStartUseCase(template.id)}
              variant="outline"
              className="w-full"
            >
              Start Use Case
            </Button>
          </Card>
        ))}
      </div>

      {templates.length === 0 && (
        <Card className="p-12 text-center">
          <div className="text-4xl mb-4">🎯</div>
          <h3 className="text-lg font-semibold mb-2">No Use Case Templates Available</h3>
          <p className="text-muted-foreground">Check back later for structured workflow templates.</p>
        </Card>
      )}
    </div>
  );
};