import os
import uuid
import aiofiles
from typing import Optional, BinaryIO, Dict, Any
from pathlib import Path
from .base import StorageProvider, StorageConfig


class LocalStorageProvider(StorageProvider):
    """Local file system storage provider (for development/testing)"""
    
    def __init__(self, config: StorageConfig):
        self.config = config
        self.storage_path = Path(config.bucket_name)
        self.public_url_base = config.public_url_base or "http://localhost:8000/files/download"
        
        self.storage_path.mkdir(parents=True, exist_ok=True)
    
    async def upload_file(
        self, 
        file_content: BinaryIO, 
        filename: str, 
        content_type: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """Upload file to local storage"""
        try:
            file_extension = Path(filename).suffix
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            file_path = self.storage_path / unique_filename
            
            async with aiofiles.open(file_path, 'wb') as f:
                if hasattr(file_content, 'read'):
                    content = file_content.read()
                else:
                    content = file_content
                await f.write(content)
            
            return unique_filename
        except Exception as e:
            raise Exception(f"Failed to upload file to local storage: {str(e)}")
    
    async def delete_file(self, file_path: str) -> bool:
        """Delete file from local storage"""
        try:
            full_path = self.storage_path / file_path
            if full_path.exists():
                full_path.unlink()
                return True
            return False
        except Exception:
            return False
    
    async def get_file_url(self, file_path: str, expires_in: Optional[int] = None) -> str:
        """Get URL for local file (ignores expires_in for local storage)"""
        return f"{self.public_url_base}/{file_path}"
    
    async def file_exists(self, file_path: str) -> bool:
        """Check if file exists in local storage"""
        full_path = self.storage_path / file_path
        return full_path.exists()
    
    def get_provider_name(self) -> str:
        return "local"