import 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    verifyJWT: any;
    auth: any;
  }

  interface FastifyRequest {
    user?: {
      userId: string;
      email: string;
    };
  }
}