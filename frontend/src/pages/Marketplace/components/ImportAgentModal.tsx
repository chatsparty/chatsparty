import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { X, User, Star, Settings, Download, Sparkles, Edit3, Clock, TrendingUp } from 'lucide-react';
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

interface ImportAgentModalProps {
  agent: MarketplaceAgent;
  isOpen: boolean;
  onClose: () => void;
  onImport: (customizations?: any) => void;
  isImporting: boolean;
}

export const ImportAgentModal: React.FC<ImportAgentModalProps> = ({
  agent,
  isOpen,
  onClose,
  onImport,
  isImporting,
}) => {
  const { t } = useTranslation();
  const [customName, setCustomName] = useState(agent?.name || '');
  const [customCharacteristics, setCustomCharacteristics] = useState(agent?.characteristics || '');
  const [useCustomizations, setUseCustomizations] = useState(false);

  // Handle ESC key press
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !agent) return null;

  const getAgentColor = (agentId: string) => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3', '#54A0FF'];
    let hash = 0;
    for (let i = 0; i < agentId.length; i++) {
      hash = agentId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const handleImport = () => {
    const customizations = useCustomizations ? {
      name: customName !== agent?.name ? customName : undefined,
      characteristics: customCharacteristics !== agent?.characteristics ? customCharacteristics : undefined,
    } : undefined;

    onImport(customizations);
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-100 dark:border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-50 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                Import template
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Add this agent to your collection
              </p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Agent Preview Card */}
          <div className="bg-gray-50 dark:bg-gray-800/30 rounded-lg p-5 mb-6 border border-gray-100 dark:border-gray-800">
            <div className="flex items-start space-x-4 mb-4">
              <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0">
                <Avatar
                  size={56}
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
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                      {agent.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      by {agent.user.name}
                    </p>
                  </div>
                  <div className="flex items-center space-x-1 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded-md">
                    <Star className="w-3 h-3 text-yellow-500 fill-current" />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{agent.rating.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
              {agent.description}
            </p>
            
            {/* Stats */}
            <div className="flex items-center space-x-6 mb-4">
              <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                <TrendingUp className="w-3 h-3" />
                <span>{agent.usageCount} uses</span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                <Clock className="w-3 h-3" />
                <span>{new Date(agent.publishedAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                <User className="w-3 h-3" />
                <span>{agent.ratingCount} reviews</span>
              </div>
            </div>

            {/* Category Badge */}
            <div className="flex items-center">
              <Badge variant="outline" className="capitalize bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800 text-xs">
                {agent.category}
              </Badge>
            </div>
          </div>

          {/* Customization Toggle */}
          <div className="bg-gray-50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-800 rounded-lg p-4 mb-4">
            <label htmlFor="useCustomizations" className="flex items-start cursor-pointer">
              <input
                type="checkbox"
                id="useCustomizations"
                checked={useCustomizations}
                onChange={(e) => setUseCustomizations(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 dark:border-gray-600 dark:bg-gray-700 mt-0.5 flex-shrink-0"
              />
              <div className="ml-3 flex-1">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Customize before importing
                  </span>
                  <div className="w-5 h-5 bg-blue-50 dark:bg-blue-900/20 rounded flex items-center justify-center">
                    <Edit3 className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Modify the agent's name and characteristics to match your needs
                </p>
              </div>
            </label>
          </div>

          {/* Customization Options */}
          {useCustomizations && (
            <div className="border border-blue-100 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-900/10 rounded-lg p-5 mb-4">
              <div className="flex items-center space-x-2 mb-4">
                <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Customization Options
                </h4>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('marketplace.customName')}
                  </label>
                  <Input
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder={agent.name}
                    className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-sm"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Give your agent a unique name that fits your workflow
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('marketplace.customCharacteristics')}
                  </label>
                  <Textarea
                    value={customCharacteristics}
                    onChange={(e) => setCustomCharacteristics(e.target.value)}
                    placeholder={agent.characteristics}
                    rows={3}
                    className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-sm resize-none"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Adjust the agent's personality and behavior traits
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Agent Details */}
          <div className="border border-gray-100 dark:border-gray-800 rounded-lg p-5">
            <div className="flex items-center space-x-2 mb-4">
              <Settings className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                {t('marketplace.agentDetails')}
              </h4>
            </div>
            <div className="space-y-3">
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-md p-3">
                <div className="text-xs">
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {t('marketplace.characteristics')}:
                  </span>
                  <p className="text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                    {agent.characteristics}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {t('marketplace.published')}:
                  </span>
                  <p className="text-gray-600 dark:text-gray-400 mt-0.5">
                    {new Date(agent.publishedAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    Category:
                  </span>
                  <p className="text-gray-600 dark:text-gray-400 capitalize mt-0.5">
                    {agent.category}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-5 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <button 
              onClick={onClose}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button 
              onClick={handleImport} 
              disabled={isImporting}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isImporting ? (
                <>
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white dark:border-gray-900 border-t-transparent dark:border-t-transparent mr-2"></div>
                  {t('marketplace.importing')}
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 mr-2" />
                  {t('marketplace.import')}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};