import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Coins, ExternalLink, Receipt } from 'lucide-react';
import { creditApi, type CreditBalance, type CreditTransaction } from '@/services/creditApi';
import { useToast } from '@/hooks/useToast';
import { useTranslation } from 'react-i18next';

export const CreditsManagement: React.FC = () => {
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [balanceData, transactionsData] = await Promise.all([
          creditApi.getBalance(),
          creditApi.getTransactions(50, 0)
        ]);
        setBalance(balanceData);
        setTransactions(transactionsData);
      } catch (error) {
        console.error('Failed to fetch credit data:', error);
        showToast(t("credits.failedToLoad"), "error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [showToast]);


  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffMonths = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30));
    
    if (diffMonths > 0) {
      return diffMonths === 1 ? t('time.monthAgo') : t('time.monthsAgo', { count: diffMonths });
    }
    
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 0) {
      return diffDays === 1 ? t('time.dayAgo') : t('time.daysAgo', { count: diffDays });
    }
    
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    if (diffHours > 0) {
      return diffHours === 1 ? t('time.hourAgo') : t('time.hoursAgo', { count: diffHours });
    }
    
    return t('time.justNow');
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-8 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-light text-foreground">{t("settings.credits")}</h1>
          <p className="text-muted-foreground">{t("settings.creditsDescription")}</p>
        </div>
        <div className="animate-pulse space-y-6">
          <div className="bg-muted/50 rounded-2xl h-40"></div>
          <div className="bg-muted/50 rounded-2xl h-64"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-light text-foreground">{t("settings.credits")}</h1>
        <p className="text-muted-foreground">{t("settings.creditsDescription")}</p>
      </div>

      <Card className="border-0 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950/20 dark:to-indigo-950/20">
        <CardContent className="p-8">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                  <Coins className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">{t("credits.currentBalance")}</span>
              </div>
              <div className="text-4xl font-light text-foreground">
                {(balance?.balance || 0).toLocaleString(i18n.language)} {t("credits.credits")}
              </div>
              <div className="text-sm text-muted-foreground">
                {t("credits.availableForConversations")}
              </div>
            </div>
            <div className="text-right space-y-1">
              <div className="text-sm text-muted-foreground">{t("credits.plan")}</div>
              <div className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-medium capitalize">
                {balance?.credit_plan || 'free'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 bg-card/50">
        <CardContent className="p-8">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-medium">{t("credits.recentActivity")}</h2>
              <button className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                {t("common.viewAll")}
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>

            {transactions.length > 0 ? (
              <div className="space-y-4">
                {transactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between py-4 border-b last:border-b-0 border-border/50">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                        <Receipt className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="space-y-1">
                        <div className="font-medium">{t("credits.creditPurchase")}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(transaction.created_at)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-medium text-green-600 dark:text-green-400">
                          +{transaction.amount.toLocaleString(i18n.language)} {t("credits.credits")}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {transaction.reason}
                        </div>
                      </div>
                      <button className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
                        <Receipt className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 space-y-3">
                <div className="p-4 bg-muted/50 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                  <Coins className="w-8 h-8 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-muted-foreground">{t("credits.noTransactions")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("credits.transactionsWillAppear")}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};