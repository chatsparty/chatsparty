import { Credit as PrismaCredit } from '@prisma/client';

export interface Credit extends PrismaCredit {}

export enum TransactionType {
  PURCHASE = 'purchase',
  USAGE = 'usage',
  REFUND = 'refund',
  BONUS = 'bonus',
  SUBSCRIPTION = 'subscription',
  TOPUP = 'topup',
  REFILL = 'refill'
}

export enum TransactionReason {
  AI_CHAT = 'AI chat',
  MODEL_USAGE = 'model usage',
  PURCHASE = 'purchase',
  SUBSCRIPTION_RENEWAL = 'subscription renewal',
  SUBSCRIPTION_REFILL = 'subscription refill',
  MANUAL_ADJUSTMENT = 'manual adjustment',
  PROMOTIONAL = 'promotional',
  WELCOME_BONUS = 'welcome bonus'
}

export interface CreditBalance {
  total: number;
  used: number;
  remaining: number;
  credits: CreditDetails[];
}

export interface CreditDetails {
  id: string;
  amount: number;
  used: number;
  remaining: number;
  type: string;
  expiresAt: Date | null;
  createdAt: Date;
}

export interface AddCreditRequest {
  userId: string;
  amount: number;
  transactionType: TransactionType;
  reason: TransactionReason;
  description?: string;
  metadata?: Record<string, any>;
}

export interface UseCreditRequest {
  userId: string;
  amount: number;
  reason: TransactionReason;
  description?: string;
  metadata?: Record<string, any>;
}

export interface CreditTransaction {
  id: string;
  userId: string;
  amount: number;
  transactionType: string;
  reason: string;
  description?: string | null;
  transactionMetadata?: any;
  balanceAfter: number;
  createdAt: Date;
}

export interface CreateTransactionRequest {
  userId: string;
  amount: number;
  transactionType: TransactionType;
  reason: TransactionReason;
  description?: string;
  transactionMetadata?: any;
  balanceAfter: number;
}

export interface TransactionQueryOptions {
  userId?: string;
  limit?: number;
  offset?: number;
  startDate?: Date;
  endDate?: Date;
  transactionType?: TransactionType;
  reason?: TransactionReason;
  orderBy?: 'createdAt' | 'amount';
  orderDirection?: 'asc' | 'desc';
}

export interface ModelPricing {
  id: string;
  provider: string;
  modelName: string;
  costPerMessage: number;
  costPer1kTokens?: number | null;
  isDefaultModel: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CalculateCostRequest {
  provider: string;
  modelName: string;
  messageCount?: number;
  tokenCount?: number;
}

export interface CostCalculation {
  totalCost: number;
  breakdown: {
    messageCost?: number;
    tokenCost?: number;
  };
}

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ModelPricingQueryOptions {
  provider?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

export interface CreditStatistics {
  totalCreditsUsed: number;
  totalCreditsPurchased: number;
  currentBalance: number;
  transactionCount: number;
  periodStart: Date;
  periodEnd: Date;
  breakdown: {
    byType: Record<TransactionType, number>;
    byReason: Record<TransactionReason, number>;
  };
}

export interface CreditValidation {
  hasEnoughCredits: boolean;
  currentBalance: number;
  requiredCredits: number;
  shortfall?: number;
}
