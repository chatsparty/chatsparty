import { Readable } from 'stream';

/**
 * Storage provider types
 */
export type StorageProvider = 'local' | 's3' | 'r2';

/**
 * File metadata
 */
export interface FileMetadata {
  filename: string;
  size: number;
  contentType: string;
  lastModified: Date;
  etag?: string;
  metadata?: Record<string, string>;
}

/**
 * Upload options
 */
export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  acl?: 'private' | 'public-read';
  cacheControl?: string;
  contentDisposition?: string;
}

/**
 * Download options
 */
export interface DownloadOptions {
  range?: {
    start: number;
    end?: number;
  };
}

/**
 * List files options
 */
export interface ListOptions {
  prefix?: string;
  maxKeys?: number;
  continuationToken?: string;
  delimiter?: string;
}

/**
 * List files result
 */
export interface ListResult {
  files: FileMetadata[];
  nextContinuationToken?: string;
  isTruncated: boolean;
}

/**
 * Storage provider interface
 */
export interface IStorageProvider {
  /**
   * Upload a file
   */
  upload(
    key: string,
    body: Buffer | Uint8Array | string | Readable,
    options?: UploadOptions
  ): Promise<FileMetadata>;

  /**
   * Download a file
   */
  download(key: string, options?: DownloadOptions): Promise<{
    body: Buffer;
    metadata: FileMetadata;
  }>;

  /**
   * Get file metadata
   */
  getMetadata(key: string): Promise<FileMetadata>;

  /**
   * Delete a file
   */
  delete(key: string): Promise<void>;

  /**
   * Delete multiple files
   */
  deleteMany(keys: string[]): Promise<void>;

  /**
   * Check if file exists
   */
  exists(key: string): Promise<boolean>;

  /**
   * List files
   */
  list(options?: ListOptions): Promise<ListResult>;

  /**
   * Get a signed URL for temporary access
   */
  getSignedUrl(
    key: string,
    operation: 'get' | 'put',
    expiresIn?: number
  ): Promise<string>;

  /**
   * Copy a file
   */
  copy(sourceKey: string, destinationKey: string): Promise<void>;

  /**
   * Move a file
   */
  move(sourceKey: string, destinationKey: string): Promise<void>;
}

/**
 * Storage configuration
 */
export interface StorageConfig {
  provider: StorageProvider;
  local?: {
    basePath: string;
  };
  s3?: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    bucket: string;
    endpoint?: string;
  };
  r2?: {
    accountId: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
  };
}

/**
 * File upload validation options
 */
export interface FileValidationOptions {
  maxSize?: number;
  allowedTypes?: string[];
  allowedExtensions?: string[];
}

/**
 * File upload result
 */
export interface UploadResult {
  key: string;
  url?: string;
  metadata: FileMetadata;
}

/**
 * Storage service interface
 */
export interface IStorageService {
  upload(
    key: string,
    body: Buffer | Uint8Array | string | Readable,
    options?: UploadOptions
  ): Promise<UploadResult>;

  download(key: string, options?: DownloadOptions): Promise<{
    body: Buffer;
    metadata: FileMetadata;
  }>;

  delete(key: string): Promise<void>;

  deleteMany(keys: string[]): Promise<void>;

  exists(key: string): Promise<boolean>;

  list(options?: ListOptions): Promise<ListResult>;

  getSignedUrl(
    key: string,
    operation: 'get' | 'put',
    expiresIn?: number
  ): Promise<string>;

  validateFile(
    file: { size: number; mimetype: string; originalname: string },
    options: FileValidationOptions
  ): void;
}