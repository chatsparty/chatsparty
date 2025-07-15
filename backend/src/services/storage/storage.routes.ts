import { FastifyInstance, FastifyRequest } from 'fastify';
import { authenticate } from '../../middleware/auth';
import { storageService } from '.';
import { FILE_SIZE_LIMITS } from './storage.validation';

/**
 * Storage routes
 */
export async function storageRoutes(fastify: FastifyInstance) {
  await fastify.register(import('@fastify/multipart'), {
    limits: {
      fileSize: FILE_SIZE_LIMITS.DEFAULT,
      files: 1,
    },
  });

  /**
   * Upload a file
   */
  fastify.post(
    '/storage/upload',
    {
      schema: {
        description: 'Upload a file to storage',
        tags: ['Storage'],
        security: [{ bearerAuth: [] }],
        consumes: ['multipart/form-data'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  filename: { type: 'string' },
                  url: { type: 'string' },
                  size: { type: 'number' },
                  mimetype: { type: 'string' },
                },
              },
            },
          },
        },
      },
      preHandler: authenticate,
    },
    async (request: FastifyRequest, reply) => {
      const user = request.user!;
      const data = await request.file();

      if (!data) {
        return reply.code(400).send({ message: 'No file uploaded' });
      }

      try {
        const file = {
          size: data.file.bytesRead,
          mimetype: data.mimetype,
          originalname: data.filename,
        };

        storageService.validateFile(file, {
          maxSize: FILE_SIZE_LIMITS.DEFAULT,
        });

        const chunks: Buffer[] = [];
        for await (const chunk of data.file) {
          chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);

        const result = await storageService.uploadUserFile(
          (user as any).id,
          data.filename,
          buffer,
          {
            contentType: data.mimetype,
          }
        );

        return result;
      } catch (error: any) {
        fastify.log.error('File upload error:', error);
        return reply.code(400).send({ message: error.message });
      }
    }
  );

  /**
   * Upload a project file
   */
  fastify.post<{
    Params: { projectId: string };
  }>(
    '/storage/projects/:projectId/upload',
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const { projectId } = request.params;

      const data = await request.file();

      if (!data) {
        return reply.code(400).send({ message: 'No file uploaded' });
      }

      try {
        const file = {
          size: data.file.bytesRead,
          mimetype: data.mimetype,
          originalname: data.filename,
        };

        storageService.validateFile(file, {
          maxSize: FILE_SIZE_LIMITS.DEFAULT,
        });

        const chunks: Buffer[] = [];
        for await (const chunk of data.file) {
          chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);

        const result = await storageService.uploadProjectFile(
          projectId,
          data.filename,
          buffer,
          {
            contentType: data.mimetype,
          }
        );

        return result;
      } catch (error: any) {
        fastify.log.error('Project file upload error:', error);
        return reply.code(400).send({ message: error.message });
      }
    }
  );

  /**
   * Download a file
   */
  fastify.get<{
    Params: { key: string };
    Querystring: { inline?: boolean };
  }>(
    '/storage/download/:key',
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const { key } = request.params;
      const { inline } = request.query;

      try {
        const { body, metadata } = await storageService.download(key);

        reply.header('Content-Type', metadata.contentType);
        reply.header('Content-Length', metadata.size.toString());

        if (!inline) {
          reply.header(
            'Content-Disposition',
            `attachment; filename="${metadata.filename}"`
          );
        }

        if (metadata.etag) {
          reply.header('ETag', metadata.etag);
        }

        return reply.send(body);
      } catch (error: any) {
        fastify.log.error('File download error:', error);
        return reply.code(404).send({ message: 'File not found' });
      }
    }
  );

  /**
   * Get file metadata
   */
  fastify.get<{
    Params: { key: string };
  }>(
    '/storage/metadata/:key',
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const { key } = request.params;

      try {
        const exists = await storageService.exists(key);
        if (!exists) {
          return reply.code(404).send({ message: 'File not found' });
        }

        const { metadata } = await storageService.download(key);
        return metadata;
      } catch (error: any) {
        fastify.log.error('Get metadata error:', error);
        return reply.code(500).send({ message: 'Failed to get file metadata' });
      }
    }
  );

  /**
   * Delete a file
   */
  fastify.delete<{
    Params: { key: string };
  }>(
    '/storage/:key',
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const { key } = request.params;

      try {
        await storageService.delete(key);
        return { message: 'File deleted successfully' };
      } catch (error: any) {
        fastify.log.error('File deletion error:', error);
        return reply.code(500).send({ message: 'Failed to delete file' });
      }
    }
  );

  /**
   * List files
   */
  fastify.get<{
    Querystring: {
      prefix?: string;
      maxKeys?: number;
      continuationToken?: string;
      delimiter?: string;
    };
  }>(
    '/storage/list',
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const user = request.user!;

      const prefix = request.query.prefix || `users/${(user as any).id}/`;

      try {
        const result = await storageService.list({
          ...request.query,
          prefix,
        });

        return result;
      } catch (error: any) {
        fastify.log.error('List files error:', error);
        return reply.code(500).send({ message: 'Failed to list files' });
      }
    }
  );

  /**
   * Get signed URL
   */
  fastify.post<{
    Body: {
      key: string;
      operation: 'get' | 'put';
      expiresIn?: number;
    };
  }>(
    '/storage/signed-url',
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const { key, operation, expiresIn = 3600 } = request.body;

      try {
        const url = await storageService.getSignedUrl(
          key,
          operation,
          expiresIn
        );
        const expiresAt = new Date(Date.now() + expiresIn * 1000);

        return { url, expiresAt };
      } catch (error: any) {
        fastify.log.error('Get signed URL error:', error);
        return reply
          .code(500)
          .send({ message: 'Failed to generate signed URL' });
      }
    }
  );

  /**
   * Get user storage usage
   */
  fastify.get(
    '/storage/usage',
    {
      preHandler: authenticate,
    },
    async (request: FastifyRequest, reply) => {
      const user = request.user!;

      try {
        const usage = await storageService.getUserStorageUsage(
          (user as any).id
        );

        const formattedSize = formatFileSize(usage.totalSize);

        return {
          ...usage,
          formattedSize,
        };
      } catch (error: any) {
        fastify.log.error('Get storage usage error:', error);
        return reply.code(500).send({ message: 'Failed to get storage usage' });
      }
    }
  );
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
