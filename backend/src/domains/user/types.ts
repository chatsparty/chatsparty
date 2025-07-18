import { User as PrismaUser, Credit as PrismaCredit } from '@prisma/client';

// User types
export interface User extends PrismaUser {}

export interface UserWithCredits extends User {
  credits: PrismaCredit[];
}

export interface PublicUser {
  id: string;
  email: string;
  name: string | null;
  provider: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Authentication types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  name?: string;
}

export interface AuthResponse {
  user: PublicUser;
  token: string;
}

// Credit types
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
  amount: number;
  type: 'subscription' | 'topup' | 'bonus';
  expiresAt?: Date;
}

export interface UseCreditRequest {
  amount: number;
  description?: string;
}

// Service response types
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Query options
export interface UserQueryOptions {
  includeCredits?: boolean;
  includeAgents?: boolean;
  includeConnections?: boolean;
}

export interface PaginationOptions {
  limit?: number;
  offset?: number;
  orderBy?: 'createdAt' | 'updatedAt' | 'name' | 'email';
  orderDirection?: 'asc' | 'desc';
}
