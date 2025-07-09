import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { config } from '../config/env';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export function createError(message: string, statusCode: number = 500, code?: string): AppError {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

export async function errorHandler(
  error: FastifyError | AppError | ZodError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  request.log.error(error);

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return reply.status(400).send({
      error: 'Validation Error',
      message: 'Invalid request data',
      details: error.errors,
    });
  }

  // Handle known application errors
  const statusCode = (error as AppError).statusCode || 500;
  const message = error.message || 'Internal Server Error';
  const code = (error as AppError).code || 'INTERNAL_ERROR';

  // Don't expose internal errors in production
  if (config.NODE_ENV === 'production' && statusCode === 500) {
    return reply.status(statusCode).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
      code,
    });
  }

  return reply.status(statusCode).send({
    error: error.name || 'Error',
    message,
    code,
    ...(config.NODE_ENV === 'development' && { stack: error.stack }),
  });
}