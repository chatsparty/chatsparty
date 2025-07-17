import {
  CreditTransaction as PrismaCreditTransaction,
  ModelCreditCost as PrismaModelCreditCost,
} from '@prisma/client';

// Credit transaction types
export interface CreditTransaction extends PrismaCreditTransaction {}

export interface ModelCreditCost extends PrismaModelCreditCost {}

// Credit balance types
export interface CreditBalance {
  creditsBalance: number;
  creditsUsed: number;
  creditsPurchased: number;
  creditPlan: string | null;
  lastCreditRefillAt: Date | null;
}

// Transaction types
export enum TransactionType {
  PURCHASE = 'purchase',
  USAGE = 'usage',
  REFUND = 'refund',
  BONUS = 'bonus',
  SUBSCRIPTION = 'subscription',
  REFILL = 'refill',
  ADJUSTMENT = 'adjustment',
}

// Transaction reasons
export enum TransactionReason {
  AI_CHAT = 'ai_chat',
  MODEL_USAGE = 'model_usage',
  VOICE_SYNTHESIS = 'voice_synthesis',

  MANUAL_ADJUSTMENT = 'manual_adjustment',
  SUBSCRIPTION_REFILL = 'subscription_refill',
  WELCOME_BONUS = 'welcome_bonus',
  REFERRAL_BONUS = 'referral_bonus',
}

// Credit transaction request types
export interface CreateTransactionRequest {
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
  metadata?: {
    modelName?: string;
    provider?: string;
    conversationId?: string;
    agentId?: string;
    tokensUsed?: number;
    [key: string]: any;
  };
}

export interface AddCreditRequest {
  userId: string;
  amount: number;
  transactionType: TransactionType;
  reason: TransactionReason;
  description?: string;
}

// Model pricing types
export interface ModelPricing {
  provider: string;
  modelName: string;
  costPerMessage: number;
  costPer1kTokens: number | null;
  isDefaultModel: boolean;
  isActive: boolean;
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
  modelPricing: ModelPricing;
}

// Service response types
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Query options
export interface TransactionQueryOptions {
  userId?: string;
  transactionType?: TransactionType;
  reason?: TransactionReason;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
  orderBy?: 'createdAt' | 'amount';
  orderDirection?: 'asc' | 'desc';
}

export interface ModelPricingQueryOptions {
  provider?: string;
  isActive?: boolean;
  isDefaultModel?: boolean;
}

// Statistics types
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

// Validation types
export interface CreditValidation {
  hasEnoughCredits: boolean;
  currentBalance: number;
  requiredCredits: number;
  shortfall?: number;
}
