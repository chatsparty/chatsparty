import userRoutes from './user.routes';
import authRoutes from './auth.routes';
import { FastifyPluginAsync } from 'fastify';

const userPlugin: FastifyPluginAsync = async fastify => {
  fastify.register(authRoutes, { prefix: '/auth' });
  fastify.register(userRoutes, { prefix: '/users' });
};

export default userPlugin;
