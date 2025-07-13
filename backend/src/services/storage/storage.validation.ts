import { z } from 'zod';
import { FileValidationOptions } from './storage.types';

/**
 * Default file size limits
 */
export const FILE_SIZE_LIMITS = {
  DEFAULT: 10 * 1024 * 1024, // 10MB
  IMAGE: 5 * 1024 * 1024, // 5MB
  VIDEO: 100 * 1024 * 1024, // 100MB
  DOCUMENT: 20 * 1024 * 1024, // 20MB
} as const;

/**
 * Common file types
 */
export const FILE_TYPES = {
  IMAGE: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  VIDEO: ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm'],
  AUDIO: ['audio/mpeg', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/x-m4a'],
  DOCUMENT: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
  ],
  CODE: [
    'text/javascript',
    'application/javascript',
    'text/typescript',
    'text/html',
    'text/css',
    'application/json',
    'text/markdown',
    'text/x-python',
    'text/x-java',
    'text/x-c',
    'text/x-cpp',
  ],
} as const;

/**
 * File extensions mapping
 */
export const FILE_EXTENSIONS = {
  IMAGE: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
  VIDEO: ['.mp4', '.mpeg', '.mov', '.avi', '.webm'],
  AUDIO: ['.mp3', '.wav', '.webm', '.ogg', '.m4a'],
  DOCUMENT: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv'],
  CODE: ['.js', '.ts', '.jsx', '.tsx', '.html', '.css', '.json', '.md', '.py', '.java', '.c', '.cpp'],
} as const;

/**
 * File upload validation schema
 */
export const fileUploadSchema = z.object({
  fieldname: z.string(),
  originalname: z.string().min(1),
  encoding: z.string(),
  mimetype: z.string().min(1),
  size: z.number().positive(),
  buffer: z.instanceof(Buffer).optional(),
  path: z.string().optional(),
});

/**
 * Upload options schema
 */
export const uploadOptionsSchema = z.object({
  contentType: z.string().optional(),
  metadata: z.record(z.string()).optional(),
  acl: z.enum(['private', 'public-read']).optional(),
  cacheControl: z.string().optional(),
  contentDisposition: z.string().optional(),
});

/**
 * List options schema
 */
export const listOptionsSchema = z.object({
  prefix: z.string().optional(),
  maxKeys: z.number().positive().max(1000).optional(),
  continuationToken: z.string().optional(),
  delimiter: z.string().optional(),
});

/**
 * Storage key validation schema
 */
export const storageKeySchema = z
  .string()
  .min(1)
  .max(1024)
  .regex(
    /^[a-zA-Z0-9!_\-\.\/]+$/,
    'Storage key can only contain alphanumeric characters, underscores, hyphens, dots, and forward slashes'
  );

/**
 * Validate file based on options
 */
export function validateFile(
  file: { size: number; mimetype: string; originalname: string },
  options: FileValidationOptions
): void {
  // Validate file size
  if (options.maxSize && file.size > options.maxSize) {
    throw new Error(
      `File size exceeds maximum allowed size of ${formatFileSize(options.maxSize)}`
    );
  }

  // Validate file type
  if (options.allowedTypes && options.allowedTypes.length > 0) {
    if (!options.allowedTypes.includes(file.mimetype)) {
      throw new Error(
        `File type '${file.mimetype}' is not allowed. Allowed types: ${options.allowedTypes.join(', ')}`
      );
    }
  }

  // Validate file extension
  if (options.allowedExtensions && options.allowedExtensions.length > 0) {
    const extension = getFileExtension(file.originalname);
    if (!options.allowedExtensions.includes(extension)) {
      throw new Error(
        `File extension '${extension}' is not allowed. Allowed extensions: ${options.allowedExtensions.join(', ')}`
      );
    }
  }
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return '';
  }
  return filename.substring(lastDotIndex).toLowerCase();
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get content type from file extension
 */
export function getContentTypeFromExtension(filename: string): string {
  const extension = getFileExtension(filename);
  
  const contentTypeMap: Record<string, string> = {
    // Images
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    
    // Videos
    '.mp4': 'video/mp4',
    '.mpeg': 'video/mpeg',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.webm': 'video/webm',
    
    // Audio
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.m4a': 'audio/x-m4a',
    
    // Documents
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.txt': 'text/plain',
    '.csv': 'text/csv',
    
    // Code
    '.js': 'text/javascript',
    '.ts': 'text/typescript',
    '.jsx': 'text/javascript',
    '.tsx': 'text/typescript',
    '.html': 'text/html',
    '.css': 'text/css',
    '.json': 'application/json',
    '.md': 'text/markdown',
    '.py': 'text/x-python',
    '.java': 'text/x-java',
    '.c': 'text/x-c',
    '.cpp': 'text/x-cpp',
  };

  return contentTypeMap[extension] || 'application/octet-stream';
}

/**
 * Sanitize storage key
 */
export function sanitizeStorageKey(key: string): string {
  // Remove leading/trailing whitespace
  key = key.trim();
  
  // Replace spaces with underscores
  key = key.replace(/\s+/g, '_');
  
  // Remove any characters that aren't alphanumeric, underscore, hyphen, dot, or forward slash
  key = key.replace(/[^a-zA-Z0-9!_\-\.\/]/g, '');
  
  // Remove multiple consecutive slashes
  key = key.replace(/\/+/g, '/');
  
  // Remove leading/trailing slashes
  key = key.replace(/^\/+|\/+$/g, '');
  
  return key;
}