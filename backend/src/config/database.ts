import { PrismaClient } from '@prisma/client';
import { config } from './env';

// Singleton instance
let prisma: PrismaClient;

// Create Prisma client with logging configuration
function createPrismaClient() {
  return new PrismaClient({
    log:
      config.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
    errorFormat: config.NODE_ENV === 'development' ? 'pretty' : 'minimal',
  });
}

// Get Prisma client instance
export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = createPrismaClient();
  }
  return prisma;
}

// Database connection helper
export async function connectDatabase(): Promise<void> {
  const client = getPrismaClient();
  try {
    await client.$connect();
    console.info('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

// Database disconnection helper
export async function disconnectDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    console.info('Database disconnected');
  }
}

// Handle process termination
process.on('beforeExit', async () => {
  await disconnectDatabase();
});

// Export the client for direct use
export const db = getPrismaClient();
