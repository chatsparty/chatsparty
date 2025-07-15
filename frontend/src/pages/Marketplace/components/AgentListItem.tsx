import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';

interface MarketplaceAgent {
  id: string;
  name: string;
  description: string;
  characteristics: string;
  category: string;
  tags: string[];
  rating: number;
  ratingCount: number;
  usageCount: number;
  createdAt: string;
  publishedAt: string;
  user: {
    id: string;
    name: string;
  };
  aiConfig: any;
  chatStyle: any;
}

interface AgentListItemProps {
  agent: MarketplaceAgent;
  onClick: () => void;
  onImport: () => void;
  onRate: (rating: number, review?: string) => void;
}

export const AgentListItem: React.FC<AgentListItemProps> = ({
  agent,
  onClick,
  onImport,
  onRate,
}) => {
  const { t } = useTranslation();

  return (
    <Card className="p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1 cursor-pointer" onClick={onClick}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-2">{agent.name}</h3>
              <p className="text-sm text-muted-foreground mb-3">
                {agent.description}
              </p>
              
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <span>⭐</span>
                  <span>{agent.rating.toFixed(1)}</span>
                  <span>({agent.ratingCount})</span>
                </div>
                <div>
                  {agent.usageCount} {t('marketplace.usage')}
                </div>
                <div>
                  {t('marketplace.creator')}: {agent.user.name}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 ml-4">
              {agent.category && (
                <Badge variant="secondary" className="capitalize">
                  {agent.category}
                </Badge>
              )}
              {agent.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="flex space-x-2 ml-6">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          >
            {t('marketplace.viewDetails')}
          </Button>
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onImport();
            }}
          >
            {t('marketplace.import')}
          </Button>
        </div>
      </div>
    </Card>
  );
};