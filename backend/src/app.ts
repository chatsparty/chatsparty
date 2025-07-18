import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import auth from '@fastify/auth';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { config } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';
import { HttpError } from './utils/http-error';
import { ZodError } from 'zod';
import { authenticate } from './middleware/auth';
import { applyAuthMiddleware } from './middleware/auth-middleware';
import userRoutes from './services/user/user.routes';
import authRoutes from './services/user/auth.routes';
import agentRoutes from './routes/agents/agent.routes';
import connectionRoutes, { systemDefaultRoutes } from './routes/connections/connection.routes';
import { creditRoutes } from './routes/credit';
import { storageRoutes } from './routes/storage/storage.routes';
import { conversationRoutes } from './routes/conversations';
import { marketplaceRoutes } from './routes/marketplace';
import { websocketService } from './services/websocket/websocket.service';
import { setupChatHandlers } from './services/websocket/chat.handlers';

const app = Fastify({
  logger: {
    level: config.LOG_LEVEL || 'info',
    transport:
      config.NODE_ENV === 'development'
        ? {
            target: 'pino-pretty',
            options: {
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
            },
          }
        : undefined,
  },
});

async function registerPlugins() {
  await app.register(swagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'ChatsParty API',
        description: 'API documentation for ChatsParty system',
        version: '1.0.0',
      },
      servers: [
        {
          url: 'http://localhost:4000',
          description: 'Development server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      security: [{ bearerAuth: [] }],
    },
  });

  await app.register(swaggerUI, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'none',
      deepLinking: false,
    },
    uiHooks: {
      onRequest: function (_request, _reply, next) {
        next();
      },
      preHandler: function (_request, _reply, next) {
        next();
      },
    },
    staticCSP: true,
    transformStaticCSP: header => header,
    transformSpecificationClone: true,
  });

  await app.register(helmet, {
    contentSecurityPolicy: false,
  });

  const corsOrigins = config.CORS_ORIGIN
    ? config.CORS_ORIGIN.split(',').map(origin => origin.trim())
    : true;

  await app.register(cors, {
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  await app.register(auth);
  app.decorate('verifyJWT', authenticate);
}

const apiRoutes = async (fastify: FastifyInstance) => {
  await applyAuthMiddleware(fastify, { requireAuth: true });
  await fastify.register(userRoutes, { prefix: '/users' });
  await fastify.register(agentRoutes, { prefix: '/agents' });
  await fastify.register(connectionRoutes, { prefix: '/connections' });
  await fastify.register(creditRoutes, { prefix: '/credits' });
  await fastify.register(storageRoutes);
  await fastify.register(conversationRoutes);
  await fastify.register(marketplaceRoutes);
};

async function registerRoutes() {
  app.get(
    '/health',
    {
      schema: {
        description: 'Health check endpoint',
        tags: ['Health'],
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    async (_request, _reply) => {
      return { status: 'ok', timestamp: new Date().toISOString() };
    }
  );

  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(systemDefaultRoutes);
  await app.register(apiRoutes);
}

async function start() {
  try {
    await connectDatabase();

    await registerPlugins();
    await registerRoutes();

    app.setErrorHandler((error, request, reply) => {
      if (error instanceof ZodError) {
        reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: error.flatten(),
        });
      } else if (error instanceof HttpError) {
        request.log.warn(error);
        reply.status(error.statusCode).send({
          statusCode: error.statusCode,
          error: error.name,
          message: error.message,
        });
      } else {
        request.log.error(error);
        reply.status(500).send({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'An unexpected error occurred',
        });
      }
    });

    const port = config.PORT || 4000;
    const host = config.HOST || '0.0.0.0';

    await app.listen({ port, host });
    console.info(`Server listening on http://${host}:${port}`);

    const server = app.server;
    const io = websocketService.initializeSocketIO(server);

    io.on('connection', socket => {
      setupChatHandlers(socket);
    });

    console.info('Socket.IO server initialized');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  app.log.info('SIGINT signal received: closing HTTP server');
  await app.close();
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  app.log.info('SIGTERM signal received: closing HTTP server');
  await app.close();
  await disconnectDatabase();
  process.exit(0);
});

start();
