import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Coins, ExternalLink, Receipt } from 'lucide-react';
import { creditApi, type CreditBalance, type CreditTransaction } from '@/services/creditApi';
import { useToast } from '@/hooks/useToast';

export const CreditsManagement: React.FC = () => {
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [balanceData, transactionsData] = await Promise.all([
          creditApi.getBalance(),
          creditApi.getTransactions(50, 0)  // Show more transactions by default
        ]);
        setBalance(balanceData);
        setTransactions(transactionsData);
      } catch (error) {
        console.error('Failed to fetch credit data:', error);
        showToast("Failed to load credit information", "error");
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
      return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
    }
    
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }
    
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    }
    
    return 'Just now';
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-8 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-light text-foreground">Credits</h1>
          <p className="text-muted-foreground">Manage your account balance and billing</p>
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
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-light text-foreground">Credits</h1>
        <p className="text-muted-foreground">Manage your account balance and billing</p>
      </div>

      {/* Balance Overview */}
      <Card className="border-0 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950/20 dark:to-indigo-950/20">
        <CardContent className="p-8">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                  <Coins className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">Current Balance</span>
              </div>
              <div className="text-4xl font-light text-foreground">
                {balance?.balance?.toLocaleString() || '0'} credits
              </div>
              <div className="text-sm text-muted-foreground">
                Available for conversations
              </div>
            </div>
            <div className="text-right space-y-1">
              <div className="text-sm text-muted-foreground">Plan</div>
              <div className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-medium capitalize">
                {balance?.credit_plan || 'free'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="border-0 bg-card/50">
        <CardContent className="p-8">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-medium">Recent Activity</h2>
              <button className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                View All
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
                        <div className="font-medium">Credit Purchase</div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(transaction.created_at)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-medium text-green-600 dark:text-green-400">
                          +{transaction.amount.toLocaleString()} credits
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
                  <p className="font-medium text-muted-foreground">No transactions yet</p>
                  <p className="text-sm text-muted-foreground">
                    Your credit purchases and usage will appear here
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