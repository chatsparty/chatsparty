import { PrismaClient, AuthProviderType } from '@prisma/client';
import { db } from '../../config/database';
import {
  User,
  UserQueryOptions,
  PaginationOptions,
  RegisterCredentials,
  PublicUser,
} from './types';
import { hashPassword } from '../../utils/crypto';

export const findUserByEmail = async (
  email: string,
  database: PrismaClient = db
): Promise<User | null> => {
  return database.user.findUnique({
    where: { email },
  });
};

export const findUserByProvider = async (
  provider: AuthProviderType,
  providerId: string,
  database: PrismaClient = db
): Promise<User | null> => {
  return database.user.findUnique({
    where: {
      provider_providerId: {
        provider,
        providerId,
      },
    },
  });
};

export const createUser = async (
  credentials: RegisterCredentials,
  database: PrismaClient = db
): Promise<User> => {
  const hashedPassword = await hashPassword(credentials.password);
  const user = await database.user.create({
    data: {
      email: credentials.email,
      password: hashedPassword,
      name: credentials.name,
      provider: 'LOCAL',
    },
  });

  await database.credit.create({
    data: {
      userId: user.id,
      amount: 100,
      remaining: 100,
      type: 'bonus',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  return user;
};

export const createGoogleUser = async (
  email: string,
  name: string | undefined,
  providerId: string,
  database: PrismaClient = db
): Promise<User> => {
  const user = await database.user.create({
    data: {
      email,
      name: name || '',
      provider: AuthProviderType.GOOGLE,
      providerId,
      isVerified: true,
    },
  });

  await database.credit.create({
    data: {
      userId: user.id,
      amount: 100,
      remaining: 100,
      type: 'bonus',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  return user;
};

export const updateUserProvider = async (
  userId: string,
  provider: AuthProviderType,
  providerId: string,
  database: PrismaClient = db
): Promise<User> => {
  return database.user.update({
    where: { id: userId },
    data: {
      provider,
      providerId,
      isVerified: true,
    },
  });
};

export const findUserById = async (
  userId: string,
  options: UserQueryOptions = {},
  database: PrismaClient = db
): Promise<User | null> => {
  return database.user.findUnique({
    where: { id: userId },
    include: {
      credits: options.includeCredits || false,
      agents: options.includeAgents || false,
      connections: options.includeConnections || false,
    },
  });
};

export const updateUser = async (
  userId: string,
  data: { name?: string; email?: string },
  database: PrismaClient = db
): Promise<User> => {
  return database.user.update({
    where: { id: userId },
    data,
  });
};

export const updateUserPassword = async (
  userId: string,
  password_hash: string,
  database: PrismaClient = db
): Promise<User> => {
  return database.user.update({
    where: { id: userId },
    data: { password: password_hash },
  });
};

export const deleteUser = async (
  userId: string,
  database: PrismaClient = db
): Promise<void> => {
  await database.user.delete({
    where: { id: userId },
  });
};

export const listUsers = async (
  options: PaginationOptions = {},
  database: PrismaClient = db
): Promise<{ users: User[]; total: number }> => {
  const {
    limit = 10,
    offset = 0,
    orderBy = 'createdAt',
    orderDirection = 'desc',
  } = options;

  const [users, total] = await Promise.all([
    database.user.findMany({
      skip: offset,
      take: limit,
      orderBy: { [orderBy]: orderDirection },
    }),
    database.user.count(),
  ]);

  return { users, total };
};

export const toPublicUser = (user: User): PublicUser => {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    provider: user.provider,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};
