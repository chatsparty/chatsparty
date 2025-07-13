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

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
) {
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

    const decoded = jwt.verify(token, config.JWT_SECRET) as JWTPayload;

    const user = await db.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'User not found',
      });
    }

    request.user = decoded;
  } catch (_error) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Invalid token',
    });
  }
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN as string,
  });
}

export async function optionalAuthenticate(
  request: FastifyRequest,
  _reply: FastifyReply
) {
  const authHeader = request.headers.authorization;

  if (!authHeader) {
    return;
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, config.JWT_SECRET) as JWTPayload;
    request.user = decoded;
  } catch (_error) {
    request.user = undefined;
  }
}
