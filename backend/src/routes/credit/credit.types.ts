import { TransactionType, TransactionReason } from '../../domains/credit/types';

export interface IQueryOptions {
  limit?: number;
  offset?: number;
  startDate?: string;
  endDate?: string;
  transactionType?: string;
  reason?: string;
  orderBy?: 'createdAt' | 'amount';
  orderDirection?: 'asc' | 'desc';
}

export interface IAddCreditsBody {
  amount: number;
  transactionType: TransactionType;
  reason: TransactionReason;
  description?: string;
  userId?: string;
}

export interface ICalculateCostBody {
  provider: string;
  modelName: string;
  messageCount?: number;
  tokenCount?: number;
}

export interface IModelPricingBody {
  provider: string;
  modelName: string;
  costPerMessage: number;
  costPer1kTokens?: number | null;
  isDefaultModel?: boolean;
  isActive?: boolean;
}
