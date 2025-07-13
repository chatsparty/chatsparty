import { z } from 'zod';

// User schemas
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be less than 100 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  name: z.string().min(1).max(100).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email('Invalid email address').optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be less than 100 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
});

// Credit schemas
export const addCreditSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  type: z.enum(['subscription', 'topup', 'bonus']),
  expiresAt: z.date().optional(),
});

export const useCreditSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  description: z.string().max(500).optional(),
});

// Query schemas
export const paginationSchema = z.object({
  limit: z.number().int().min(1).max(100).default(10),
  offset: z.number().int().min(0).default(0),
  orderBy: z.enum(['createdAt', 'updatedAt', 'name', 'email']).default('createdAt'),
  orderDirection: z.enum(['asc', 'desc']).default('desc'),
});

export const userIdSchema = z.object({
  id: z.string().cuid('Invalid user ID'),
});

export const emailSchema = z.object({
  email: z.string().email('Invalid email address'),
});

// Type exports
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type AddCreditInput = z.infer<typeof addCreditSchema>;
export type UseCreditInput = z.infer<typeof useCreditSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type UserIdInput = z.infer<typeof userIdSchema>;
export type EmailInput = z.infer<typeof emailSchema>;