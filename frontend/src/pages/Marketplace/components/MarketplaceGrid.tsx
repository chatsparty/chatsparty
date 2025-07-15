import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { AgentCard } from './AgentCard';
import { AgentListItem } from './AgentListItem';
import { AgentModal } from './AgentModal';

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

interface MarketplacePagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface MarketplaceGridProps {
  agents: MarketplaceAgent[];
  loading: boolean;
  viewMode: 'grid' | 'list';
  pagination: MarketplacePagination;
  onPageChange: (page: number) => void;
  onImportAgent: (agent: MarketplaceAgent) => Promise<void>;
  onRateAgent: (agentId: string, rating: number, review?: string) => Promise<void>;
}

export const MarketplaceGrid: React.FC<MarketplaceGridProps> = ({
  agents,
  loading,
  viewMode,
  pagination,
  onPageChange,
  onImportAgent,
  onRateAgent,
}) => {
  const { t } = useTranslation();
  const [selectedAgent, setSelectedAgent] = useState<MarketplaceAgent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAgentClick = (agent: MarketplaceAgent) => {
    setSelectedAgent(agent);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedAgent(null);
  };

  const handleImport = async (agent: MarketplaceAgent) => {
    await onImportAgent(agent);
  };

  const handleRate = async (agentId: string, rating: number, review?: string) => {
    await onRateAgent(agentId, rating, review);
  };

  const renderPagination = () => {
    if (pagination.pages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 5;
    const currentPage = pagination.page;
    const totalPages = pagination.pages;

    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="flex justify-center items-center space-x-2 mt-8">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          {t('common.previous')}
        </Button>
        
        {startPage > 1 && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(1)}
            >
              1
            </Button>
            {startPage > 2 && <span className="px-2">...</span>}
          </>
        )}
        
        {pages.map((page) => (
          <Button
            key={page}
            variant={page === currentPage ? 'default' : 'outline'}
            size="sm"
            onClick={() => onPageChange(page)}
          >
            {page}
          </Button>
        ))}
        
        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="px-2">...</span>}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(totalPages)}
            >
              {totalPages}
            </Button>
          </>
        )}
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          {t('common.next')}
        </Button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <Card className="p-12 text-center">
        <div className="text-4xl mb-4">🔍</div>
        <h3 className="text-lg font-semibold mb-2">{t('marketplace.noAgentsFound')}</h3>
        <p className="text-muted-foreground">{t('marketplace.noAgentsDesc')}</p>
      </Card>
    );
  }

  return (
    <div>
      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onClick={() => handleAgentClick(agent)}
              onImport={() => handleImport(agent)}
              onRate={(rating, review) => handleRate(agent.id, rating, review)}
            />
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {agents.map((agent) => (
            <AgentListItem
              key={agent.id}
              agent={agent}
              onClick={() => handleAgentClick(agent)}
              onImport={() => handleImport(agent)}
              onRate={(rating, review) => handleRate(agent.id, rating, review)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {renderPagination()}

      {/* Agent Detail Modal */}
      {selectedAgent && (
        <AgentModal
          agent={selectedAgent}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onImport={handleImport}
          onRate={handleRate}
        />
      )}
    </div>
  );
};