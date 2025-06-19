# Storage Provider Setup Guide

The Chatsparty application supports multiple storage providers for file uploads. This guide will help you set up the most cost-effective options.

## Quick Cost Comparison

| Provider | Storage Cost | Egress Cost | Best For |
|----------|-------------|-------------|----------|
| **Cloudflare R2** | $0.015/GB/month | **FREE** | ✅ **RECOMMENDED** - Best value |
| Backblaze B2 | $0.005/GB/month | $0.01/GB (1GB/day free) | Very low usage |
| AWS S3 | $0.023/GB/month | $0.09/GB | Enterprise/existing AWS |
| Local Storage | Free | Free | Development only |

## 1. Cloudflare R2 Setup (Recommended)

**Why R2?** Cheapest storage with **no egress fees** - perfect for file sharing apps.

### Steps:
1. **Create Cloudflare Account** (free tier available)
2. **Go to R2 Object Storage** in dashboard
3. **Create a bucket**:
   ```
   Bucket name: wisty-files-prod
   Location: Automatic
   ```
4. **Create API Token**:
   - Go to "Manage R2 API tokens"
   - Click "Create API token"
   - Permissions: Object Read & Write
   - Bucket: Your bucket name
   - Copy the credentials

5. **Update .env file**:
   ```env
   STORAGE_PROVIDER=cloudflare_r2
   R2_BUCKET_NAME=wisty-files-prod
   R2_ENDPOINT_URL=https://your-account-id.r2.cloudflarestorage.com
   R2_ACCESS_KEY=your-access-key
   R2_SECRET_KEY=your-secret-key
   ```

6. **Test the connection**:
   ```bash
   python manage_storage.py test-connection
   python manage_storage.py test-upload
   ```

### Optional: Custom Domain (for public files)
```env
R2_PUBLIC_URL_BASE=https://files.yourdomain.com
```

## 2. AWS S3 Setup

### Steps:
1. **Create S3 Bucket** in AWS Console
2. **Create IAM User**:
   - Attach policy: `AmazonS3FullAccess` (or custom policy)
   - Generate access keys
3. **Update .env**:
   ```env
   STORAGE_PROVIDER=aws_s3
   AWS_S3_BUCKET_NAME=wisty-files
   AWS_S3_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your-access-key
   AWS_SECRET_ACCESS_KEY=your-secret-key
   ```

## 3. Local Storage (Development)

Default setup for development:

```env
STORAGE_PROVIDER=local
LOCAL_STORAGE_PATH=./storage/uploads
LOCAL_STORAGE_URL_BASE=http://localhost:8000/files/download
```

Setup:
```bash
python manage_storage.py setup-local
```

## API Endpoints

### Upload Files (Temporary)
```bash
POST /files/extract-content
# For content extraction only (files deleted after processing)
```

### Upload Files (Persistent)
```bash
POST /files/upload-persistent
# Saves files permanently to configured storage
```

## Storage Management Commands

```bash
# List available providers
python manage_storage.py list-providers

# Test connection
python manage_storage.py test-connection

# Test upload/download/delete
python manage_storage.py test-upload

# Setup local storage
python manage_storage.py setup-local
```

## Production Recommendations

### For Small Projects (< 100GB/month):
- **Use Cloudflare R2** - Best cost/performance ratio
- No egress fees means free downloads
- Easy setup and reliable

### For Large Projects (> 1TB/month):
- **Consider Backblaze B2** for storage
- **Use Cloudflare R2** for frequently accessed files
- **Set up CDN** for global distribution

### Security Notes:
- Always use IAM/API tokens with minimal required permissions
- Consider bucket versioning for important files
- Set up lifecycle policies to manage costs
- Use HTTPS for all file transfers

## Cost Examples (Monthly)

**Small App (10GB storage, 50GB downloads):**
- Cloudflare R2: $0.15 storage + $0 egress = **$0.15/month**
- AWS S3: $0.23 storage + $4.50 egress = **$4.73/month**

**Medium App (100GB storage, 500GB downloads):**
- Cloudflare R2: $1.50 storage + $0 egress = **$1.50/month**
- AWS S3: $2.30 storage + $45 egress = **$47.30/month**

The difference becomes dramatic with higher download volumes!