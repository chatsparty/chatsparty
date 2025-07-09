import { FastifyReply, FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { db } from '../config/database';

export interface JWTPayload {
  userId: string;
  email: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: JWTPayload;
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'No authorization header provided',
      });
    }

    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'No token provided',
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, config.JWT_SECRET) as JWTPayload;

    // Optionally verify user still exists in database
    const user = await db.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'User not found',
      });
    }

    // Attach user to request
    request.user = decoded;
  } catch (_error) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Invalid token',
    });
  }
}

// Helper to generate JWT token
export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRES_IN });
}

// Optional middleware for routes that optionally use auth
export async function optionalAuthenticate(request: FastifyRequest, _reply: FastifyReply) {
  const authHeader = request.headers.authorization;

  if (!authHeader) {
    return; // No auth provided, continue without user
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, config.JWT_SECRET) as JWTPayload;
    request.user = decoded;
  } catch (_error) {
    // Invalid token, continue without user
    request.user = undefined;
  }
}