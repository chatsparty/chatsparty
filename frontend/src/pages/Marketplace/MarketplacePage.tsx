import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { ImportAgentModal } from './components/ImportAgentModal';
import { useMarketplace } from './hooks/useMarketplace';
import { useToast } from '../../hooks/useToast';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Grid3X3, 
  List, 
  Star, 
  Users, 
  Download,
  User,
  Play,
  CheckCircle,
  ChevronDown,
  Clock,
  TrendingUp
} from 'lucide-react';
import Avatar from 'boring-avatars';

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

interface FilterOptions {
  category?: string;
  tags?: string[];
  minRating?: number;
  search?: string;
  sortBy?: 'popular' | 'rating' | 'newest' | 'name';
  sortOrder?: 'asc' | 'desc';
}


export const MarketplacePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  // Removed view state - now only showing templates
  const [filters, setFilters] = useState<FilterOptions>({
    sortBy: 'popular',
    sortOrder: 'desc',
  });
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedAgent, setSelectedAgent] = useState<MarketplaceAgent | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const {
    agents,
    loading,
    pagination,
    categories,
    fetchAgents,
    importAgent,
    rateAgent,
  } = useMarketplace();

  useEffect(() => {
    fetchAgents({ ...filters, search });
  }, [filters, search, fetchAgents]);

  const handleFilterChange = (newFilters: Partial<FilterOptions>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    const categoryFilter = category === 'All' ? undefined : category.toLowerCase();
    handleFilterChange({ category: categoryFilter });
  };

  const handlePageChange = (page: number) => {
    fetchAgents({ ...filters, search }, page);
  };

  const handleImportAgent = async (agent: MarketplaceAgent) => {
    setSelectedAgent(agent);
    setShowImportModal(true);
  };

  const handleConfirmImport = async (customizations?: any) => {
    if (!selectedAgent) return;

    setIsImporting(true);
    try {
      const result = await importAgent(selectedAgent.id, customizations);
      if (result?.success) {
        showToast(t('marketplace.agentImported'), 'success');
        setShowImportModal(false);
        setSelectedAgent(null);
        // Add a small delay to ensure the import is processed
        setTimeout(() => {
          navigate('/chat/agents');
        }, 100);
      } else {
        showToast(t('marketplace.importFailed'), 'error');
      }
    } catch (error) {
      console.error('Import error:', error);
      showToast(t('marketplace.importFailed'), 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const handleRateAgent = async (agentId: string, rating: number, review?: string) => {
    const result = await rateAgent(agentId, rating, review);
    if (result?.success) {
      showToast(t('marketplace.ratingSubmitted'), 'success');
      fetchAgents({ ...filters, search });
    } else {
      showToast(t('marketplace.ratingFailed'), 'error');
    }
  };



  const renderCategoryBadges = () => (
    <div className="bg-white dark:bg-gray-900 sticky top-0 z-10 shadow-sm">
      <div className="max-w-7xl mx-auto">
        {/* Search bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              Templates
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Discover and import AI agents for your projects
            </p>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search templates..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 pr-4 py-2 w-80 text-sm bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Category filters */}
        <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center space-x-6 overflow-x-auto">
            {[
              'All',
              'Productivity', 
              'Planning',
              'Business',
              'Education',
              'Personal',
              'Creative'
            ].map((category) => (
              <button
                key={category}
                onClick={() => handleCategoryChange(category)}
                className={`text-sm font-medium whitespace-nowrap transition-all duration-200 pb-2 ${
                  selectedCategory === category
                    ? 'text-gray-900 dark:text-white border-b-2 border-blue-500'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const getAgentColor = (agentId: string) => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3', '#54A0FF'];
    let hash = 0;
    for (let i = 0; i < agentId.length; i++) {
      hash = agentId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const renderAgentCard = (agent: MarketplaceAgent) => (
    <div 
      key={agent.id} 
      className="group cursor-pointer bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50 border border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 rounded-xl transition-all duration-200 overflow-hidden h-full flex flex-col"
      onClick={() => handleImportAgent(agent)}
    >
      {/* Card Header */}
      <div className="p-5 pb-4 flex-1">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
              <Avatar
                size={48}
                name={agent.name}
                variant="beam"
                colors={[
                  getAgentColor(agent.id),
                  "#92A1C6",
                  "#146A7C",
                  "#F0AB3D",
                  "#C271B4"
                ]}
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-white text-base mb-1 group-hover:text-blue-600 transition-colors line-clamp-1">
                {agent.name}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                by {agent.user.name}
              </p>
            </div>
          </div>
          
          {/* Rating */}
          <div className="flex items-center space-x-1 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded-md flex-shrink-0">
            <Star className="w-3 h-3 text-yellow-500 fill-current" />
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{agent.rating.toFixed(1)}</span>
          </div>
        </div>
        
        {/* Description */}
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4 line-clamp-3">
          {agent.description}
        </p>
        
        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <TrendingUp className="w-3 h-3" />
              <span>{agent.usageCount} uses</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>{new Date(agent.publishedAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Card Footer */}
      <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 mt-auto">
        <button 
          className="w-full flex items-center justify-center space-x-2 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            handleImportAgent(agent);
          }}
        >
          <Download className="w-4 h-4" />
          <span>Import template</span>
        </button>
      </div>
    </div>
  );


  return (
    <div className="min-h-full bg-gray-50 dark:bg-gray-900">
      {renderCategoryBadges()}
      
      {/* Templates Gallery - Notion-inspired card layout */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900 dark:text-white mb-2">
                {selectedCategory === 'All' ? 'All templates' : `${selectedCategory} templates`}
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                {pagination.total} agents available for import
              </p>
            </div>
            <div className="flex items-center gap-3">
              <select
                className="text-sm px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={filters.sortBy || 'popular'}
                onChange={(e) => handleFilterChange({ sortBy: e.target.value as any })}
              >
                <option value="popular">Most popular</option>
                <option value="rating">Highest rated</option>
                <option value="newest">Recently added</option>
                <option value="name">Name</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Content */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-medium mb-2 text-gray-900 dark:text-white">No templates found</h3>
            <p className="text-gray-500 dark:text-gray-400">Try adjusting your search or browse different categories</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
            {agents.map(renderAgentCard)}
          </div>
        )}
      </div>

      {/* Import Agent Modal */}
      {selectedAgent && (
        <ImportAgentModal
          agent={selectedAgent}
          isOpen={showImportModal}
          onClose={() => {
            setShowImportModal(false);
            setSelectedAgent(null);
          }}
          onImport={handleConfirmImport}
          isImporting={isImporting}
        />
      )}
    </div>
  );
};