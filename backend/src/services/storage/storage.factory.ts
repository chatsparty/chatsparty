import { IStorageProvider, StorageConfig } from './storage.types';
import { LocalStorageProvider } from './providers/local.provider';
import { S3StorageProvider, R2StorageProvider } from './providers/s3.provider';
import { config } from '../../config/env';

/**
 * Storage provider factory
 */
export class StorageProviderFactory {
  private static instance: IStorageProvider | null = null;

  /**
   * Create a storage provider based on configuration
   */
  static create(storageConfig?: StorageConfig): IStorageProvider {
    const providerType = storageConfig?.provider || config.STORAGE_PROVIDER;

    switch (providerType) {
      case 'local':
        return this.createLocalProvider(storageConfig);
      
      case 's3':
        return this.createS3Provider(storageConfig);
      
      case 'r2':
        return this.createR2Provider(storageConfig);
      
      default:
        throw new Error(`Unsupported storage provider: ${providerType}`);
    }
  }

  /**
   * Get singleton instance of storage provider
   */
  static getInstance(): IStorageProvider {
    if (!this.instance) {
      this.instance = this.create();
    }
    return this.instance;
  }

  /**
   * Reset singleton instance (useful for testing)
   */
  static reset(): void {
    this.instance = null;
  }

  private static createLocalProvider(storageConfig?: StorageConfig): LocalStorageProvider {
    const basePath = storageConfig?.local?.basePath || config.STORAGE_PATH;
    return new LocalStorageProvider(basePath);
  }

  private static createS3Provider(storageConfig?: StorageConfig): S3StorageProvider {
    const s3Config = storageConfig?.s3 || {
      accessKeyId: config.AWS_ACCESS_KEY_ID!,
      secretAccessKey: config.AWS_SECRET_ACCESS_KEY!,
      region: config.AWS_REGION!,
      bucket: config.AWS_S3_BUCKET!,
    };

    if (!s3Config.accessKeyId || !s3Config.secretAccessKey || !s3Config.region || !s3Config.bucket) {
      throw new Error('S3 storage provider requires accessKeyId, secretAccessKey, region, and bucket');
    }

    return new S3StorageProvider(s3Config);
  }

  private static createR2Provider(storageConfig?: StorageConfig): R2StorageProvider {
    const r2Config = storageConfig?.r2 || {
      accountId: config.R2_ACCOUNT_ID!,
      accessKeyId: config.R2_ACCESS_KEY_ID!,
      secretAccessKey: config.R2_SECRET_ACCESS_KEY!,
      bucket: config.R2_BUCKET!,
    };

    if (!r2Config.accountId || !r2Config.accessKeyId || !r2Config.secretAccessKey || !r2Config.bucket) {
      throw new Error('R2 storage provider requires accountId, accessKeyId, secretAccessKey, and bucket');
    }

    return new R2StorageProvider(r2Config);
  }
}

/**
 * Get storage provider instance
 */
export function getStorageProvider(config?: StorageConfig): IStorageProvider {
  return config ? StorageProviderFactory.create(config) : StorageProviderFactory.getInstance();
}