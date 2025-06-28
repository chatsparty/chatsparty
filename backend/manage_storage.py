#!/usr/bin/env python3
"""
Storage management utility for Wisty
"""
import asyncio
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app.services.storage.storage_factory import get_storage_provider


async def test_storage_connection():
    """Test storage provider connection"""
    try:
        provider = get_storage_provider()
        print(f"✅ Successfully connected to {provider.get_provider_name()} storage provider")
        
        print(f"Provider: {provider.get_provider_name()}")
        return True
    except Exception as e:
        print(f"❌ Failed to connect to storage provider: {str(e)}")
        return False


async def list_providers():
    """List available storage providers"""
    print("Available storage providers:")
    print("  - local: Local file system (development)")
    print("  - cloudflare_r2: Cloudflare R2 (recommended, cheapest)")
    print("  - aws_s3: AWS S3 (popular, more expensive)")
    print()
    print("Current provider:", os.getenv('STORAGE_PROVIDER', 'local'))


async def test_upload():
    """Test file upload functionality"""
    try:
        from io import BytesIO
        
        provider = get_storage_provider()
        
        test_content = b"This is a test file for storage provider validation."
        test_file = BytesIO(test_content)
        
        print("Uploading test file...")
        file_path = await provider.upload_file(
            file_content=test_file,
            filename="test_file.txt",
            content_type="text/plain",
            metadata={"test": "true"}
        )
        
        print(f"✅ Test file uploaded successfully: {file_path}")
        
        file_url = await provider.get_file_url(file_path)
        print(f"📎 File URL: {file_url}")
        
        exists = await provider.file_exists(file_path)
        print(f"📁 File exists: {exists}")
        
        deleted = await provider.delete_file(file_path)
        print(f"🗑️ Test file deleted: {deleted}")
        
        return True
    except Exception as e:
        print(f"❌ Test upload failed: {str(e)}")
        return False


async def main():
    """Main function"""
    if len(sys.argv) < 2:
        print("Usage: python manage_storage.py <command>")
        print("Commands:")
        print("  test-connection - Test storage provider connection")
        print("  list-providers  - List available storage providers")
        print("  test-upload     - Test file upload/download/delete")
        print("  setup-local     - Set up local storage directory")
        return
    
    command = sys.argv[1]
    
    if command == "test-connection":
        await test_storage_connection()
    elif command == "list-providers":
        await list_providers()
    elif command == "test-upload":
        if await test_storage_connection():
            await test_upload()
    elif command == "setup-local":
        storage_path = os.getenv('LOCAL_STORAGE_PATH', './storage/uploads')
        Path(storage_path).mkdir(parents=True, exist_ok=True)
        print(f"✅ Local storage directory created: {storage_path}")
    else:
        print(f"Unknown command: {command}")


if __name__ == "__main__":
    asyncio.run(main())