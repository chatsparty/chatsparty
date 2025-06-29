import axios from 'axios';
import { API_BASE_URL } from '@/config/api';

export interface CreditBalance {
  user_id: string;
  balance: number;
  lifetime_credits_used: number;
  lifetime_credits_purchased: number;
  credit_plan: string;
  last_refill_at: string;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: string;
  reason: string;
  description?: string;
  metadata?: Record<string, any>;
  balance_after: number;
  created_at: string;
}

export interface CreditCheckResponse {
  has_sufficient_credits: boolean;
  required_credits: number;
  current_balance: number;
  difference: number;
}

export const creditApi = {
  async getBalance(): Promise<CreditBalance> {
    const response = await axios.get(`${API_BASE_URL}/credits/balance`);
    return response.data;
  },

  async checkCredits(amount: number): Promise<CreditCheckResponse> {
    const response = await axios.get(`${API_BASE_URL}/credits/check/${amount}`);
    return response.data;
  },

  async getTransactions(limit: number = 50, offset: number = 0): Promise<CreditTransaction[]> {
    const response = await axios.get(`${API_BASE_URL}/credits/transactions`, {
      params: { limit, offset }
    });
    return response.data;
  }
};