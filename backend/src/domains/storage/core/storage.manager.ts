import { Readable } from 'stream';
import { nanoid } from 'nanoid';
import {
  IStorageProvider,
  UploadOptions,
  DownloadOptions,
  ListOptions,
  ListResult,
  FileMetadata,
  UploadResult,
  FileValidationOptions,
} from '../types';
import { getStorageProvider } from '../storage.factory';
import {
  validateFile,
  sanitizeStorageKey,
  getFileExtension,
} from '../validation';
import * as repository from '../repository';

const provider: IStorageProvider = getStorageProvider();

/**
 * Upload a file with validation
 */
export const upload = async (
  key: string,
  body: Buffer | Uint8Array | string | Readable,
  options?: UploadOptions
): Promise<UploadResult> => {
  const sanitizedKey = sanitizeStorageKey(key);
  const metadata = await provider.upload(sanitizedKey, body, options);
  const url = await getPublicUrl(sanitizedKey);
  return { key: sanitizedKey, url, metadata };
};

/**
 * Upload a file for a specific user
 */
export const uploadUserFile = async (
  userId: string,
  filename: string,
  body: Buffer | Uint8Array | string | Readable,
  options?: UploadOptions
): Promise<UploadResult> => {
  const fileExtension = getFileExtension(filename);
  const uniqueId = nanoid(10);
  const key = `users/${userId}/files/${uniqueId}${fileExtension}`;
  return upload(key, body, options);
};

/**
 * Upload a file for a specific project
 */
export const uploadProjectFile = async (
  projectId: string,
  filename: string,
  body: Buffer | Uint8Array | string | Readable,
  options?: UploadOptions
): Promise<UploadResult> => {
  const key = `projects/${projectId}/files/${filename}`;
  const result = await upload(key, body, options);
  const fileSize = Buffer.isBuffer(body)
    ? body.length
    : body instanceof Uint8Array
      ? body.length
      : typeof body === 'string'
        ? Buffer.from(body).length
        : 0;

  await repository.createProjectFile({
    projectId,
    filename,
    filePath: result.key,
    contentType: options?.contentType || 'application/octet-stream',
    fileSize: BigInt(fileSize),
  });

  return result;
};

/**
 * Download a file
 */
export const download = async (
  key: string,
  options?: DownloadOptions
): Promise<{
  body: Buffer;
  metadata: FileMetadata;
}> => {
  const sanitizedKey = sanitizeStorageKey(key);
  return provider.download(sanitizedKey, options);
};

/**
 * Delete a file
 */
export const del = async (key: string): Promise<void> => {
  const sanitizedKey = sanitizeStorageKey(key);
  await provider.delete(sanitizedKey);
};

/**
 * Delete multiple files
 */
export const deleteMany = async (keys: string[]): Promise<void> => {
  const sanitizedKeys = keys.map(sanitizeStorageKey);
  await provider.deleteMany(sanitizedKeys);
};

/**
 * Delete all files for a user
 */
export const deleteUserFiles = async (userId: string): Promise<void> => {
  const prefix = `users/${userId}/`;
  const files = await list({ prefix });
  if (files.files.length > 0) {
    const keys = files.files.map((file: FileMetadata) => file.filename);
    await deleteMany(keys);
  }
};

/**
 * Delete all files for a project
 */
export const deleteProjectFiles = async (projectId: string): Promise<void> => {
  const prefix = `projects/${projectId}/`;
  const files = await list({ prefix });
  if (files.files.length > 0) {
    const keys = files.files.map((file: FileMetadata) => file.filename);
    await deleteMany(keys);
    await repository.deleteProjectFiles(projectId);
  }
};

/**
 * Check if a file exists
 */
export const exists = async (key: string): Promise<boolean> => {
  const sanitizedKey = sanitizeStorageKey(key);
  return provider.exists(sanitizedKey);
};

/**
 * List files
 */
export const list = async (options?: ListOptions): Promise<ListResult> => {
  return provider.list(options);
};

/**
 * Get a signed URL for temporary access
 */
export const getSignedUrl = async (
  key: string,
  operation: 'get' | 'put',
  expiresIn: number = 3600
): Promise<string> => {
  const sanitizedKey = sanitizeStorageKey(key);
  return provider.getSignedUrl(sanitizedKey, operation, expiresIn);
};

/**
 * Get public URL for a file (if applicable)
 */
export const getPublicUrl = async (
  key: string
): Promise<string | undefined> => {
  try {
    return await getSignedUrl(key, 'get', 86400);
  } catch {
    return undefined;
  }
};

/**
 * Copy a file
 */
export const copy = async (
  sourceKey: string,
  destinationKey: string
): Promise<void> => {
  const sanitizedSourceKey = sanitizeStorageKey(sourceKey);
  const sanitizedDestKey = sanitizeStorageKey(destinationKey);
  await provider.copy(sanitizedSourceKey, sanitizedDestKey);
};

/**
 * Move a file
 */
export const move = async (
  sourceKey: string,
  destinationKey: string
): Promise<void> => {
  const sanitizedSourceKey = sanitizeStorageKey(sourceKey);
  const sanitizedDestKey = sanitizeStorageKey(destinationKey);
  await provider.move(sanitizedSourceKey, sanitizedDestKey);
};

/**
 * Validate a file before upload
 */
export const validate = (
  file: { size: number; mimetype: string; originalname: string },
  options: FileValidationOptions
): void => {
  validateFile(file, options);
};

/**
 * Get storage usage for a user
 */
export const getUserStorageUsage = async (
  userId: string
): Promise<{
  totalSize: number;
  fileCount: number;
}> => {
  const prefix = `users/${userId}/`;
  const files = await list({ prefix });
  const totalSize = files.files.reduce(
    (sum: number, file: FileMetadata) => sum + file.size,
    0
  );
  const fileCount = files.files.filter(
    (file: FileMetadata) => file.contentType !== 'application/x-directory'
  ).length;
  return { totalSize, fileCount };
};

/**
 * Get storage usage for a project
 */
export const getProjectStorageUsage = async (
  projectId: string
): Promise<{
  totalSize: number;
  fileCount: number;
}> => {
  const files = await repository.getProjectFiles(projectId);
  const totalSize = files.reduce(
    (sum: number, file: { fileSize: bigint }) => sum + Number(file.fileSize),
    0
  );
  const fileCount = files.length;
  return { totalSize, fileCount };
};
