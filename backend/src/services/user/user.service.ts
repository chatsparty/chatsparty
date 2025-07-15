import { PrismaClient, AuthProviderType } from '@prisma/client';
import { OAuth2Client } from 'google-auth-library';
import { db } from '../../config/database';
import { generateToken } from '../../middleware/auth';
import { hashPassword, verifyPassword } from '../../utils/crypto';
import {
  User,
  UserWithCredits,
  PublicUser,
  LoginCredentials,
  RegisterCredentials,
  AuthResponse,
  CreditBalance,
  CreditDetails,
  AddCreditRequest,
  UseCreditRequest,
  ServiceResponse,
  UserQueryOptions,
  PaginationOptions,
} from './user.types';
import { config } from '../../config/env';

export class UserService {
  private db: PrismaClient;
  private googleClient: OAuth2Client;

  constructor(database?: PrismaClient) {
    this.db = database || db;
    this.googleClient = new OAuth2Client(config.GOOGLE_CLIENT_ID);
  }

  /**
   * Register a new user
   */
  async register(
    credentials: RegisterCredentials
  ): Promise<ServiceResponse<AuthResponse>> {
    try {
      const existingUser = await this.db.user.findUnique({
        where: { email: credentials.email },
      });

      if (existingUser) {
        return {
          success: false,
          error: 'User with this email already exists',
        };
      }

      const hashedPassword = await hashPassword(credentials.password);

      const user = await this.db.user.create({
        data: {
          email: credentials.email,
          password: hashedPassword,
          name: credentials.name,
          provider: 'LOCAL',
        },
      });

      await this.db.credit.create({
        data: {
          userId: user.id,
          amount: 100,
          remaining: 100,
          type: 'bonus',
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      const token = generateToken({
        userId: user.id,
        email: user.email,
      });

      const publicUser = this.toPublicUser(user);

      return {
        success: true,
        data: {
          user: publicUser,
          token,
        },
      };
    } catch (error) {
      console.error('Error registering user:', error);
      return {
        success: false,
        error: 'Failed to register user',
      };
    }
  }

  /**
   * Login user
   */
  async login(
    credentials: LoginCredentials
  ): Promise<ServiceResponse<AuthResponse>> {
    try {
      const user = await this.db.user.findUnique({
        where: { email: credentials.email },
      });

      if (!user) {
        return {
          success: false,
          error: 'Invalid email or password',
        };
      }

      if (user.provider === AuthProviderType.GOOGLE && !user.password) {
        return {
          success: false,
          error:
            'This account is registered with Google. Please use Google to sign in.',
        };
      }

      if (!user.password) {
        return {
          success: false,
          error: 'Invalid email or password',
        };
      }

      const isValid = await verifyPassword(credentials.password, user.password);

      if (!isValid) {
        return {
          success: false,
          error: 'Invalid email or password',
        };
      }

      const token = generateToken({
        userId: user.id,
        email: user.email,
      });

      const publicUser = this.toPublicUser(user);

      return {
        success: true,
        data: {
          user: publicUser,
          token,
        },
      };
    } catch (error) {
      console.error('Error logging in user:', error);
      return {
        success: false,
        error: 'Failed to login',
      };
    }
  }

  /**
   * Login or Register user with Google
   */
  async loginWithGoogle(
    accessToken: string
  ): Promise<ServiceResponse<AuthResponse>> {
    try {
      const userInfoResponse = await fetch(
        'https://www.googleapis.com/oauth2/v3/userinfo',
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (!userInfoResponse.ok) {
        throw new Error('Failed to get user info from Google.');
      }

      const payload = (await userInfoResponse.json()) as {
        sub: string;
        email: string;
        name?: string;
      };

      if (!payload || !payload.email || !payload.sub) {
        return { success: false, error: 'Invalid Google token' };
      }

      const { email, name, sub: providerId } = payload;

      let user = await this.db.user.findUnique({
        where: {
          provider_providerId: {
            provider: AuthProviderType.GOOGLE,
            providerId,
          },
        },
      });

      if (!user) {
        const existingLocalUser = await this.db.user.findUnique({
          where: { email },
        });

        if (
          existingLocalUser &&
          existingLocalUser.provider === AuthProviderType.LOCAL
        ) {
          user = await this.db.user.update({
            where: { id: existingLocalUser.id },
            data: {
              provider: AuthProviderType.GOOGLE,
              providerId,
              isVerified: true,
            },
          });
        } else {
          user = await this.db.user.create({
            data: {
              email,
              name: name || '',
              provider: AuthProviderType.GOOGLE,
              providerId,
              isVerified: true,
            },
          });

          await this.db.credit.create({
            data: {
              userId: user.id,
              amount: 100,
              remaining: 100,
              type: 'bonus',
              expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          });
        }
      }

      const appToken = generateToken({
        userId: user.id,
        email: user.email,
      });

      const publicUser = this.toPublicUser(user);

      return {
        success: true,
        data: {
          user: publicUser,
          token: appToken,
        },
      };
    } catch (error) {
      console.error('Error in loginWithGoogle:', error);
      return { success: false, error: 'Google authentication failed' };
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(
    userId: string,
    options: UserQueryOptions = {}
  ): Promise<ServiceResponse<UserWithCredits | User>> {
    try {
      const user = await this.db.user.findUnique({
        where: { id: userId },
        include: {
          credits: options.includeCredits || false,
          agents: options.includeAgents || false,
          connections: options.includeConnections || false,
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
        data: user,
      };
    } catch (error) {
      console.error('Error getting user:', error);
      return {
        success: false,
        error: 'Failed to get user',
      };
    }
  }

  /**
   * Update user
   */
  async updateUser(
    userId: string,
    data: { name?: string; email?: string }
  ): Promise<ServiceResponse<User>> {
    try {
      if (data.email) {
        const existingUser = await this.db.user.findFirst({
          where: {
            email: data.email,
            NOT: { id: userId },
          },
        });

        if (existingUser) {
          return {
            success: false,
            error: 'Email already in use',
          };
        }
      }

      const user = await this.db.user.update({
        where: { id: userId },
        data,
      });

      return {
        success: true,
        data: user,
      };
    } catch (error) {
      console.error('Error updating user:', error);
      return {
        success: false,
        error: 'Failed to update user',
      };
    }
  }

  /**
   * Change user password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<ServiceResponse<void>> {
    try {
      const user = await this.db.user.findUnique({
        where: { id: userId },
      });

      if (!user || !user.password) {
        return {
          success: false,
          error: 'User not found or no password set',
        };
      }

      const isValid = await verifyPassword(currentPassword, user.password);

      if (!isValid) {
        return {
          success: false,
          error: 'Current password is incorrect',
        };
      }

      const hashedPassword = await hashPassword(newPassword);

      await this.db.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error changing password:', error);
      return {
        success: false,
        error: 'Failed to change password',
      };
    }
  }

  /**
   * Delete user
   */
  async deleteUser(userId: string): Promise<ServiceResponse<void>> {
    try {
      await this.db.user.delete({
        where: { id: userId },
      });

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error deleting user:', error);
      return {
        success: false,
        error: 'Failed to delete user',
      };
    }
  }

  /**
   * Get user credit balance
   */
  async getCreditBalance(
    userId: string
  ): Promise<ServiceResponse<CreditBalance>> {
    try {
      const credits = await this.db.credit.findMany({
        where: {
          userId,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        orderBy: [{ expiresAt: 'asc' }, { createdAt: 'asc' }],
      });

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
  }

  /**
   * Add credits to user account
   */
  async addCredits(
    userId: string,
    request: AddCreditRequest
  ): Promise<ServiceResponse<CreditDetails>> {
    try {
      const credit = await this.db.credit.create({
        data: {
          userId,
          amount: request.amount,
          remaining: request.amount,
          type: request.type,
          expiresAt: request.expiresAt,
        },
      });

      return {
        success: true,
        data: {
          id: credit.id,
          amount: credit.amount,
          used: credit.used,
          remaining: credit.remaining,
          type: credit.type,
          expiresAt: credit.expiresAt,
          createdAt: credit.createdAt,
        },
      };
    } catch (error) {
      console.error('Error adding credits:', error);
      return {
        success: false,
        error: 'Failed to add credits',
      };
    }
  }

  /**
   * Use credits from user account
   */
  async useCredits(
    userId: string,
    request: UseCreditRequest
  ): Promise<ServiceResponse<CreditBalance>> {
    try {
      const credits = await this.db.credit.findMany({
        where: {
          userId,
          remaining: { gt: 0 },
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        orderBy: [{ expiresAt: 'asc' }, { createdAt: 'asc' }],
      });

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

        await this.db.credit.update({
          where: { id: credit.id },
          data: {
            used: credit.used + deductAmount,
            remaining: credit.remaining - deductAmount,
          },
        });

        remainingToDeduct -= deductAmount;
      }

      return this.getCreditBalance(userId);
    } catch (error) {
      console.error('Error using credits:', error);
      return {
        success: false,
        error: 'Failed to use credits',
      };
    }
  }

  /**
   * List users (admin function)
   */
  async listUsers(options: PaginationOptions = {}): Promise<
    ServiceResponse<{
      users: PublicUser[];
      total: number;
    }>
  > {
    try {
      const {
        limit = 10,
        offset = 0,
        orderBy = 'createdAt',
        orderDirection = 'desc',
      } = options;

      const [users, total] = await Promise.all([
        this.db.user.findMany({
          skip: offset,
          take: limit,
          orderBy: { [orderBy]: orderDirection },
        }),
        this.db.user.count(),
      ]);

      const publicUsers = users.map(this.toPublicUser);

      return {
        success: true,
        data: {
          users: publicUsers,
          total,
        },
      };
    } catch (error) {
      console.error('Error listing users:', error);
      return {
        success: false,
        error: 'Failed to list users',
      };
    }
  }

  /**
   * Convert user to public user (remove sensitive fields)
   */
  private toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      provider: user.provider,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
