import { Readable } from 'stream';
import { nanoid } from 'nanoid';
import {
  IStorageService,
  IStorageProvider,
  UploadOptions,
  DownloadOptions,
  ListOptions,
  ListResult,
  FileMetadata,
  UploadResult,
  FileValidationOptions,
} from './storage.types';
import { getStorageProvider } from './storage.factory';
import { validateFile, sanitizeStorageKey, getFileExtension } from './storage.validation';
import { PrismaClient } from '@prisma/client';

export class StorageService implements IStorageService {
  private provider: IStorageProvider;
  private prisma: PrismaClient;

  constructor(provider?: IStorageProvider) {
    this.provider = provider || getStorageProvider();
    this.prisma = new PrismaClient();
  }

  /**
   * Upload a file with validation
   */
  async upload(
    key: string,
    body: Buffer | Uint8Array | string | Readable,
    options?: UploadOptions
  ): Promise<UploadResult> {
    // Sanitize the key
    const sanitizedKey = sanitizeStorageKey(key);
    
    // Upload to storage provider
    const metadata = await this.provider.upload(sanitizedKey, body, options);
    
    // Generate public URL if applicable
    const url = await this.getPublicUrl(sanitizedKey);
    
    return {
      key: sanitizedKey,
      url,
      metadata,
    };
  }

  /**
   * Upload a file for a specific user
   */
  async uploadUserFile(
    userId: string,
    filename: string,
    body: Buffer | Uint8Array | string | Readable,
    options?: UploadOptions
  ): Promise<UploadResult> {
    // Generate a unique key for the user's file
    const fileExtension = getFileExtension(filename);
    const uniqueId = nanoid(10);
    const key = `users/${userId}/files/${uniqueId}${fileExtension}`;
    
    return this.upload(key, body, options);
  }

  /**
   * Upload a file for a specific project
   */
  async uploadProjectFile(
    projectId: string,
    filename: string,
    body: Buffer | Uint8Array | string | Readable,
    options?: UploadOptions
  ): Promise<UploadResult> {
    // Generate a key for the project file
    const key = `projects/${projectId}/files/${filename}`;
    
    const result = await this.upload(key, body, options);
    
    // Create a database record for the project file
    const fileSize = Buffer.isBuffer(body) 
      ? body.length 
      : body instanceof Uint8Array 
      ? body.length 
      : Buffer.from(body).length;
    
    await this.prisma.projectFile.create({
      data: {
        projectId,
        filename,
        filePath: result.key,
        contentType: options?.contentType || 'application/octet-stream',
        fileSize: BigInt(fileSize),
      },
    });
    
    return result;
  }

  /**
   * Download a file
   */
  async download(key: string, options?: DownloadOptions): Promise<{
    body: Buffer;
    metadata: FileMetadata;
  }> {
    const sanitizedKey = sanitizeStorageKey(key);
    return this.provider.download(sanitizedKey, options);
  }

  /**
   * Delete a file
   */
  async delete(key: string): Promise<void> {
    const sanitizedKey = sanitizeStorageKey(key);
    await this.provider.delete(sanitizedKey);
  }

  /**
   * Delete multiple files
   */
  async deleteMany(keys: string[]): Promise<void> {
    const sanitizedKeys = keys.map(key => sanitizeStorageKey(key));
    await this.provider.deleteMany(sanitizedKeys);
  }

  /**
   * Delete all files for a user
   */
  async deleteUserFiles(userId: string): Promise<void> {
    const prefix = `users/${userId}/`;
    const files = await this.list({ prefix });
    
    if (files.files.length > 0) {
      const keys = files.files.map(file => file.filename);
      await this.deleteMany(keys);
    }
  }

  /**
   * Delete all files for a project
   */
  async deleteProjectFiles(projectId: string): Promise<void> {
    const prefix = `projects/${projectId}/`;
    const files = await this.list({ prefix });
    
    if (files.files.length > 0) {
      const keys = files.files.map(file => file.filename);
      await this.deleteMany(keys);
      
      // Delete database records
      await this.prisma.projectFile.deleteMany({
        where: { projectId },
      });
    }
  }

  /**
   * Check if a file exists
   */
  async exists(key: string): Promise<boolean> {
    const sanitizedKey = sanitizeStorageKey(key);
    return this.provider.exists(sanitizedKey);
  }

  /**
   * List files
   */
  async list(options?: ListOptions): Promise<ListResult> {
    return this.provider.list(options);
  }

  /**
   * Get a signed URL for temporary access
   */
  async getSignedUrl(
    key: string,
    operation: 'get' | 'put',
    expiresIn: number = 3600
  ): Promise<string> {
    const sanitizedKey = sanitizeStorageKey(key);
    return this.provider.getSignedUrl(sanitizedKey, operation, expiresIn);
  }

  /**
   * Get public URL for a file (if applicable)
   */
  async getPublicUrl(key: string): Promise<string | undefined> {
    // For now, return signed URL for 'get' operation
    // This can be customized based on storage provider and ACL settings
    try {
      return await this.getSignedUrl(key, 'get', 86400); // 24 hours
    } catch {
      return undefined;
    }
  }

  /**
   * Copy a file
   */
  async copy(sourceKey: string, destinationKey: string): Promise<void> {
    const sanitizedSourceKey = sanitizeStorageKey(sourceKey);
    const sanitizedDestKey = sanitizeStorageKey(destinationKey);
    await this.provider.copy(sanitizedSourceKey, sanitizedDestKey);
  }

  /**
   * Move a file
   */
  async move(sourceKey: string, destinationKey: string): Promise<void> {
    const sanitizedSourceKey = sanitizeStorageKey(sourceKey);
    const sanitizedDestKey = sanitizeStorageKey(destinationKey);
    await this.provider.move(sanitizedSourceKey, sanitizedDestKey);
  }

  /**
   * Validate a file before upload
   */
  validateFile(
    file: { size: number; mimetype: string; originalname: string },
    options: FileValidationOptions
  ): void {
    validateFile(file, options);
  }

  /**
   * Get storage usage for a user
   */
  async getUserStorageUsage(userId: string): Promise<{
    totalSize: number;
    fileCount: number;
  }> {
    const prefix = `users/${userId}/`;
    const files = await this.list({ prefix });
    
    const totalSize = files.files.reduce((sum, file) => sum + file.size, 0);
    const fileCount = files.files.filter(file => file.contentType !== 'application/x-directory').length;
    
    return { totalSize, fileCount };
  }

  /**
   * Get storage usage for a project
   */
  async getProjectStorageUsage(projectId: string): Promise<{
    totalSize: number;
    fileCount: number;
  }> {
    const files = await this.prisma.projectFile.findMany({
      where: { projectId },
      select: { fileSize: true },
    });
    
    const totalSize = files.reduce((sum, file) => sum + Number(file.fileSize), 0);
    const fileCount = files.length;
    
    return { totalSize, fileCount };
  }
}

// Export singleton instance
export const storageService = new StorageService();