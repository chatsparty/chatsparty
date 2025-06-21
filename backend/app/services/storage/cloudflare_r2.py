import boto3
from botocore.exceptions import ClientError
from typing import Optional, BinaryIO, Dict, Any
import uuid
from pathlib import Path
from .base import StorageProvider, StorageConfig


class CloudflareR2Provider(StorageProvider):
    """Cloudflare R2 storage provider (S3-compatible, very cheap)"""
    
    def __init__(self, config: StorageConfig):
        self.config = config
        self.bucket_name = config.bucket_name
        self.public_url_base = config.public_url_base
        
        self.client = boto3.client(
            's3',
            endpoint_url=config.endpoint_url,
            aws_access_key_id=config.access_key,
            aws_secret_access_key=config.secret_key,
            region_name=config.region or 'auto'
        )
    
    async def upload_file(
        self, 
        file_content: BinaryIO, 
        filename: str, 
        content_type: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """Upload file to Cloudflare R2"""
        try:
            file_extension = Path(filename).suffix
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            
            upload_params = {
                'Bucket': self.bucket_name,
                'Key': unique_filename,
                'Body': file_content
            }
            
            if content_type:
                upload_params['ContentType'] = content_type
            
            if metadata:
                upload_params['Metadata'] = metadata
            
            self.client.put_object(**upload_params)
            
            return unique_filename
        except ClientError as e:
            raise Exception(f"Failed to upload file to Cloudflare R2: {str(e)}")
    
    async def delete_file(self, file_path: str) -> bool:
        """Delete file from R2"""
        try:
            self.client.delete_object(
                Bucket=self.bucket_name,
                Key=file_path
            )
            return True
        except ClientError:
            return False
    
    async def get_file_url(self, file_path: str, expires_in: Optional[int] = None) -> str:
        """Get file URL (public or signed)"""
        if self.public_url_base:
            return f"{self.public_url_base}/{file_path}"
        else:
            try:
                url = self.client.generate_presigned_url(
                    'get_object',
                    Params={'Bucket': self.bucket_name, 'Key': file_path},
                    ExpiresIn=expires_in or 3600
                )
                return url
            except ClientError as e:
                raise Exception(f"Failed to generate signed URL: {str(e)}")
    
    async def file_exists(self, file_path: str) -> bool:
        """Check if file exists in R2"""
        try:
            self.client.head_object(
                Bucket=self.bucket_name,
                Key=file_path
            )
            return True
        except ClientError:
            return False
    
    def get_provider_name(self) -> str:
        return "cloudflare_r2"