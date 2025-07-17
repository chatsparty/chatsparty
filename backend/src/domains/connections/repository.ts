import { Prisma, PrismaClient, Connection } from '@prisma/client';
import { db } from '../../config/database';
import { ConnectionQueryOptions, PaginationOptions } from './types';

export const create = async (
  data: Prisma.ConnectionCreateInput
): Promise<Connection> => {
  return db.connection.create({ data });
};

export const update = async (
  connectionId: string,
  data: Prisma.ConnectionUpdateInput
): Promise<Connection> => {
  return db.connection.update({
    where: { id: connectionId },
    data,
  });
};

export const deleteConnection = async (connectionId: string): Promise<void> => {
  await db.connection.delete({
    where: { id: connectionId },
  });
};

export const findById = async (
  connectionId: string
): Promise<Connection | null> => {
  return db.connection.findUnique({
    where: { id: connectionId },
  });
};

export const findUserConnection = async (
  userId: string,
  connectionId: string,
  prisma?: Prisma.TransactionClient
): Promise<Connection | null> => {
  const client = prisma || db;
  return client.connection.findFirst({
    where: { id: connectionId, userId },
  });
};

export const findFirst = async (
  userId: string,
  provider: string
): Promise<Connection | null> => {
  return db.connection.findFirst({
    where: { userId, provider, isActive: true },
    orderBy: { createdAt: 'asc' },
  });
};

export const findByName = async (
  userId: string,
  name: string,
  connectionId?: string
): Promise<Connection | null> => {
  const where: Prisma.ConnectionWhereInput = { userId, name };
  if (connectionId) {
    where.NOT = { id: connectionId };
  }
  return db.connection.findFirst({ where });
};

export const getCount = async (
  userId: string,
  provider: string
): Promise<number> => {
  return db.connection.count({
    where: { userId, provider },
  });
};

export const findMany = async (
  userId: string,
  options: ConnectionQueryOptions & PaginationOptions
): Promise<[Connection[], number]> => {
  const {
    includeInactive = false,
    provider,
    onlyDefaults = false,
    limit = 10,
    offset = 0,
    orderBy = 'createdAt',
    orderDirection = 'desc',
  } = options;

  const where: Prisma.ConnectionWhereInput = { userId };

  if (!includeInactive) {
    where.isActive = true;
  }

  if (provider) {
    where.provider = provider;
  }

  if (onlyDefaults) {
    where.isDefault = true;
  }

  return Promise.all([
    db.connection.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: { [orderBy]: orderDirection },
    }),
    db.connection.count({ where }),
  ]);
};

export const findAlternativeDefault = async (
  userId: string,
  provider: string,
  connectionId: string
): Promise<Connection | null> => {
  return db.connection.findFirst({
    where: {
      userId,
      provider,
      isActive: true,
      NOT: { id: connectionId },
    },
    orderBy: { createdAt: 'asc' },
  });
};

export const findUserDefault = async (
  userId: string,
  provider: string
): Promise<Connection | null> => {
  return db.connection.findFirst({
    where: { userId, provider, isDefault: true, isActive: true },
  });
};

export const setUserDefault = async (
  connectionId: string
): Promise<Connection> => {
  const connection = await findById(connectionId);
  if (!connection) {
    throw new Error('Connection not found');
  }

  await db.$transaction([
    db.connection.updateMany({
      where: {
        userId: connection.userId,
        provider: connection.provider,
        isDefault: true,
        NOT: { id: connectionId },
      },
      data: { isDefault: false },
    }),
    db.connection.update({
      where: { id: connectionId },
      data: { isDefault: true },
    }),
  ]);

  return findById(connectionId).then(c => c!);
};
