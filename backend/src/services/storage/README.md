# Storage Service

The Storage Service provides a unified interface for file storage across multiple providers (Local, AWS S3, and Cloudflare R2).

## Features

- **Multi-Provider Support**: Seamlessly switch between local filesystem, AWS S3, and Cloudflare R2
- **File Validation**: Built-in file size and type validation
- **Secure Access**: Signed URLs for temporary file access
- **Metadata Management**: Store and retrieve custom metadata with files
- **Batch Operations**: Delete multiple files at once
- **User & Project Scoping**: Organize files by user or project

## Configuration

Configure the storage provider via environment variables:

```bash
# Storage Provider (local, s3, r2)
STORAGE_PROVIDER=local
STORAGE_PATH=./storage

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name

# Cloudflare R2 Configuration
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET=your-bucket-name
```

## Usage

### Basic File Upload

```typescript
import { storageService } from './services/storage';

// Upload a file
const result = await storageService.upload(
  'path/to/file.jpg',
  buffer,
  {
    contentType: 'image/jpeg',
    metadata: { uploadedBy: 'user123' }
  }
);

console.log(result.key); // Storage key
console.log(result.url); // Public URL (if available)
```

### User File Upload

```typescript
// Upload a file scoped to a user
const result = await storageService.uploadUserFile(
  userId,
  'profile.jpg',
  buffer,
  { contentType: 'image/jpeg' }
);
```

### Project File Upload

```typescript
// Upload a file scoped to a project
const result = await storageService.uploadProjectFile(
  projectId,
  'source.js',
  buffer,
  { contentType: 'text/javascript' }
);
```

### File Download

```typescript
// Download a file
const { body, metadata } = await storageService.download('path/to/file.jpg');

// Download with range (partial content)
const { body } = await storageService.download('large-file.mp4', {
  range: { start: 0, end: 1024 * 1024 } // First 1MB
});
```

### File Validation

```typescript
// Validate before upload
storageService.validateFile(
  {
    size: file.size,
    mimetype: file.mimetype,
    originalname: file.originalname
  },
  {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png'],
    allowedExtensions: ['.jpg', '.jpeg', '.png']
  }
);
```

### Signed URLs

```typescript
// Get a signed URL for temporary access
const url = await storageService.getSignedUrl(
  'private/document.pdf',
  'get',
  3600 // Expires in 1 hour
);

// Get a signed URL for upload
const uploadUrl = await storageService.getSignedUrl(
  'uploads/new-file.txt',
  'put',
  300 // Expires in 5 minutes
);
```

### List Files

```typescript
// List all files with a prefix
const result = await storageService.list({
  prefix: 'users/123/',
  maxKeys: 100
});

console.log(result.files); // Array of file metadata
console.log(result.isTruncated); // More files available?
```

### Storage Usage

```typescript
// Get user storage usage
const usage = await storageService.getUserStorageUsage(userId);
console.log(usage.totalSize); // Total bytes
console.log(usage.fileCount); // Number of files

// Get project storage usage
const projectUsage = await storageService.getProjectStorageUsage(projectId);
```

## API Endpoints

### Upload File
```
POST /api/storage/upload
Content-Type: multipart/form-data

Body: file (multipart)
```

### Upload Project File
```
POST /api/storage/projects/:projectId/upload
Content-Type: multipart/form-data

Body: file (multipart)
```

### Download File
```
GET /api/storage/download/:key
Query: inline (boolean) - Display inline instead of download
```

### Get File Metadata
```
GET /api/storage/metadata/:key
```

### Delete File
```
DELETE /api/storage/:key
```

### List Files
```
GET /api/storage/list
Query:
  - prefix (string)
  - maxKeys (number)
  - continuationToken (string)
  - delimiter (string)
```

### Get Signed URL
```
POST /api/storage/signed-url
Body:
  - key (string)
  - operation ('get' | 'put')
  - expiresIn (number) - seconds
```

### Get Storage Usage
```
GET /api/storage/usage
```

## File Organization

Files are organized with the following structure:

```
users/
  {userId}/
    files/
      {uniqueId}.{extension}
      
projects/
  {projectId}/
    files/
      {filename}
```

## Security Considerations

1. **Access Control**: All endpoints require authentication
2. **Path Traversal Protection**: File paths are sanitized to prevent directory traversal
3. **Signed URLs**: Use signed URLs for temporary access to private files
4. **File Validation**: Validate file types and sizes before upload
5. **Encryption**: Consider enabling server-side encryption for S3/R2

## Error Handling

The service handles common errors:

- File not found (404)
- Invalid file type or size (400)
- Storage provider errors (500)
- Authentication errors (401)

## Testing

### Unit Tests

```typescript
// Test file upload
it('should upload a file', async () => {
  const result = await storageService.upload(
    'test.txt',
    Buffer.from('Hello World'),
    { contentType: 'text/plain' }
  );
  
  expect(result.key).toBe('test.txt');
  expect(result.metadata.size).toBe(11);
});
```

### Integration Tests

Test with different storage providers by setting the `STORAGE_PROVIDER` environment variable.

## Migration Guide

### From Local to S3/R2

1. Set up S3/R2 bucket and credentials
2. Update environment variables
3. Use the migration script to copy existing files:

```typescript
// Example migration script
const localProvider = new LocalStorageProvider('./storage');
const s3Provider = new S3StorageProvider(s3Config);

const files = await localProvider.list();
for (const file of files.files) {
  const { body } = await localProvider.download(file.filename);
  await s3Provider.upload(file.filename, body);
}
```

## Performance Considerations

1. **Streaming**: Use streams for large file uploads/downloads
2. **Batch Operations**: Delete multiple files in a single request
3. **Caching**: Consider CDN for frequently accessed files
4. **Compression**: Enable compression for text files
5. **Multipart Uploads**: Use for files > 100MB (S3/R2)

## Troubleshooting

### Common Issues

1. **CORS Errors**: Configure CORS on S3/R2 bucket
2. **Permission Denied**: Check IAM permissions for S3/R2
3. **File Size Limits**: Adjust `FILE_SIZE_LIMITS` constants
4. **Timeout Errors**: Increase timeout for large files

### Debug Mode

Enable debug logging:

```typescript
fastify.log.level = 'debug';
```