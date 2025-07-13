import { PrismaClient } from '@prisma/client';
import { db } from '../../config/database';
import { ModelPricingService } from './model-pricing.service';
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
} from './credit.types';

export class CreditService {
  private db: PrismaClient;
  private modelPricingService: ModelPricingService;

  constructor(database?: PrismaClient) {
    this.db = database || db;
    this.modelPricingService = new ModelPricingService(this.db);
  }

  /**
   * Get user's credit balance
   */
  async getCreditBalance(userId: string): Promise<ServiceResponse<CreditBalance>> {
    try {
      const user = await this.db.user.findUnique({
        where: { id: userId },
        select: {
          creditsBalance: true,
          creditsUsed: true,
          creditsPurchased: true,
          creditPlan: true,
          lastCreditRefillAt: true,
        },
      });

      if (!user) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      return {
        success: true,
        data: {
          creditsBalance: user.creditsBalance,
          creditsUsed: user.creditsUsed,
          creditsPurchased: user.creditsPurchased,
          creditPlan: user.creditPlan,
          lastCreditRefillAt: user.lastCreditRefillAt,
        },
      };
    } catch (error) {
      console.error('Error getting credit balance:', error);
      return {
        success: false,
        error: 'Failed to get credit balance',
      };
    }
  }

  /**
   * Use credits for a service
   */
  async useCredits(request: UseCreditRequest): Promise<ServiceResponse<CreditTransaction>> {
    try {
      // Start a transaction to ensure atomicity
      return await this.db.$transaction(async (tx) => {
        // Get current user balance
        const user = await tx.user.findUnique({
          where: { id: request.userId },
          select: {
            creditsBalance: true,
            creditsUsed: true,
          },
        });

        if (!user) {
          return {
            success: false,
            error: 'User not found',
          };
        }

        // Check if user has enough credits
        if (user.creditsBalance < request.amount) {
          return {
            success: false,
            error: `Insufficient credits. Required: ${request.amount}, Available: ${user.creditsBalance}`,
          };
        }

        // Update user balance
        const updatedUser = await tx.user.update({
          where: { id: request.userId },
          data: {
            creditsBalance: user.creditsBalance - request.amount,
            creditsUsed: user.creditsUsed + request.amount,
          },
        });

        // Create transaction record
        const transaction = await tx.creditTransaction.create({
          data: {
            userId: request.userId,
            amount: -request.amount, // Negative for usage
            transactionType: TransactionType.USAGE,
            reason: request.reason,
            description: request.description,
            transactionMetadata: request.metadata,
            balanceAfter: updatedUser.creditsBalance,
          },
        });

        return {
          success: true,
          data: transaction,
        };
      });
    } catch (error) {
      console.error('Error using credits:', error);
      return {
        success: false,
        error: 'Failed to use credits',
      };
    }
  }

  /**
   * Add credits to user account
   */
  async addCredits(request: AddCreditRequest): Promise<ServiceResponse<CreditTransaction>> {
    try {
      return await this.db.$transaction(async (tx) => {
        // Get current user balance
        const user = await tx.user.findUnique({
          where: { id: request.userId },
          select: {
            creditsBalance: true,
            creditsPurchased: true,
          },
        });

        if (!user) {
          return {
            success: false,
            error: 'User not found',
          };
        }

        // Update user balance
        const updateData: any = {
          creditsBalance: user.creditsBalance + request.amount,
        };

        // Update purchased credits if it's a purchase
        if (request.transactionType === TransactionType.PURCHASE) {
          updateData.creditsPurchased = user.creditsPurchased + request.amount;
        }

        // Update refill date if it's a subscription refill
        if (request.transactionType === TransactionType.REFILL || 
            request.reason === TransactionReason.SUBSCRIPTION_REFILL) {
          updateData.lastCreditRefillAt = new Date();
        }

        const updatedUser = await tx.user.update({
          where: { id: request.userId },
          data: updateData,
        });

        // Create transaction record
        const transaction = await tx.creditTransaction.create({
          data: {
            userId: request.userId,
            amount: request.amount, // Positive for credits added
            transactionType: request.transactionType,
            reason: request.reason,
            description: request.description,
            balanceAfter: updatedUser.creditsBalance,
          },
        });

        return {
          success: true,
          data: transaction,
        };
      });
    } catch (error) {
      console.error('Error adding credits:', error);
      return {
        success: false,
        error: 'Failed to add credits',
      };
    }
  }

