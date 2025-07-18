import { FastifyPluginAsync } from 'fastify';
import { authenticate } from '../../middleware/auth';
import {
  registerUser,
  loginUser,
  getUserById,
  updateUserService,
  changePassword,
  deleteUserService,
} from '../../domains/user/orchestration';
import {
  RegisterInput,
  LoginInput,
  UpdateUserInput,
  ChangePasswordInput,
  AddCreditInput,
  UseCreditInput,
} from '../../domains/user/validation';
import {
  getCreditBalance,
  addCredits,
  useCredits,
} from '../../domains/credit/orchestration/credit.orchestration';
import { TransactionReason, TransactionType } from '../../domains/credit/types';

const userRoutes: FastifyPluginAsync = async fastify => {
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
      const result = await registerUser(request.body as RegisterInput);

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
      const result = await loginUser(request.body as LoginInput);

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
      const result = await getUserById(request.user!.userId, {
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
      const result = await updateUserService(
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
      const result = await changePassword(
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
      const result = await getCreditBalance(request.user!.userId);

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
      const { amount, type, expiresAt } = request.body as AddCreditInput;
      
      // Map input type to TransactionType enum
      const transactionTypeMap: Record<string, TransactionType> = {
        'subscription': TransactionType.SUBSCRIPTION,
        'topup': TransactionType.TOPUP,
        'bonus': TransactionType.BONUS
      };
      
      const result = await addCredits(request.user!.userId, {
        userId: request.user!.userId,
        amount,
        transactionType: transactionTypeMap[type] || TransactionType.TOPUP,
        reason: TransactionReason.MANUAL_ADJUSTMENT,
        description: `Manual credit addition: ${type}`,
        ...(expiresAt && { expiresAt }),
      });

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
      const { amount, description } = request.body as UseCreditInput;
      const result = await useCredits(request.user!.userId, {
        userId: request.user!.userId,
        amount,
        reason: TransactionReason.AI_CHAT,
        description: description || 'Credit usage',
      });

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
      const result = await deleteUserService(request.user!.userId);

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

      const result = await getUserById(id);

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

      const result = await getUserById(id, { includeAgents: true });

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
