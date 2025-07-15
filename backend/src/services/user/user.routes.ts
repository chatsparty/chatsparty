import { FastifyPluginAsync } from 'fastify';
import { authenticate } from '../../middleware/auth';
import { UserService } from './user.service';
import {
  RegisterInput,
  LoginInput,
  UpdateUserInput,
  ChangePasswordInput,
  AddCreditInput,
  UseCreditInput,
} from './user.validation';

const userRoutes: FastifyPluginAsync = async fastify => {
  const userService = new UserService();

  fastify.post<{ Body: RegisterInput }>(
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
      const result = await userService.register(request.body as RegisterInput);

      if (!result.success) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: result.error,
        });
      }

      return reply.status(201).send(result.data);
    }
  );

  fastify.post<{ Body: LoginInput }>(
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
      const result = await userService.login(request.body as LoginInput);

      if (!result.success) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: result.error,
        });
      }

      return reply.send(result.data);
    }
  );

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

  fastify.patch<{ Body: UpdateUserInput }>(
    '/me',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const result = await userService.updateUser(
        request.user!.userId,
        request.body as UpdateUserInput
      );

      if (!result.success) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: result.error,
        });
      }

      return reply.send(result.data);
    }
  );

  fastify.post<{ Body: ChangePasswordInput }>(
    '/me/change-password',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const { currentPassword, newPassword } =
        request.body as ChangePasswordInput;
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

  fastify.post<{ Body: AddCreditInput }>(
    '/me/credits',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const result = await userService.addCredits(
        request.user!.userId,
        request.body as AddCreditInput
      );

      if (!result.success) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: result.error,
        });
      }

      return reply.status(201).send(result.data);
    }
  );

  fastify.post<{ Body: UseCreditInput }>(
    '/me/credits/use',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const result = await userService.useCredits(
        request.user!.userId,
        request.body as UseCreditInput
      );

      if (!result.success) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: result.error,
        });
      }

      return reply.send(result.data);
    }
  );

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

  fastify.get<{ Params: { id: string } }>(
    '/:id',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

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

  fastify.get(
    '/',
    {
      preHandler: [authenticate],
    },
    async (_request, reply) => {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Admin access required',
      });
    }
  );

  fastify.get<{ Params: { id: string } }>(
    '/:id/agents',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

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

      const agents = (result.data as any).agents || [];
      return reply.send(agents);
    }
  );
};

export default userRoutes;
