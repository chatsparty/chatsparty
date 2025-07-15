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
  Brain,
  Target,
  User,
  Play,
  CheckCircle,
  ChevronDown,
  Clock,
  TrendingUp
} from 'lucide-react';

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

export const MarketplacePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [view, setView] = useState<'browse' | 'brainstorm' | 'usecases'>('browse');
  const [filters, setFilters] = useState<FilterOptions>({
    sortBy: 'popular',
    sortOrder: 'desc',
  });
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedAgent, setSelectedAgent] = useState<MarketplaceAgent | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const {
    agents,
    loading,
    pagination,
    categories,
    brainstormTemplates,
    useCaseTemplates,
    fetchAgents,
    importAgent,
    rateAgent,
  } = useMarketplace();

  useEffect(() => {
    if (view === 'browse') {
      fetchAgents({ ...filters, search });
    }
  }, [view, filters, search, fetchAgents]);

  const handleFilterChange = (newFilters: Partial<FilterOptions>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
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

  const handleStartBrainstormSession = async (templateId: string) => {
    try {
      const template = brainstormTemplates.find(t => t.id === templateId);
      if (!template) {
        showToast(t('marketplace.templateNotFound'), 'error');
        return;
      }

      const importPromises = template.agents.map(async (agent) => {
        const result = await importAgent(agent.agentId);
        return result?.agent?.id;
      });

      const importedAgentIds = await Promise.all(importPromises);
      const validAgentIds = importedAgentIds.filter(Boolean);

      if (validAgentIds.length < 2) {
        showToast(t('marketplace.insufficientAgents'), 'error');
        return;
      }

      const sessionMessage = `Let's start a ${template.name} session. ${template.description}`;
      
      localStorage.setItem('brainstormSession', JSON.stringify({
        templateId,
        templateName: template.name,
        agents: validAgentIds.slice(0, 6),
        initialMessage: sessionMessage,
        timestamp: Date.now()
      }));

      showToast(t('marketplace.brainstormStarted'), 'success');
      navigate('/chat');
    } catch (error) {
      console.error('Failed to start brainstorm session:', error);
      showToast(t('marketplace.brainstormFailed'), 'error');
    }
  };

  const handleStartUseCase = async (templateId: string) => {
    try {
      const template = useCaseTemplates.find(t => t.id === templateId);
      if (!template) {
        showToast(t('marketplace.templateNotFound'), 'error');
        return;
      }

      const importPromises = template.agents.map(async (agentId) => {
        const result = await importAgent(agentId);
        return result?.agent?.id;
      });

      const importedAgentIds = await Promise.all(importPromises);
      const validAgentIds = importedAgentIds.filter(Boolean);

      if (validAgentIds.length < 2) {
        showToast(t('marketplace.insufficientAgents'), 'error');
        return;
      }

      const useCaseMessage = `Let's work on this use case: ${template.name}. 

Scenario: ${template.scenario}

Expected Outcome: ${template.expectedOutcome}

Estimated Duration: ${template.estimatedDuration}

Let's begin!`;
      
      localStorage.setItem('useCaseSession', JSON.stringify({
        templateId,
        templateName: template.name,
        agents: validAgentIds.slice(0, 6),
        initialMessage: useCaseMessage,
        scenario: template.scenario,
        expectedOutcome: template.expectedOutcome,
        timestamp: Date.now()
      }));

      showToast(t('marketplace.useCaseStarted'), 'success');
      navigate('/chat');
    } catch (error) {
      console.error('Failed to start use case:', error);
      showToast(t('marketplace.useCaseFailed'), 'error');
    }
  };


  const renderCategoryBadges = () => (
    <div className="bg-white dark:bg-[#191919] border-b border-gray-100 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-6 py-4">
        {/* Navigation tabs */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-1">
            {[
              { id: 'browse', label: 'Templates', icon: Grid3X3 },
              { id: 'brainstorm', label: 'Work', icon: Brain },
              { id: 'usecases', label: 'Personal', icon: Target },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setView(tab.id as any)}
                className={`flex items-center px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
                  view === tab.id
                    ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-800'
                }`}
              >
                <tab.icon className="w-4 h-4 mr-1.5" />
                {tab.label}
              </button>
            ))}
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search templates..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 pr-4 py-2 w-72 text-sm bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-lg focus:border-blue-500 dark:focus:border-blue-400"
            />
          </div>
        </div>

        {/* Category filters - Notion-style minimal */}
        <div className="flex items-center space-x-1 overflow-x-auto">
          {[
            { name: 'All', active: true },
            { name: 'Productivity', active: false },
            { name: 'Planning', active: false },
            { name: 'Business', active: false },
            { name: 'Education', active: false },
            { name: 'Personal', active: false },
          ].map((category) => (
            <button
              key={category.name}
              className={`px-2 py-1 text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                category.active
                  ? 'text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 rounded'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderAgentCard = (agent: MarketplaceAgent) => (
    <div 
      key={agent.id} 
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 hover:shadow-sm transition-all duration-200 cursor-pointer group"
      onClick={() => handleImportAgent(agent)}
    >
      {/* Compact preview area */}
      <div className="h-20 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-t-lg flex items-center justify-center relative overflow-hidden">
        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
          <User className="w-5 h-5 text-white" />
        </div>
        {/* Notion-style corner accent */}
        <div className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full opacity-60"></div>
      </div>
      
      {/* Compact content */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-medium text-gray-900 dark:text-white text-sm leading-tight group-hover:text-blue-600 transition-colors">
            {agent.name}
          </h3>
          <div className="flex items-center text-xs text-gray-500 ml-2">
            <Star className="w-3 h-3 text-yellow-500 fill-current mr-0.5" />
            <span className="text-xs">{agent.rating.toFixed(1)}</span>
          </div>
        </div>
        
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 line-clamp-2 leading-relaxed">
          {agent.description}
        </p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center text-xs text-gray-500">
            <div className="w-4 h-4 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center mr-1.5">
              <User className="w-2.5 h-2.5" />
            </div>
            <span className="truncate max-w-20">{agent.user.name}</span>
          </div>
          <div className="flex items-center text-xs text-gray-500">
            <TrendingUp className="w-3 h-3 mr-1" />
            <span>{agent.usageCount}</span>
          </div>
        </div>
      </div>
    </div>
  );


  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#1a1a1a]">
      {renderCategoryBadges()}
      
      {view === 'browse' && (
        <>
          {/* All Templates Grid - Notion-style compact layout */}
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                All templates • {pagination.total} results
              </h3>
              <div className="flex items-center gap-3">
                <select
                  className="text-xs px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                  value={filters.sortBy || 'popular'}
                  onChange={(e) => handleFilterChange({ sortBy: e.target.value as any })}
                >
                  <option value="popular">Popular</option>
                  <option value="rating">Top rated</option>
                  <option value="newest">Recent</option>
                </select>
                <button className="flex items-center text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                  <Filter className="w-3 h-3 mr-1" />
                  Filter
                </button>
              </div>
            </div>
            
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : agents.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-6 h-6 text-gray-400" />
                </div>
                <h3 className="text-sm font-medium mb-1 text-gray-900 dark:text-white">No templates found</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Try a different search or browse categories</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                {agents.map(renderAgentCard)}
              </div>
            )}
          </div>
        </>
      )}

      {view === 'brainstorm' && (
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="mb-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-1">Work templates</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Templates designed for professional workflows and team collaboration</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {brainstormTemplates.map((template) => (
              <div key={template.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 p-4 hover:border-gray-200 dark:hover:border-gray-600 transition-colors">
                <div className="flex items-center mb-3">
                  <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center mr-3">
                    <Brain className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="font-medium text-gray-900 dark:text-white text-sm">{template.name}</h3>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">{template.description}</p>
                <Button 
                  size="sm"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs"
                  onClick={() => handleStartBrainstormSession(template.id)}
                >
                  Start session
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'usecases' && (
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="mb-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-1">Personal templates</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Templates for personal productivity, goal setting, and life management</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {useCaseTemplates.map((template) => (
              <div key={template.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 p-4 hover:border-gray-200 dark:hover:border-gray-600 transition-colors">
                <div className="flex items-center mb-3">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center mr-3">
                    <Target className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="font-medium text-gray-900 dark:text-white text-sm">{template.name}</h3>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">{template.description}</p>
                <Button 
                  size="sm"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs"
                  onClick={() => handleStartUseCase(template.id)}
                >
                  Use template
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

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