import { PrismaClient } from '@prisma/client';
import { db } from '../../../config/database';
import { CreditRepository } from '../repository';
import { ModelPricingManager } from './model-pricing.manager';
import {
  CreditBalance,
  CreditTransaction,
  CreateTransactionRequest,
  UseCreditRequest,
  AddCreditRequest,
  ServiceResponse,
  TransactionQueryOptions,
  CreditStatistics,
  CreditValidation,
  TransactionType,
  TransactionReason,
} from '../types';

export class CreditManager {
  private db: PrismaClient;
  private repository: CreditRepository;
  private modelPricingManager: ModelPricingManager;

  constructor(
    database?: PrismaClient,
    repository?: CreditRepository,
    modelPricingManager?: ModelPricingManager
  ) {
    this.db = database || db;
    this.repository = repository || new CreditRepository(this.db);
    this.modelPricingManager =
      modelPricingManager || new ModelPricingManager(this.repository);
  }

  async getCreditBalance(
    userId: string
  ): Promise<ServiceResponse<CreditBalance>> {
    try {
      const user = await this.repository.findUser(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }
      return { success: true, data: user };
    } catch (error) {
      console.error('Error getting credit balance:', error);
      return { success: false, error: 'Failed to get credit balance' };
    }
  }

  async useCredits(
    request: UseCreditRequest
  ): Promise<ServiceResponse<CreditTransaction>> {
    try {
      return await this.db.$transaction(async tx => {
        const user = await this.repository.findUserForUpdate(
          tx,
          request.userId
        );
        if (!user) {
          return { success: false, error: 'User not found' };
        }

        if (user.creditsBalance < request.amount) {
          return {
            success: false,
            error: `Insufficient credits. Required: ${request.amount}, Available: ${user.creditsBalance}`,
          };
        }

        const updatedUser = await this.repository.updateUserCredits(
          tx,
          request.userId,
          {
            creditsBalance: user.creditsBalance - request.amount,
            creditsUsed: user.creditsUsed + request.amount,
          }
        );

        const transaction = await this.repository.createCreditTransaction(tx, {
          userId: request.userId,
          amount: -request.amount,
          transactionType: TransactionType.USAGE,
          reason: request.reason,
          description: request.description,
          transactionMetadata: request.metadata,
          balanceAfter: updatedUser.creditsBalance,
        });

        return { success: true, data: transaction };
      });
    } catch (error) {
      console.error('Error using credits:', error);
      return { success: false, error: 'Failed to use credits' };
    }
  }

  async addCredits(
    request: AddCreditRequest
  ): Promise<ServiceResponse<CreditTransaction>> {
    try {
      return await this.db.$transaction(async tx => {
        const user = await this.repository.findUserForUpdate(
          tx,
          request.userId
        );
        if (!user) {
          return { success: false, error: 'User not found' };
        }

        const updateData: any = {
          creditsBalance: user.creditsBalance + request.amount,
        };

        if (request.transactionType === TransactionType.PURCHASE) {
          updateData.creditsPurchased = user.creditsPurchased + request.amount;
        }

        if (
          request.transactionType === TransactionType.REFILL ||
          request.reason === TransactionReason.SUBSCRIPTION_REFILL
        ) {
          updateData.lastCreditRefillAt = new Date();
        }

        const updatedUser = await this.repository.updateUserCredits(
          tx,
          request.userId,
          updateData
        );

        const transaction = await this.repository.createCreditTransaction(tx, {
          userId: request.userId,
          amount: request.amount,
          transactionType: request.transactionType,
          reason: request.reason,
          description: request.description,
          balanceAfter: updatedUser.creditsBalance,
        });

        return { success: true, data: transaction };
      });
    } catch (error) {
      console.error('Error adding credits:', error);
      return { success: false, error: 'Failed to add credits' };
    }
  }

  async getTransactionHistory(
    options: TransactionQueryOptions
  ): Promise<
    ServiceResponse<{ transactions: CreditTransaction[]; total: number }>
  > {
    try {
      const [transactions, total] =
        await this.repository.findTransactions(options);
      return { success: true, data: { transactions, total } };
    } catch (error) {
      console.error('Error getting transaction history:', error);
      return { success: false, error: 'Failed to get transaction history' };
    }
  }

