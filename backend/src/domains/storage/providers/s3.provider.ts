import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
  GetObjectCommandInput,
  PutObjectCommandInput,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import {
  IStorageProvider,
  FileMetadata,
  UploadOptions,
  DownloadOptions,
  ListOptions,
  ListResult,
} from '../types';

export class S3StorageProvider implements IStorageProvider {
  private client: S3Client;
  private bucket: string;

  constructor(config: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    bucket: string;
    endpoint?: string;
  }) {
    this.client = new S3Client({
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: !!config.endpoint,
    });
    this.bucket = config.bucket;
  }

  async upload(
    key: string,
    body: Buffer | Uint8Array | string | Readable,
    options?: UploadOptions
  ): Promise<FileMetadata> {
    const putObjectParams: PutObjectCommandInput = {
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: options?.contentType,
      Metadata: options?.metadata,
      ACL: options?.acl,
      CacheControl: options?.cacheControl,
      ContentDisposition: options?.contentDisposition,
    };

    await this.client.send(new PutObjectCommand(putObjectParams));

    const metadata = await this.getMetadata(key);

    return metadata;
  }

  async download(
    key: string,
    options?: DownloadOptions
  ): Promise<{
    body: Buffer;
    metadata: FileMetadata;
  }> {
    const getObjectParams: GetObjectCommandInput = {
      Bucket: this.bucket,
      Key: key,
    };

    if (options?.range) {
      const { start, end } = options.range;
      getObjectParams.Range =
        end !== undefined ? `bytes=${start}-${end}` : `bytes=${start}-`;
    }

    const response = await this.client.send(
      new GetObjectCommand(getObjectParams)
    );

    if (!response.Body) {
      throw new Error('No body returned from S3');
    }

    const chunks: Uint8Array[] = [];
    const stream = response.Body as Readable;

    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    const body = Buffer.concat(chunks);

    const metadata: FileMetadata = {
      filename: key.split('/').pop() || key,
      size: response.ContentLength || body.length,
      contentType: response.ContentType || 'application/octet-stream',
      lastModified: response.LastModified || new Date(),
      etag: response.ETag?.replace(/"/g, ''),
      metadata: response.Metadata,
    };

    return { body, metadata };
  }

  async getMetadata(key: string): Promise<FileMetadata> {
    const response = await this.client.send(
      new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
    );

    return {
      filename: key.split('/').pop() || key,
      size: response.ContentLength || 0,
      contentType: response.ContentType || 'application/octet-stream',
      lastModified: response.LastModified || new Date(),
      etag: response.ETag?.replace(/"/g, ''),
      metadata: response.Metadata,
    };
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
    );
  }

  async deleteMany(keys: string[]): Promise<void> {
    if (keys.length === 0) return;

    const batchSize = 1000;

    for (let i = 0; i < keys.length; i += batchSize) {
      const batch = keys.slice(i, i + batchSize);

      await this.client.send(
        new DeleteObjectsCommand({
          Bucket: this.bucket,
          Delete: {
            Objects: batch.map(key => ({ Key: key })),
          },
        })
      );
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.getMetadata(key);
      return true;
    } catch (error: any) {
      if (
        error.name === 'NotFound' ||
        error.$metadata?.httpStatusCode === 404
      ) {
        return false;
      }
      throw error;
    }
  }

  async list(options?: ListOptions): Promise<ListResult> {
    const response = await this.client.send(
      new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: options?.prefix,
        MaxKeys: options?.maxKeys || 1000,
        ContinuationToken: options?.continuationToken,
        Delimiter: options?.delimiter,
      })
    );

    const files: FileMetadata[] = (response.Contents || []).map(object => ({
      filename: object.Key || '',
      size: object.Size || 0,
      contentType: 'application/octet-stream',
      lastModified: object.LastModified || new Date(),
      etag: object.ETag?.replace(/"/g, ''),
    }));

    // Include common prefixes as directories
    if (options?.delimiter && response.CommonPrefixes) {
      for (const prefix of response.CommonPrefixes) {
        if (prefix.Prefix) {
          files.push({
            filename: prefix.Prefix,
            size: 0,
            contentType: 'application/x-directory',
            lastModified: new Date(),
          });
        }
      }
    }

    return {
      files,
      nextContinuationToken: response.NextContinuationToken,
      isTruncated: response.IsTruncated || false,
    };
  }

  async getSignedUrl(
    key: string,
    operation: 'get' | 'put',
    expiresIn: number = 3600
  ): Promise<string> {
    const command =
      operation === 'get'
        ? new GetObjectCommand({ Bucket: this.bucket, Key: key })
        : new PutObjectCommand({ Bucket: this.bucket, Key: key });

    return await getSignedUrl(this.client, command, { expiresIn });
  }

  async copy(sourceKey: string, destinationKey: string): Promise<void> {
    await this.client.send(
      new CopyObjectCommand({
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${sourceKey}`,
        Key: destinationKey,
      })
    );
  }

  async move(sourceKey: string, destinationKey: string): Promise<void> {
    await this.copy(sourceKey, destinationKey);
    await this.delete(sourceKey);
  }
}

/**
 * R2 Storage Provider
 * Extends S3StorageProvider with R2-specific configuration
 */
export class R2StorageProvider extends S3StorageProvider {
  constructor(config: {
    accountId: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
  }) {
    super({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      region: 'auto',
      bucket: config.bucket,
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    });
  }
}
