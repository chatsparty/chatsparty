import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Card } from '../../../components/ui/card';

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

interface AgentModalProps {
  agent: MarketplaceAgent;
  isOpen: boolean;
  onClose: () => void;
  onImport: (agentId: string, customizations?: any) => Promise<void>;
  onRate: (agentId: string, rating: number, review?: string) => Promise<void>;
}

export const AgentModal: React.FC<AgentModalProps> = ({
  agent,
  isOpen,
  onClose,
  onImport,
  onRate,
}) => {
  const { t } = useTranslation();
  const [importing, setImporting] = useState(false);

  const handleImport = async () => {
    setImporting(true);
    try {
      await onImport(agent.id);
      onClose();
    } catch (error) {
      console.error('Failed to import agent:', error);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        <Card className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">{agent.name}</h2>
              <p className="text-muted-foreground">{agent.description}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ×
            </Button>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Characteristics</h3>
              <p className="text-sm text-muted-foreground">{agent.characteristics}</p>
            </div>

            <div className="flex items-center space-x-4">
              {agent.category && (
                <Badge variant="secondary" className="capitalize">
                  {agent.category}
                </Badge>
              )}
              {agent.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>

            <div className="flex items-center space-x-6 text-sm text-muted-foreground">
              <div className="flex items-center space-x-1">
                <span>⭐</span>
                <span>{agent.rating.toFixed(1)}</span>
                <span>({agent.ratingCount} {t('marketplace.reviews')})</span>
              </div>
              <div>
                {agent.usageCount} {t('marketplace.usage')}
              </div>
              <div>
                {t('marketplace.creator')}: {agent.user.name}
              </div>
            </div>

            <div className="flex space-x-3 pt-4">
              <Button
                onClick={handleImport}
                disabled={importing}
                className="flex-1"
              >
                {importing ? 'Importing...' : t('marketplace.import')}
              </Button>
              <Button variant="outline" onClick={onClose} className="flex-1">
                {t('common.close')}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </Dialog>
  );
};