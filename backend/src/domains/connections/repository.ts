import { Prisma, PrismaClient, Connection } from '@prisma/client';
import { db } from '../../config/database';
import { ConnectionQueryOptions, PaginationOptions } from './types';

export class ConnectionRepository {
  private db: PrismaClient;

  constructor(database?: PrismaClient) {
    this.db = database || db;
  }

  async create(data: Prisma.ConnectionCreateInput): Promise<Connection> {
    return this.db.connection.create({ data });
  }

  async update(
    connectionId: string,
    data: Prisma.ConnectionUpdateInput
  ): Promise<Connection> {
    return this.db.connection.update({
      where: { id: connectionId },
      data,
    });
  }

  async delete(connectionId: string): Promise<void> {
    await this.db.connection.delete({
      where: { id: connectionId },
    });
  }

  async findById(connectionId: string): Promise<Connection | null> {
    return this.db.connection.findUnique({
      where: { id: connectionId },
    });
  }

  async findUserConnection(
    userId: string,
    connectionId: string,
    prisma?: Prisma.TransactionClient
  ): Promise<Connection | null> {
    const client = prisma || this.db;
    return client.connection.findFirst({
      where: { id: connectionId, userId },
    });
  }

  async findFirst(
    userId: string,
    provider: string
  ): Promise<Connection | null> {
    return this.db.connection.findFirst({
      where: { userId, provider, isActive: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findByName(
    userId: string,
    name: string,
    connectionId?: string
  ): Promise<Connection | null> {
    const where: Prisma.ConnectionWhereInput = { userId, name };
    if (connectionId) {
      where.NOT = { id: connectionId };
    }
    return this.db.connection.findFirst({ where });
  }

  async getCount(userId: string, provider: string): Promise<number> {
    return this.db.connection.count({
      where: { userId, provider },
    });
  }

  async findMany(
    userId: string,
    options: ConnectionQueryOptions & PaginationOptions
  ): Promise<[Connection[], number]> {
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
      this.db.connection.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { [orderBy]: orderDirection },
      }),
      this.db.connection.count({ where }),
    ]);
  }

  async findAlternativeDefault(
    userId: string,
    provider: string,
    connectionId: string
  ): Promise<Connection | null> {
    return this.db.connection.findFirst({
      where: {
        userId,
        provider,
        isActive: true,
        NOT: { id: connectionId },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findUserDefault(
    userId: string,
    provider: string
  ): Promise<Connection | null> {
    return this.db.connection.findFirst({
      where: { userId, provider, isDefault: true, isActive: true },
    });
  }

  async setUserDefault(connectionId: string): Promise<Connection> {
    const connection = await this.findById(connectionId);
    if (!connection) {
      throw new Error('Connection not found');
    }

    await this.db.$transaction([
      this.db.connection.updateMany({
        where: {
          userId: connection.userId,
          provider: connection.provider,
          isDefault: true,
          NOT: { id: connectionId },
        },
        data: { isDefault: false },
      }),
      this.db.connection.update({
        where: { id: connectionId },
        data: { isDefault: true },
      }),
    ]);

    return this.findById(connectionId).then(c => c!);
  }
}
