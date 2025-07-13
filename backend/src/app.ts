import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import auth from '@fastify/auth';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { config } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';
import { errorHandler } from './middleware/error';
import { authenticate } from './middleware/auth';
import userRoutes from './routes/user.routes';
import authRoutes from './routes/auth.routes';
import { agentRoutes } from './routes/agent.routes';
import connectionRoutes from './routes/connection.routes';
import creditRoutes from './routes/credit.routes';
import { storageRoutes } from './routes/storage.routes';
import { chatRoutes } from './routes/chat.routes';
import defaultConnectionRoutes from './routes/default-connection.routes';
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

// Register plugins
async function registerPlugins() {
  // Swagger documentation
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
    },
  });

  await app.register(swaggerUI, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'none',
      deepLinking: false,
    },
    uiHooks: {
      onRequest: function (request, reply, next) {
        next();
      },
      preHandler: function (request, reply, next) {
        next();
      },
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
    transformSpecification: (swaggerObject, request, reply) => {
      return swaggerObject;
    },
    transformSpecificationClone: true,
  });

  // Security headers
  await app.register(helmet, {
    contentSecurityPolicy: false, // Configure as needed
  });

  // CORS
  const corsOrigins = config.CORS_ORIGIN 
    ? config.CORS_ORIGIN.split(',').map(origin => origin.trim())
    : true;
    
  await app.register(cors, {
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Authentication
  await app.register(auth);
  app.decorate('verifyJWT', authenticate);
}

// Register routes
async function registerRoutes() {
  // Health check
  app.get('/health', {
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
  }, async (_request, _reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // API routes
  await app.register(userRoutes, { prefix: '/api/users' });
  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(agentRoutes, { prefix: '/api' });
  await app.register(connectionRoutes, { prefix: '/api/connections' });
  await app.register(defaultConnectionRoutes, { prefix: '/api' });
  await app.register(creditRoutes, { prefix: '/api/credits' });
  await app.register(storageRoutes, { prefix: '/api' });
  await app.register(chatRoutes, { prefix: '/api' });
  
  // Frontend compatibility aliases (without /api prefix)
  await app.register(connectionRoutes, { prefix: '/connections' });
  await app.register(defaultConnectionRoutes, { prefix: '' });
  await app.register(agentRoutes, { prefix: '/chat' });
}

// Start server
async function start() {
  try {
    // Connect to database
    await connectDatabase();

    await registerPlugins();
    await registerRoutes();

    // Set error handler
    app.setErrorHandler(errorHandler);

    const port = config.PORT || 4000;
    const host = config.HOST || '0.0.0.0';

    await app.listen({ port, host });
    console.info(`Server listening on http://${host}:${port}`);

    // Initialize Socket.IO after server is listening
    const server = app.server;
    const io = websocketService.initializeSocketIO(server);
    
    // Setup chat handlers for each connection
    io.on('connection', (socket) => {
      setupChatHandlers(socket);
    });
    
    console.info('Socket.IO server initialized');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

// Handle graceful shutdown
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

// Start the server
start();