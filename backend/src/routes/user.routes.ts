import { FastifyPluginAsync } from 'fastify';
import { authenticate } from '../middleware/auth';
import { UserService } from '../services/user/user.service';
import { withValidation } from '../utils/validation';
import {
  registerSchema,
  loginSchema,
  // Note: Following schema imports removed as they are not used in route handlers
  // updateUserSchema,
  // changePasswordSchema,
  // addCreditSchema,
  // useCreditSchema,
  // userIdSchema,
  // paginationSchema,
} from '../services/user/user.validation';

// User routes plugin
const userRoutes: FastifyPluginAsync = async (fastify) => {
  const userService = new UserService();

  // Register new user
  fastify.post(
    '/register',
    {
      schema: {
        description: 'Register a new user',
        tags: ['Users'],
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
              id: { type: 'string' },
              email: { type: 'string' },
              token: { type: 'string' },
              createdAt: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const result = await userService.register(request.body);

      if (!result.success) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: result.error,
        });
      }

      return reply.status(201).send(result.data);
    }
  );

  // Login user
  fastify.post(
    '/login',
    {
      schema: {
        description: 'Login user',
        tags: ['Users'],
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
              id: { type: 'string' },
              email: { type: 'string' },
              token: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const result = await userService.login(request.body);

      if (!result.success) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: result.error,
        });
      }

      return reply.send(result.data);
    }
  );

  // Get current user
  fastify.get(
    '/me',
    {
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

  // Update current user
  fastify.patch(
    '/me',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const result = await userService.updateUser(request.user!.userId, request.body);

      if (!result.success) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: result.error,
        });
      }

      return reply.send(result.data);
    }
  );

  // Change password
  fastify.post(
    '/me/change-password',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const { currentPassword, newPassword } = request.body;
      const result = await userService.changePassword(
        request.user!.userId,
        currentPassword,
        newPassword
      );

      if (!result.success) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: result.error,
        });
      }

      return reply.send({ message: 'Password changed successfully' });
    }
  );

  // Get credit balance
  fastify.get(
    '/me/credits',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const result = await userService.getCreditBalance(request.user!.userId);

      if (!result.success) {
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: result.error,
        });
      }

      return reply.send(result.data);
    }
  );

  // Add credits (admin only - for now just allow self)
  fastify.post(
    '/me/credits',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const result = await userService.addCredits(request.user!.userId, request.body);

      if (!result.success) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: result.error,
        });
      }

      return reply.status(201).send(result.data);
    }
  );

  // Use credits
  fastify.post(
    '/me/credits/use',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const result = await userService.useCredits(request.user!.userId, request.body);

      if (!result.success) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: result.error,
        });
      }

      return reply.send(result.data);
    }
  );

  // Delete current user
  fastify.delete(
    '/me',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const result = await userService.deleteUser(request.user!.userId);

      if (!result.success) {
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: result.error,
        });
      }

      return reply.status(204).send();
    }
  );

  // Get user by ID (admin route - for now allow viewing own profile only)
  fastify.get(
    '/:id',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const { id } = request.params;

      // Only allow users to view their own profile for now
      if (id !== request.user!.userId) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'You can only view your own profile',
        });
      }

      const result = await userService.getUserById(id);

      if (!result.success) {
        return reply.status(404).send({
          error: 'Not Found',
          message: result.error,
        });
      }

      return reply.send(result.data);
    }
  );

  // List users (admin route - disabled for now)
  fastify.get(
    '/',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      // TODO: Add admin check
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Admin access required',
      });

      // const result = await userService.listUsers(request.query);
      // if (!result.success) {
      //   return reply.status(500).send({
      //     error: 'Internal Server Error',
      //     message: result.error,
      //   });
      // }
      // return reply.send(result.data);
    }
  );

  // Get user's agents
  fastify.get(
    '/:id/agents',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const { id } = request.params;

      // Only allow users to view their own agents
      if (id !== request.user!.userId) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'You can only view your own agents',
        });
      }

      const result = await userService.getUserById(id, { includeAgents: true });

      if (!result.success) {
        return reply.status(404).send({
          error: 'Not Found',
          message: result.error,
        });
      }

      // Extract only agents from the result
      const agents = (result.data as any).agents || [];
      return reply.send(agents);
    }
  );
};

export default userRoutes;