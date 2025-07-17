import { PrismaClient } from '@prisma/client';
import { db } from '../../config/database';
import {
  CreditTransaction,
  ModelPricing,
  TransactionQueryOptions,
  ModelPricingQueryOptions,
} from './types';

export class CreditRepository {
  private db: PrismaClient;

  constructor(database?: PrismaClient) {
    this.db = database || db;
  }

  async findUserForUpdate(tx: any, userId: string) {
    return tx.user.findUnique({
      where: { id: userId },
      select: {
        creditsBalance: true,
        creditsUsed: true,
        creditsPurchased: true,
      },
    });
  }

  async updateUserCredits(tx: any, userId: string, data: any) {
    return tx.user.update({
      where: { id: userId },
      data,
    });
  }

  async createCreditTransaction(
    tx: any,
    data: any
  ): Promise<CreditTransaction> {
    return tx.creditTransaction.create({ data });
  }

  async findUser(userId: string) {
    return this.db.user.findUnique({
      where: { id: userId },
      select: {
        creditsBalance: true,
        creditsUsed: true,
        creditsPurchased: true,
        creditPlan: true,
        lastCreditRefillAt: true,
      },
    });
  }

  async findTransactions(options: TransactionQueryOptions) {
    const where: any = {};
    if (options.userId) where.userId = options.userId;
    if (options.transactionType)
      where.transactionType = options.transactionType;
    if (options.reason) where.reason = options.reason;
    if (options.startDate || options.endDate) {
      where.createdAt = {};
      if (options.startDate) where.createdAt.gte = options.startDate;
      if (options.endDate) where.createdAt.lte = options.endDate;
    }

    return Promise.all([
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
  }

  async findModelPricing(provider: string, modelName: string) {
    return this.db.modelCreditCost.findUnique({
      where: { provider_modelName: { provider, modelName } },
    });
  }

  async findDefaultModelPricing(provider: string) {
    return this.db.modelCreditCost.findFirst({
      where: { provider, isDefaultModel: true, isActive: true },
    });
  }

  async findModelPricings(options: ModelPricingQueryOptions) {
    const where: any = {};
    if (options.provider) where.provider = options.provider;
    if (options.isActive !== undefined) where.isActive = options.isActive;
    if (options.isDefaultModel !== undefined)
      where.isDefaultModel = options.isDefaultModel;

    return this.db.modelCreditCost.findMany({
      where,
      orderBy: [
        { provider: 'asc' },
        { isDefaultModel: 'desc' },
        { modelName: 'asc' },
      ],
    });
  }

  async upsertModelPricing(pricing: ModelPricing) {
    return this.db.modelCreditCost.upsert({
      where: {
        provider_modelName: {
          provider: pricing.provider,
          modelName: pricing.modelName,
        },
      },
      update: {
        costPerMessage: pricing.costPerMessage,
        costPer1kTokens: pricing.costPer1kTokens,
        isDefaultModel: pricing.isDefaultModel,
        isActive: pricing.isActive,
      },
      create: pricing,
    });
  }

  async deleteModelPricing(provider: string, modelName: string) {
    return this.db.modelCreditCost.delete({
      where: { provider_modelName: { provider, modelName } },
    });
  }
}
