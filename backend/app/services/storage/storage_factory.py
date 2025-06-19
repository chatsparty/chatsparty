import os
from typing import Optional
from .base import StorageProvider, StorageConfig
from .local_storage import LocalStorageProvider
from .cloudflare_r2 import CloudflareR2Provider
from .aws_s3 import AWSS3Provider


class StorageFactory:
    """Factory class to create storage providers"""
    
    @staticmethod
    def create_provider(provider_name: Optional[str] = None) -> StorageProvider:
        """
        Create storage provider based on configuration
        
        Args:
            provider_name: Override the default provider from environment
            
        Returns:
            Configured storage provider
        """
        provider = provider_name or os.getenv('STORAGE_PROVIDER', 'local')
        
        if provider == 'local':
            return StorageFactory._create_local_provider()
        elif provider == 'cloudflare_r2':
            return StorageFactory._create_cloudflare_r2_provider()
        elif provider == 'aws_s3':
            return StorageFactory._create_aws_s3_provider()
        else:
            raise ValueError(f"Unsupported storage provider: {provider}")
    
    @staticmethod
    def _create_local_provider() -> LocalStorageProvider:
        """Create local storage provider"""
        config = StorageConfig(
            provider='local',
            bucket_name=os.getenv('LOCAL_STORAGE_PATH', './storage/uploads'),
            public_url_base=os.getenv('LOCAL_STORAGE_URL_BASE', 'http://localhost:8000/files/download')
        )
        return LocalStorageProvider(config)
    
    @staticmethod
    def _create_cloudflare_r2_provider() -> CloudflareR2Provider:
        """Create Cloudflare R2 provider"""
        config = StorageConfig(
            provider='cloudflare_r2',
            bucket_name=os.getenv('R2_BUCKET_NAME'),
            endpoint_url=os.getenv('R2_ENDPOINT_URL'),
            access_key=os.getenv('R2_ACCESS_KEY'),
            secret_key=os.getenv('R2_SECRET_KEY'),
            public_url_base=os.getenv('R2_PUBLIC_URL_BASE'),
            region='auto'
        )
        
        required_vars = ['R2_BUCKET_NAME', 'R2_ENDPOINT_URL', 'R2_ACCESS_KEY', 'R2_SECRET_KEY']
        missing_vars = [var for var in required_vars if not os.getenv(var)]
        if missing_vars:
            raise ValueError(f"Missing required environment variables for Cloudflare R2: {', '.join(missing_vars)}")
        
        return CloudflareR2Provider(config)
    
    @staticmethod
    def _create_aws_s3_provider() -> AWSS3Provider:
        """Create AWS S3 provider"""
        config = StorageConfig(
            provider='aws_s3',
            bucket_name=os.getenv('AWS_S3_BUCKET_NAME'),
            region=os.getenv('AWS_S3_REGION', 'us-east-1'),
            access_key=os.getenv('AWS_ACCESS_KEY_ID'),
            secret_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
            public_url_base=os.getenv('AWS_S3_PUBLIC_URL_BASE')
        )
        
        required_vars = ['AWS_S3_BUCKET_NAME', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY']
        missing_vars = [var for var in required_vars if not os.getenv(var)]
        if missing_vars:
            raise ValueError(f"Missing required environment variables for AWS S3: {', '.join(missing_vars)}")
        
        return AWSS3Provider(config)


_storage_provider = None


def get_storage_provider() -> StorageProvider:
    """Get the configured storage provider (singleton)"""
    global _storage_provider
    if _storage_provider is None:
        _storage_provider = StorageFactory.create_provider()
    return _storage_provider


def reset_storage_provider():
    """Reset storage provider (useful for testing)"""
    global _storage_provider
    _storage_provider = None