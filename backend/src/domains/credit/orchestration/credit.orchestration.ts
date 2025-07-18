import { findCreditsByUserId, createCredit, updateCredit } from '../repository';
import {
  CreditBalance,
  CreditDetails,
  AddCreditRequest,
  UseCreditRequest,
} from '../types';
import { ServiceResponse } from '../../user/types';

export const getCreditBalance = async (
  userId: string
): Promise<ServiceResponse<CreditBalance>> => {
  try {
    const credits = await findCreditsByUserId(userId);

    const total = credits.reduce((sum, credit) => sum + credit.amount, 0);
    const used = credits.reduce((sum, credit) => sum + credit.used, 0);
    const remaining = credits.reduce(
      (sum, credit) => sum + credit.remaining,
      0
    );

    const creditDetails: CreditDetails[] = credits.map(credit => ({
      id: credit.id,
      amount: credit.amount,
      used: credit.used,
      remaining: credit.remaining,
      type: credit.type,
      expiresAt: credit.expiresAt,
      createdAt: credit.createdAt,
    }));

    return {
      success: true,
      data: {
        total,
        used,
        remaining,
        credits: creditDetails,
      },
    };
  } catch (error) {
    console.error('Error getting credit balance:', error);
    return {
      success: false,
      error: 'Failed to get credit balance',
    };
  }
};

export const addCredits = async (
  userId: string,
  request: AddCreditRequest
): Promise<ServiceResponse<CreditDetails>> => {
  try {
    const credit = await createCredit(userId, request);

    return {
      success: true,
      data: credit,
    };
  } catch (error) {
    console.error('Error adding credits:', error);
    return {
      success: false,
      error: 'Failed to add credits',
    };
  }
};

export const useCredits = async (
  userId: string,
  request: UseCreditRequest
): Promise<ServiceResponse<CreditBalance>> => {
  try {
    const credits = await findCreditsByUserId(userId);

    const totalAvailable = credits.reduce(
      (sum, credit) => sum + credit.remaining,
      0
    );

    if (totalAvailable < request.amount) {
      return {
        success: false,
        error: 'Insufficient credits',
      };
    }

    let remainingToDeduct = request.amount;

    for (const credit of credits) {
      if (remainingToDeduct <= 0) break;

      const deductAmount = Math.min(credit.remaining, remainingToDeduct);

      await updateCredit(credit.id, {
        used: credit.used + deductAmount,
        remaining: credit.remaining - deductAmount,
      });

      remainingToDeduct -= deductAmount;
    }

    return getCreditBalance(userId);
  } catch (error) {
    console.error('Error using credits:', error);
    return {
      success: false,
      error: 'Failed to use credits',
    };
  }
};
