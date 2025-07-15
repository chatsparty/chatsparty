import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';

export const MarketplaceHeader: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-border">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            {t('marketplace.title')}
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            {t('marketplace.subtitle')}
          </p>
          
          {/* Featured Use Cases */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="text-2xl mb-3">🧠</div>
              <h3 className="font-semibold text-lg mb-2">{t('marketplace.brainstorming')}</h3>
              <p className="text-sm text-muted-foreground">{t('marketplace.brainstormingDesc')}</p>
            </Card>
            
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="text-2xl mb-3">✍️</div>
              <h3 className="font-semibold text-lg mb-2">{t('marketplace.writing')}</h3>
              <p className="text-sm text-muted-foreground">{t('marketplace.writingDesc')}</p>
            </Card>
            
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="text-2xl mb-3">📊</div>
              <h3 className="font-semibold text-lg mb-2">{t('marketplace.analysis')}</h3>
              <p className="text-sm text-muted-foreground">{t('marketplace.analysisDesc')}</p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};