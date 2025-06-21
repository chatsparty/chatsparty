import React, { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Paperclip, X, FileText, Upload, Loader2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

interface AttachedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  file: File;
  extractedContent?: string;
  isExtracting?: boolean;
}

interface FileAttachmentSidebarProps {
  attachedFiles: AttachedFile[];
  onFilesAttached: (files: AttachedFile[]) => void;
  onFileRemoved: (fileId: string) => void;
  onExtractContent: (fileId: string) => Promise<string>;
  isExtractingContent: boolean;
}

const FileAttachmentSidebar: React.FC<FileAttachmentSidebarProps> = ({
  attachedFiles,
  onFilesAttached,
  onFileRemoved,
  onExtractContent,
  isExtractingContent,
}) => {

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: AttachedFile[] = acceptedFiles.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      size: file.size,
      type: file.type,
      file,
    }));
    
    onFilesAttached([...attachedFiles, ...newFiles]);
  }, [attachedFiles, onFilesAttached]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    multiple: true,
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleExtractContent = async (fileId: string) => {
    try {
      const content = await onExtractContent(fileId);
      // Update the file with extracted content
      const updatedFiles = attachedFiles.map(file => 
        file.id === fileId ? { ...file, extractedContent: content, isExtracting: false } : file
      );
      onFilesAttached(updatedFiles);
    } catch (error) {
      console.error('Error extracting content:', error);
    }
  };

  return (
    <div className="w-80 bg-card border-l border-border flex flex-col">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-4">
          <Paperclip className="h-5 w-5" />
          <h3 className="font-semibold">File Attachments</h3>
        </div>

        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer ${
            isDragActive
              ? 'border-primary bg-primary/10'
              : 'border-muted-foreground/25 hover:border-primary/50'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Drop files here or click to upload
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Supports PDF, TXT, DOC, DOCX
          </p>
        </div>
      </div>

      {/* Attached Files List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {attachedFiles.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-8">
            No files attached yet
          </div>
        ) : (
          attachedFiles.map((file) => (
            <Card key={file.id} className="relative">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" title={file.name}>
                        {file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onFileRemoved(file.id)}
                    className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <Badge
                    variant={file.extractedContent ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {file.extractedContent ? 'Content Extracted' : 'Not Processed'}
                  </Badge>
                  
                  {!file.extractedContent && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExtractContent(file.id)}
                      disabled={file.isExtracting || isExtractingContent}
                      className="h-6 text-xs"
                    >
                      {file.isExtracting ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Extracting...
                        </>
                      ) : (
                        'Extract Content'
                      )}
                    </Button>
                  )}
                </div>
                
                {file.extractedContent && (
                  <div className="mt-2 p-2 bg-muted rounded text-xs">
                    <p className="text-green-600 font-medium">✓ Ready for conversation</p>
                    <p className="text-muted-foreground text-xs mt-1">
                      Content extracted ({Math.round(file.extractedContent.length / 1000)}k chars)
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default FileAttachmentSidebar;