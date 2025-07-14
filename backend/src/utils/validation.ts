import { FastifyRequest, FastifyReply, RouteHandlerMethod } from 'fastify';
import { ZodSchema } from 'zod';

interface ValidationSchemas {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
}

/**
 * Wraps a route handler with Zod validation
 */
export function withValidation(
  schemas: ValidationSchemas,
  handler: RouteHandlerMethod
): RouteHandlerMethod {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Validate body
      if (schemas.body) {
        const validation = schemas.body.safeParse(request.body);
        if (!validation.success) {
          return reply.status(400).send({
            error: 'Validation Error',
            message: validation.error.errors[0].message,
            details: validation.error.errors,
          });
        }
        request.body = validation.data;
      }

      // Validate params
      if (schemas.params) {
        const validation = schemas.params.safeParse(request.params);
        if (!validation.success) {
          return reply.status(400).send({
            error: 'Validation Error',
            message: validation.error.errors[0].message,
            details: validation.error.errors,
          });
        }
        request.params = validation.data;
      }

      // Validate query
      if (schemas.query) {
        const validation = schemas.query.safeParse(request.query);
        if (!validation.success) {
          return reply.status(400).send({
            error: 'Validation Error',
            message: validation.error.errors[0].message,
            details: validation.error.errors,
          });
        }
        request.query = validation.data;
      }

      // Call the actual handler
      return handler.call(this, request, reply);
    } catch (error) {
      return reply.status(500).send({
        error: 'Internal Server Error',
        message:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
      });
    }
  };
}

/**
 * Type-safe request handler with validated inputs
 */
export type ValidatedHandler<TBody = any, TParams = any, TQuery = any> = (
  request: FastifyRequest<{
    Body: TBody;
    Params: TParams;
    Querystring: TQuery;
  }>,
  reply: FastifyReply
) => Promise<any>;

/**
 * Creates route options with validation and other handlers
 */
export function routeOptions(
  schemas: ValidationSchemas = {},
  options: { preHandler?: any[] } = {}
) {
  return {
    preHandler: options.preHandler || [],
    handler: (handler: RouteHandlerMethod) => withValidation(schemas, handler),
  };
}
