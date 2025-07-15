import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { X, User, Star, Settings, Download, Sparkles, Edit3 } from 'lucide-react';

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

  if (!isOpen || !agent) return null;

  const handleImport = () => {
    const customizations = useCustomizations ? {
      name: customName !== agent?.name ? customName : undefined,
      characteristics: customCharacteristics !== agent?.characteristics ? customCharacteristics : undefined,
    } : undefined;

    onImport(customizations);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Download className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {t('marketplace.importAgent')}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Add this agent to your collection
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="rounded-full">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Agent Preview */}
          <Card className="border-0 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50 p-6">
            <div className="flex items-start space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <User className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-1">
                      {agent.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Created by {agent.user.name}
                    </p>
                  </div>
                  <Badge variant="secondary" className="capitalize bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">
                    {agent.category}
                  </Badge>
                </div>

                <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
                  {agent.description}
                </p>
                
                <div className="flex items-center space-x-6 mb-4">
                  <div className="flex items-center space-x-2">
                    <Star className="w-5 h-5 text-yellow-500 fill-current" />
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {agent.rating.toFixed(1)}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      ({agent.ratingCount} reviews)
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Download className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {agent.usageCount} imports
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {agent.tags.slice(0, 4).map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs bg-white dark:bg-gray-800">
                      {tag}
                    </Badge>
                  ))}
                  {agent.tags.length > 4 && (
                    <Badge variant="outline" className="text-xs bg-white dark:bg-gray-800">
                      +{agent.tags.length - 4} more
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Customization Toggle */}
          <Card className="border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center">
                <Edit3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <label htmlFor="useCustomizations" className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id="useCustomizations"
                    checked={useCustomizations}
                    onChange={(e) => setUseCustomizations(e.target.checked)}
                    className="w-5 h-5 text-purple-600 border-2 border-gray-300 rounded focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700"
                  />
                  <span className="ml-3 font-medium text-gray-900 dark:text-white">
                    {t('marketplace.customizeAgent')}
                  </span>
                </label>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Personalize the agent before adding to your collection
                </p>
              </div>
            </div>
          </Card>

          {/* Customization Options */}
          {useCustomizations && (
            <Card className="border border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/20 p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  Customization Options
                </h4>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('marketplace.customName')}
                  </label>
                  <Input
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder={agent.name}
                    className="bg-white dark:bg-gray-800"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Give your agent a unique name that fits your workflow
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('marketplace.customCharacteristics')}
                  </label>
                  <Textarea
                    value={customCharacteristics}
                    onChange={(e) => setCustomCharacteristics(e.target.value)}
                    placeholder={agent.characteristics}
                    rows={4}
                    className="bg-white dark:bg-gray-800"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Adjust the agent's personality and behavior traits
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Agent Details */}
          <Card className="border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Settings className="w-5 h-5 text-gray-600" />
              <h4 className="font-semibold text-gray-900 dark:text-white">
                {t('marketplace.agentDetails')}
              </h4>
            </div>
            <div className="space-y-3">
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <div className="text-sm">
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {t('marketplace.characteristics')}:
                  </span>
                  <p className="text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                    {agent.characteristics}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {t('marketplace.published')}:
                  </span>
                  <p className="text-gray-600 dark:text-gray-400">
                    {new Date(agent.publishedAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    Category:
                  </span>
                  <p className="text-gray-600 dark:text-gray-400 capitalize">
                    {agent.category}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 border-t border-gray-200 dark:border-gray-700 rounded-b-2xl">
          <div className="flex items-center justify-end space-x-3">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="px-6"
            >
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={isImporting}
              className="px-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
            >
              {isImporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {t('marketplace.importing')}
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  {t('marketplace.import')}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};