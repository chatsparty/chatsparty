import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import {
  IStorageProvider,
  FileMetadata,
  UploadOptions,
  DownloadOptions,
  ListOptions,
  ListResult,
} from '../storage.types';

export class LocalStorageProvider implements IStorageProvider {
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = path.resolve(basePath);
  }

  async upload(
    key: string,
    body: Buffer | Uint8Array | string | Readable,
    options?: UploadOptions
  ): Promise<FileMetadata> {
    const filePath = this.getFilePath(key);
    
    // Ensure directory exists
    await this.ensureDirectory(path.dirname(filePath));

    // Write file
    if (body instanceof Readable) {
      await pipeline(body, createWriteStream(filePath));
    } else {
      const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body);
      await fs.writeFile(filePath, buffer);
    }

    // Write metadata if provided
    if (options?.metadata) {
      const metadataPath = this.getMetadataPath(key);
      await fs.writeFile(metadataPath, JSON.stringify(options.metadata));
    }

    // Get file stats
    const stats = await fs.stat(filePath);
    const buffer = await fs.readFile(filePath);
    const etag = this.generateETag(buffer);

    return {
      filename: path.basename(key),
      size: stats.size,
      contentType: options?.contentType || 'application/octet-stream',
      lastModified: stats.mtime,
      etag,
      metadata: options?.metadata,
    };
  }

  async download(key: string, options?: DownloadOptions): Promise<{
    body: Buffer;
    metadata: FileMetadata;
  }> {
    const filePath = this.getFilePath(key);
    
    // Check if file exists
    await this.ensureFileExists(filePath);

    // Read file
    let body: Buffer;
    if (options?.range) {
      const { start, end } = options.range;
      const stats = await fs.stat(filePath);
      const actualEnd = end ?? stats.size - 1;
      
      body = Buffer.alloc(actualEnd - start + 1);
      const fd = await fs.open(filePath, 'r');
      try {
        await fd.read(body, 0, body.length, start);
      } finally {
        await fd.close();
      }
    } else {
      body = await fs.readFile(filePath);
    }

    // Get metadata
    const metadata = await this.getMetadata(key);

    return { body, metadata };
  }

  async getMetadata(key: string): Promise<FileMetadata> {
    const filePath = this.getFilePath(key);
    
    // Check if file exists
    await this.ensureFileExists(filePath);

    // Get file stats
    const stats = await fs.stat(filePath);
    const buffer = await fs.readFile(filePath);
    const etag = this.generateETag(buffer);

    // Read custom metadata if exists
    let metadata: Record<string, string> | undefined;
    const metadataPath = this.getMetadataPath(key);
    try {
      const metadataContent = await fs.readFile(metadataPath, 'utf-8');
      metadata = JSON.parse(metadataContent);
    } catch {
      // Metadata file doesn't exist
    }

    return {
      filename: path.basename(key),
      size: stats.size,
      contentType: 'application/octet-stream',
      lastModified: stats.mtime,
      etag,
      metadata,
    };
  }

  async delete(key: string): Promise<void> {
    const filePath = this.getFilePath(key);
    const metadataPath = this.getMetadataPath(key);

    try {
      await fs.unlink(filePath);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    // Delete metadata file if exists
    try {
      await fs.unlink(metadataPath);
    } catch {
      // Ignore if metadata file doesn't exist
    }
  }

  async deleteMany(keys: string[]): Promise<void> {
    await Promise.all(keys.map(key => this.delete(key)));
  }

  async exists(key: string): Promise<boolean> {
    const filePath = this.getFilePath(key);
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async list(options?: ListOptions): Promise<ListResult> {
    const prefix = options?.prefix || '';
    const maxKeys = options?.maxKeys || 1000;
    const delimiter = options?.delimiter || '/';
    
    const basePath = path.join(this.basePath, prefix);
    const files: FileMetadata[] = [];
    
    try {
      await this.listRecursive(basePath, prefix, files, delimiter, maxKeys);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return { files: [], isTruncated: false };
      }
      throw error;
    }

    // Sort by filename
    files.sort((a, b) => a.filename.localeCompare(b.filename));

    // Apply pagination
    const truncatedFiles = files.slice(0, maxKeys);
    const isTruncated = files.length > maxKeys;

    return {
      files: truncatedFiles,
      isTruncated,
    };
  }

  async getSignedUrl(
    key: string,
    _operation: 'get' | 'put',
    _expiresIn?: number
  ): Promise<string> {
    // For local storage, return a file:// URL
    const filePath = this.getFilePath(key);
    return `file://${filePath}`;
  }

  async copy(sourceKey: string, destinationKey: string): Promise<void> {
    const sourcePath = this.getFilePath(sourceKey);
    const destPath = this.getFilePath(destinationKey);
    
    // Ensure source exists
    await this.ensureFileExists(sourcePath);
    
    // Ensure destination directory exists
    await this.ensureDirectory(path.dirname(destPath));
    
    // Copy file
    await fs.copyFile(sourcePath, destPath);
    
    // Copy metadata if exists
    const sourceMetadataPath = this.getMetadataPath(sourceKey);
    const destMetadataPath = this.getMetadataPath(destinationKey);
    try {
      await fs.copyFile(sourceMetadataPath, destMetadataPath);
    } catch {
      // Ignore if metadata doesn't exist
    }
  }

  async move(sourceKey: string, destinationKey: string): Promise<void> {
    await this.copy(sourceKey, destinationKey);
    await this.delete(sourceKey);
  }

  private getFilePath(key: string): string {
    // Normalize the key to prevent path traversal
    const normalizedKey = path.normalize(key).replace(/^(\.\.(\/|\\|$))+/, '');
    return path.join(this.basePath, normalizedKey);
  }

  private getMetadataPath(key: string): string {
    return this.getFilePath(key) + '.metadata.json';
  }

  private async ensureDirectory(dirPath: string): Promise<void> {
    await fs.mkdir(dirPath, { recursive: true });
  }

  private async ensureFileExists(filePath: string): Promise<void> {
    try {
      await fs.access(filePath);
    } catch {
      throw new Error(`File not found: ${filePath}`);
    }
  }

  private generateETag(buffer: Buffer): string {
    return crypto.createHash('md5').update(buffer).digest('hex');
  }

  private async listRecursive(
    dirPath: string,
    prefix: string,
    files: FileMetadata[],
    delimiter: string,
    maxKeys: number
  ): Promise<void> {
    if (files.length >= maxKeys) {
      return;
    }

    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (files.length >= maxKeys) {
        break;
      }

      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        if (delimiter === '/') {
          // Include directory as a common prefix
          const relativeKey = path.relative(this.basePath, fullPath);
          files.push({
            filename: relativeKey + '/',
            size: 0,
            contentType: 'application/x-directory',
            lastModified: new Date(),
          });
        }
        
        // Recurse into subdirectory
        await this.listRecursive(fullPath, prefix, files, delimiter, maxKeys);
      } else if (entry.isFile() && !entry.name.endsWith('.metadata.json')) {
        const relativeKey = path.relative(this.basePath, fullPath);
        const stats = await fs.stat(fullPath);
        
        files.push({
          filename: relativeKey,
          size: stats.size,
          contentType: 'application/octet-stream',
          lastModified: stats.mtime,
        });
      }
    }
  }
}