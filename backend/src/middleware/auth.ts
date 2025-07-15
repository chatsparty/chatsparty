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
  _reply: FastifyReply
) {
  const authHeader = request.headers.authorization;

  if (!authHeader) {
    throw new Error('No authorization header provided');
  }

  const token = authHeader.replace('Bearer ', '');

  if (!token) {
    throw new Error('No token provided');
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as JWTPayload;

    const user = await db.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    request.user = decoded;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw error;
  }
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN,
  } as jwt.SignOptions);
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
