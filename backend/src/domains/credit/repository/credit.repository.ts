import { PrismaClient, Prisma } from '@prisma/client';
import { db } from '../../../config/database';
import * as functions from './functions';
import { 
  CreditTransaction,
  ModelPricing,
  CreateTransactionRequest,
  TransactionQueryOptions 
} from '../types';

export class CreditRepository {
  private db: PrismaClient;

  constructor(database?: PrismaClient) {
    this.db = database || db;
  }

  async findUser(userId: string) {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        creditsBalance: true,
        creditsUsed: true,
        creditsPurchased: true,
      },
    });
    return user;
  }

  async findUserForUpdate(tx: Prisma.TransactionClient, userId: string) {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        creditsBalance: true,
        creditsUsed: true,
        creditsPurchased: true,
      },
    });
    return user;
  }

  async updateUserCredits(
    tx: Prisma.TransactionClient,
    userId: string,
    data: {
      creditsBalance?: number;
      creditsUsed?: number;
      creditsPurchased?: number;
      lastCreditRefillAt?: Date;
    }
  ) {
    return await tx.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        creditsBalance: true,
        creditsUsed: true,
        creditsPurchased: true,
      },
    });
  }

  async createCreditTransaction(
    tx: Prisma.TransactionClient,
    data: CreateTransactionRequest
  ): Promise<CreditTransaction> {
    const transaction = await tx.creditTransaction.create({
      data: {
        userId: data.userId,
        amount: data.amount,
        transactionType: data.transactionType,
        reason: data.reason,
        description: data.description,
        transactionMetadata: data.transactionMetadata,
        balanceAfter: data.balanceAfter,
      },
    });
    return transaction as CreditTransaction;
  }

  async findTransactions(
    options: TransactionQueryOptions
  ): Promise<[CreditTransaction[], number]> {
    const where: any = { userId: options.userId };

    if (options.startDate || options.endDate) {
      where.createdAt = {};
      if (options.startDate) where.createdAt.gte = options.startDate;
      if (options.endDate) where.createdAt.lte = options.endDate;
    }

    if (options.transactionType) {
      where.transactionType = options.transactionType;
    }

    if (options.reason) {
      where.reason = options.reason;
    }

    const [transactions, count] = await Promise.all([
      this.db.creditTransaction.findMany({
        where,
        skip: options.offset,
        take: options.limit,
        orderBy: {
          [options.orderBy || 'createdAt']: options.orderDirection || 'desc',
        },
      }),
      this.db.creditTransaction.count({ where }),
    ]);

    return [transactions as CreditTransaction[], count];
  }

  async findModelPricing(
    provider: string,
    modelName: string
  ): Promise<ModelPricing | null> {
    const pricing = await this.db.modelCreditCost.findFirst({
      where: {
        provider,
        modelName,
        isActive: true,
      },
    });
    return pricing as ModelPricing | null;
  }

  async findDefaultModelPricing(provider: string): Promise<ModelPricing | null> {
    const pricing = await this.db.modelCreditCost.findFirst({
      where: {
        provider,
        isDefaultModel: true,
        isActive: true,
      },
    });
    return pricing as ModelPricing | null;
  }

  async findAllModelPricing(
    options?: ModelPricingQueryOptions
  ): Promise<[ModelPricing[], number]> {
    const where: any = {};

    if (options?.provider) {
      where.provider = options.provider;
    }

    if (options?.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    const [pricing, count] = await Promise.all([
      this.db.modelCreditCost.findMany({
        where,
        skip: options?.offset,
        take: options?.limit,
        orderBy: {
          provider: 'asc',
          modelName: 'asc',
        },
      }),
      this.db.modelCreditCost.count({ where }),
    ]);

    return [pricing as ModelPricing[], count];
  }

  async createModelPricing(data: {
    provider: string;
    modelName: string;
    costPerMessage: number;
    costPer1kTokens?: number | null;
    isDefaultModel?: boolean;
    isActive?: boolean;
  }): Promise<ModelPricing> {
    const pricing = await this.db.modelCreditCost.create({
      data: {
        ...data,
        isDefaultModel: data.isDefaultModel || false,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });
    return pricing as ModelPricing;
  }

  async updateModelPricing(
    id: string,
    data: {
      costPerMessage?: number;
      costPer1kTokens?: number | null;
      isDefaultModel?: boolean;
      isActive?: boolean;
    }
  ): Promise<ModelPricing> {
    const pricing = await this.db.modelCreditCost.update({
      where: { id },
      data,
    });
    return pricing as ModelPricing;
  }

  async deleteModelPricing(id: string): Promise<void> {
    await this.db.modelCreditCost.delete({
      where: { id },
    });
  }

  // Export the existing functions for backward compatibility
  findCreditsByUserId = functions.findCreditsByUserId;
  createCredit = functions.createCredit;
  updateCredit = functions.updateCredit;
}