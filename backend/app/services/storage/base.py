from abc import ABC, abstractmethod
from typing import Optional, BinaryIO, Dict, Any
from pathlib import Path


class StorageProvider(ABC):
    """Abstract base class for storage providers"""
    
    @abstractmethod
    async def upload_file(
        self, 
        file_content: BinaryIO, 
        filename: str, 
        content_type: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Upload file and return the file URL/path
        
        Args:
            file_content: File content as binary stream
            filename: Name of the file
            content_type: MIME type of the file
            metadata: Additional metadata to store with file
            
        Returns:
            URL or path to the uploaded file
        """
        pass
    
    @abstractmethod
    async def delete_file(self, file_path: str) -> bool:
        """
        Delete file from storage
        
        Args:
            file_path: Path/URL of the file to delete
            
        Returns:
            True if successful, False otherwise
        """
        pass
    
    @abstractmethod
    async def get_file_url(self, file_path: str, expires_in: Optional[int] = None) -> str:
        """
        Get downloadable URL for the file
        
        Args:
            file_path: Path/URL of the file
            expires_in: URL expiration time in seconds (None for permanent URLs)
            
        Returns:
            Downloadable URL
        """
        pass
    
    @abstractmethod
    async def file_exists(self, file_path: str) -> bool:
        """
        Check if file exists in storage
        
        Args:
            file_path: Path/URL of the file
            
        Returns:
            True if file exists, False otherwise
        """
        pass
    
    @abstractmethod
    def get_provider_name(self) -> str:
        """Return the name of the storage provider"""
        pass


class StorageConfig:
    """Configuration for storage providers"""
    
    def __init__(
        self,
        provider: str,
        bucket_name: str,
        region: Optional[str] = None,
        endpoint_url: Optional[str] = None,
        access_key: Optional[str] = None,
        secret_key: Optional[str] = None,
        public_url_base: Optional[str] = None,
        **kwargs
    ):
        self.provider = provider
        self.bucket_name = bucket_name
        self.region = region
        self.endpoint_url = endpoint_url
        self.access_key = access_key
        self.secret_key = secret_key
        self.public_url_base = public_url_base
        self.extra_config = kwargs