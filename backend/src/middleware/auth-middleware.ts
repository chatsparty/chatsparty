import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from './auth';

export interface AuthMiddlewareOptions {
  requireAuth?: boolean;
  permissions?: string[];
  roles?: string[];
}


/**
 * Helper function to apply auth middleware directly to a fastify instance
 * Usage: await applyAuthMiddleware(fastify, { requireAuth: true })
 */
export async function applyAuthMiddleware(
  fastify: FastifyInstance,
  options: AuthMiddlewareOptions = {}
) {
  const { requireAuth = true, permissions = [], roles = [] } = options;

  // Add preHandler hook directly to this fastify instance
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip auth if not required
    if (!requireAuth) {
      return;
    }

    // Perform authentication
    try {
      await authenticate(request, reply);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication failed';
      return reply.status(401).send({
        error: 'Unauthorized',
        message,
      });
    }

    // Perform authorization checks if specified
    if (permissions.length > 0 || roles.length > 0) {
      const user = request.user;
      
      if (!user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
      }

      // Here you can add additional authorization logic
      // For example, checking user roles or permissions
      // This would typically involve querying the database for user roles/permissions
      
      // Example authorization check (customize based on your needs):
      // if (roles.length > 0) {
      //   const userRoles = await getUserRoles(user.userId);
      //   const hasRequiredRole = roles.some(role => userRoles.includes(role));
      //   if (!hasRequiredRole) {
      //     return reply.status(403).send({
      //       error: 'Forbidden',
      //       message: 'Insufficient permissions',
      //     });
      //   }
      // }
    }
  });
}

/**
 * Pre-configured middleware for common scenarios
 */
export const authMiddlewares = {
  // Requires authentication only
  requireAuth: (fastify: FastifyInstance) => 
    applyAuthMiddleware(fastify, { requireAuth: true }),
  
  // Optional authentication
  optionalAuth: (fastify: FastifyInstance) => 
    applyAuthMiddleware(fastify, { requireAuth: false }),
  
  // Admin only
  requireAdmin: (fastify: FastifyInstance) => 
    applyAuthMiddleware(fastify, { requireAuth: true, roles: ['admin'] }),
  
  // Custom permissions
  requirePermissions: (permissions: string[]) => (fastify: FastifyInstance) =>
    applyAuthMiddleware(fastify, { requireAuth: true, permissions }),
};