  /**
   * Create a credit transaction (internal use)
   */
  async createTransaction(
    request: CreateTransactionRequest
  ): Promise<ServiceResponse<CreditTransaction>> {
    try {
      return await this.db.$transaction(async (tx) => {
        // Get current user balance
        const user = await tx.user.findUnique({
          where: { id: request.userId },
          select: {
            creditsBalance: true,
            creditsUsed: true,
            creditsPurchased: true,
          },
        });

        if (!user) {
          return {
            success: false,
            error: 'User not found',
          };
        }

        // Calculate new balance
        const newBalance = user.creditsBalance + request.amount;
        
        // Don't allow negative balance
        if (newBalance < 0) {
          return {
            success: false,
            error: 'Transaction would result in negative balance',
          };
        }

        // Update user balance based on transaction type
        const updateData: any = {
          creditsBalance: newBalance,
        };

        if (request.amount < 0) {
          // Usage transaction
          updateData.creditsUsed = user.creditsUsed + Math.abs(request.amount);
        } else if (request.transactionType === TransactionType.PURCHASE) {
          // Purchase transaction
          updateData.creditsPurchased = user.creditsPurchased + request.amount;
        }

        await tx.user.update({
          where: { id: request.userId },
          data: updateData,
        });

        // Create transaction record
        const transaction = await tx.creditTransaction.create({
          data: {
            userId: request.userId,
            amount: request.amount,
            transactionType: request.transactionType,
            reason: request.reason,
            description: request.description,
            transactionMetadata: request.metadata,
            balanceAfter: newBalance,
          },
        });

        return {
          success: true,
          data: transaction,
        };
      });
    } catch (error) {
      console.error('Error creating transaction:', error);
      return {
        success: false,
        error: 'Failed to create transaction',
      };
    }
  }

  /**
   * Get user's transaction history
   */
  async getTransactionHistory(
    options: TransactionQueryOptions
  ): Promise<ServiceResponse<{
    transactions: CreditTransaction[];
    total: number;
  }>> {
    try {
      const where: any = {};

      if (options.userId) {
        where.userId = options.userId;
      }

      if (options.transactionType) {
        where.transactionType = options.transactionType;
      }

      if (options.reason) {
        where.reason = options.reason;
      }

      if (options.startDate || options.endDate) {
        where.createdAt = {};
        if (options.startDate) {
          where.createdAt.gte = options.startDate;
        }
        if (options.endDate) {
          where.createdAt.lte = options.endDate;
        }
      }

      const [transactions, total] = await Promise.all([
        this.db.creditTransaction.findMany({
          where,
          skip: options.offset || 0,
          take: options.limit || 50,
          orderBy: {
            [options.orderBy || 'createdAt']: options.orderDirection || 'desc',
          },
        }),
        this.db.creditTransaction.count({ where }),
      ]);

      return {
        success: true,
        data: {
          transactions,
          total,
        },
      };
    } catch (error) {
      console.error('Error getting transaction history:', error);
      return {
        success: false,
        error: 'Failed to get transaction history',
      };
    }
  }

  /**
   * Get credit statistics for a user
   */
  async getCreditStatistics(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ServiceResponse<CreditStatistics>> {
    try {
      const user = await this.db.user.findUnique({
        where: { id: userId },
        select: {
          creditsBalance: true,
          creditsUsed: true,
          creditsPurchased: true,
        },
      });

      if (!user) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      // Set default date range (last 30 days)
      const end = endDate || new Date();
      const start = startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get transactions for the period
      const transactions = await this.db.creditTransaction.findMany({
        where: {
          userId,
          createdAt: {
            gte: start,
            lte: end,
          },
        },
      });

      // Calculate statistics
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

      // Calculate breakdowns
      for (const transaction of transactions) {
        // By type
        const type = transaction.transactionType as TransactionType;
        stats.breakdown.byType[type] = (stats.breakdown.byType[type] || 0) + Math.abs(transaction.amount);

        // By reason
        const reason = transaction.reason as TransactionReason;
        stats.breakdown.byReason[reason] = (stats.breakdown.byReason[reason] || 0) + Math.abs(transaction.amount);
      }

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      console.error('Error getting credit statistics:', error);
      return {
        success: false,
        error: 'Failed to get credit statistics',
      };
    }
  }

  /**
   * Validate if user has enough credits
   */
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
          shortfall: hasEnoughCredits ? undefined : requiredCredits - currentBalance,
        },
      };
    } catch (error) {
      console.error('Error validating credits:', error);
      return {
        success: false,
        error: 'Failed to validate credits',
      };
    }
  }

  /**
   * Calculate and deduct credits for model usage
   */
  async deductModelUsageCredits(
    userId: string,
    provider: string,
    modelName: string,
    messageCount?: number,
    tokenCount?: number,
    metadata?: Record<string, any>
  ): Promise<ServiceResponse<{
    transaction: CreditTransaction;
    cost: number;
  }>> {
    try {
      // Calculate cost
      const costResult = await this.modelPricingService.calculateCost({
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

      // Deduct credits
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
      return {
        success: false,
        error: 'Failed to deduct model usage credits',
      };
    }
  }

  /**
   * Grant welcome bonus to new user
   */
  async grantWelcomeBonus(userId: string): Promise<ServiceResponse<CreditTransaction>> {
    try {
      return await this.addCredits({
        userId,
        amount: 10000, // 10,000 credits as welcome bonus
        transactionType: TransactionType.BONUS,
        reason: TransactionReason.WELCOME_BONUS,
        description: 'Welcome bonus for new user',
      });
    } catch (error) {
      console.error('Error granting welcome bonus:', error);
      return {
        success: false,
        error: 'Failed to grant welcome bonus',
      };
    }
  }

  /**
   * Process subscription refill
   */
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
      return {
        success: false,
        error: 'Failed to process subscription refill',
      };
    }
  }
}