import { PrismaClient } from '@prisma/client';
import { db } from '../../../config/database';
import { AddCreditRequest, CreditDetails } from './types';

export const findCreditsByUserId = async (
  userId: string,
  database: PrismaClient = db
) => {
  return database.credit.findMany({
    where: {
      userId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: [{ expiresAt: 'asc' }, { createdAt: 'asc' }],
  });
};

export const createCredit = async (
  userId: string,
  request: AddCreditRequest,
  database: PrismaClient = db
): Promise<CreditDetails> => {
  const credit = await database.credit.create({
    data: {
      userId,
      amount: request.amount,
      remaining: request.amount,
      type: request.type,
      expiresAt: request.expiresAt,
    },
  });

  return {
    id: credit.id,
    amount: credit.amount,
    used: credit.used,
    remaining: credit.remaining,
    type: credit.type,
    expiresAt: credit.expiresAt,
    createdAt: credit.createdAt,
  };
};

export const updateCredit = async (
  creditId: string,
  data: { used: number; remaining: number },
  database: PrismaClient = db
) => {
  return database.credit.update({
    where: { id: creditId },
    data,
  });
};
