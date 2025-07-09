import { FastifyPluginAsync } from 'fastify';
import jwt from 'jsonwebtoken';
import { authenticate, generateToken, JWTPayload } from '../middleware/auth';
import { UserService } from '../services/user/user.service';
import { withValidation } from '../utils/validation';
import { config } from '../config/env';
import { db } from '../config/database';
import {
  registerSchema,
  loginSchema,
  RegisterInput,
  LoginInput,
} from '../services/user/user.validation';

// Auth routes plugin - provides aliases to user service methods
const authRoutes: FastifyPluginAsync = async (fastify) => {
  const userService = new UserService();

  // Register new user - maps to user service register
  fastify.post(
    '/register',
    {
      schema: {
        description: 'Register a new user',
        tags: ['Authentication'],
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 6 },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              access_token: { type: 'string' },
              refresh_token: { type: 'string' },
              token_type: { type: 'string' },
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  createdAt: { type: 'string' },
                  updatedAt: { type: 'string' },
                },
              },
            },
          },
          400: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const result = await userService.register(request.body as RegisterInput);

      if (!result.success) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: result.error,
        });
      }

      // Transform response to match frontend expectations
      return reply.status(201).send({
        access_token: result.data.token,
        refresh_token: result.data.token, // Using same token for both (simplified)
        token_type: 'bearer',
        user: result.data.user,
      });
    }
  );

  // Login user - maps to user service login
  fastify.post(
    '/login',
    {
      schema: {
        description: 'Login user',
        tags: ['Authentication'],
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              access_token: { type: 'string' },
              refresh_token: { type: 'string' },
              token_type: { type: 'string' },
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  createdAt: { type: 'string' },
                  updatedAt: { type: 'string' },
                },
              },
            },
          },
          401: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const result = await userService.login(request.body as LoginInput);

      if (!result.success) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: result.error,
        });
      }

      // Transform response to match frontend expectations
      return reply.send({
        access_token: result.data.token,
        refresh_token: result.data.token, // Using same token for both (simplified)
        token_type: 'bearer',
        user: result.data.user,
      });
    }
  );

  // Get current user - maps to user service getUserById
  fastify.get(
    '/me',
    {
      schema: {
        description: 'Get current user information',
        tags: ['Authentication'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              email: { type: 'string' },
              createdAt: { type: 'string' },
              updatedAt: { type: 'string' },
              credits: {
                type: 'object',
                properties: {
                  balance: { type: 'number' },
                  spent: { type: 'number' },
                },
              },
            },
          },
          404: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const result = await userService.getUserById(request.user!.userId, {
        includeCredits: true,
      });

      if (!result.success) {
        return reply.status(404).send({
          error: 'Not Found',
          message: result.error,
        });
      }

      return reply.send(result.data);
    }
  );

  // Token refresh endpoint - accepts refresh_token in body
  fastify.post(
    '/refresh',
    async (request, reply) => {
      try {
        const body = request.body as any;
        const refreshToken = body.refresh_token;

        if (!refreshToken) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'Refresh token is required',
          });
        }

        // Verify the refresh token (same as access token for now)
        const decoded = jwt.verify(refreshToken, config.JWT_SECRET) as JWTPayload;

        // Check if user still exists
        const user = await db.user.findUnique({
          where: { id: decoded.userId },
        });

        if (!user) {
          return reply.status(401).send({
            error: 'Unauthorized',
            message: 'User not found',
          });
        }

        // Generate new tokens
        const newToken = generateToken({
          userId: decoded.userId,
          email: decoded.email,
        });

        return reply.send({
          access_token: newToken,
          refresh_token: newToken, // Using same token for both (simplified)
          token_type: 'bearer',
        });
      } catch (error) {
        console.error('Error refreshing token:', error);
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Invalid refresh token',
        });
      }
    }
  );
};

export default authRoutes;