  async getCreditStatistics(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ServiceResponse<CreditStatistics>> {
    try {
      const user = await this.repository.findUser(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      const end = endDate || new Date();
      const start =
        startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [transactions] = await this.repository.findTransactions({
        userId,
        startDate: start,
        endDate: end,
      });

      const stats: CreditStatistics = {
        totalCreditsUsed: user.creditsUsed,
        totalCreditsPurchased: user.creditsPurchased,
        currentBalance: user.creditsBalance,
        transactionCount: transactions.length,
        periodStart: start,
        periodEnd: end,
        breakdown: {
          byType: {} as Record<TransactionType, number>,
          byReason: {} as Record<TransactionReason, number>,
        },
      };

      for (const transaction of transactions) {
        const type = transaction.transactionType as TransactionType;
        stats.breakdown.byType[type] =
          (stats.breakdown.byType[type] || 0) + Math.abs(transaction.amount);

        const reason = transaction.reason as TransactionReason;
        stats.breakdown.byReason[reason] =
          (stats.breakdown.byReason[reason] || 0) +
          Math.abs(transaction.amount);
      }

      return { success: true, data: stats };
    } catch (error) {
      console.error('Error getting credit statistics:', error);
      return { success: false, error: 'Failed to get credit statistics' };
    }
  }

  async validateCredits(
    userId: string,
    requiredCredits: number
  ): Promise<ServiceResponse<CreditValidation>> {
    try {
      const balanceResult = await this.getCreditBalance(userId);
      if (!balanceResult.success || !balanceResult.data) {
        return {
          success: false,
          error: balanceResult.error || 'Failed to get credit balance',
        };
      }

      const currentBalance = balanceResult.data.creditsBalance;
      const hasEnoughCredits = currentBalance >= requiredCredits;

      return {
        success: true,
        data: {
          hasEnoughCredits,
          currentBalance,
          requiredCredits,
          shortfall: hasEnoughCredits
            ? undefined
            : requiredCredits - currentBalance,
        },
      };
    } catch (error) {
      console.error('Error validating credits:', error);
      return { success: false, error: 'Failed to validate credits' };
    }
  }

  async deductModelUsageCredits(
    userId: string,
    provider: string,
    modelName: string,
    messageCount?: number,
    tokenCount?: number,
    metadata?: Record<string, any>
  ): Promise<
    ServiceResponse<{ transaction: CreditTransaction; cost: number }>
  > {
    try {
      const costResult = await this.modelPricingManager.calculateCost({
        provider,
        modelName,
        messageCount,
        tokenCount,
      });

      if (!costResult.success || !costResult.data) {
        return {
          success: false,
          error: costResult.error || 'Failed to calculate cost',
        };
      }

      const cost = costResult.data.totalCost;

      const transactionResult = await this.useCredits({
        userId,
        amount: cost,
        reason: TransactionReason.MODEL_USAGE,
        description: `${provider}:${modelName} usage`,
        metadata: {
          ...metadata,
          provider,
          modelName,
          messageCount,
          tokenCount,
          costBreakdown: costResult.data.breakdown,
        },
      });

      if (!transactionResult.success || !transactionResult.data) {
        return {
          success: false,
          error: transactionResult.error || 'Failed to deduct credits',
        };
      }

      return {
        success: true,
        data: {
          transaction: transactionResult.data,
          cost,
        },
      };
    } catch (error) {
      console.error('Error deducting model usage credits:', error);
      return { success: false, error: 'Failed to deduct model usage credits' };
    }
  }

  async grantWelcomeBonus(
    userId: string
  ): Promise<ServiceResponse<CreditTransaction>> {
    try {
      return await this.addCredits({
        userId,
        amount: 10000,
        transactionType: TransactionType.BONUS,
        reason: TransactionReason.WELCOME_BONUS,
        description: 'Welcome bonus for new user',
      });
    } catch (error) {
      console.error('Error granting welcome bonus:', error);
      return { success: false, error: 'Failed to grant welcome bonus' };
    }
  }

  async processSubscriptionRefill(
    userId: string,
    planCredits: number
  ): Promise<ServiceResponse<CreditTransaction>> {
    try {
      return await this.addCredits({
        userId,
        amount: planCredits,
        transactionType: TransactionType.REFILL,
        reason: TransactionReason.SUBSCRIPTION_REFILL,
        description: 'Monthly subscription credit refill',
      });
    } catch (error) {
      console.error('Error processing subscription refill:', error);
      return { success: false, error: 'Failed to process subscription refill' };
    }
  }
}
