import React, { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Paperclip, X, FileText, Upload, Loader2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useTranslation } from 'react-i18next';

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
  isMobile?: boolean;
  onCloseSidebar?: () => void;
}

const FileAttachmentSidebar: React.FC<FileAttachmentSidebarProps> = ({
  attachedFiles,
  onFilesAttached,
  onFileRemoved,
  onExtractContent,
  isExtractingContent,
  isMobile = false,
  onCloseSidebar,
}) => {
  const { t } = useTranslation();

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
    if (bytes === 0) return t('files.sizes.bytes', { count: 0 });
    const k = 1024;
    const sizes = [t('files.sizes.bytes'), t('files.sizes.kb'), t('files.sizes.mb'), t('files.sizes.gb')];
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
    <div className={`${isMobile ? 'w-full' : 'w-72'} bg-background/98 backdrop-blur-lg ${!isMobile ? 'border-s-2 border-border/70' : ''} flex flex-col shadow-lg`}>
      
      <div className="p-4 border-b-2 border-border/50 bg-gradient-to-b from-card/30 to-background">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-muted/70 border border-border/30 flex items-center justify-center">
            <Paperclip className="h-4 w-4 text-foreground/80" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-foreground">{t('files.attachments')}</h3>
            <p className="text-xs text-muted-foreground/80">{t('files.dragDropFiles')}</p>
          </div>
          {attachedFiles.length > 0 && (
            <div className="w-6 h-6 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">{attachedFiles.length}</span>
            </div>
          )}
          {!isMobile && onCloseSidebar && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCloseSidebar}
              className="h-6 w-6 p-0 ms-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors duration-200"
              title={t('files.closeSidebar')}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Minimal Dropzone */}
        <div
          {...getRootProps()}
          className={`rounded-lg border-2 border-dashed p-4 text-center transition-all duration-300 cursor-pointer ${
            isDragActive
              ? 'border-primary/70 bg-primary/10'
              : 'border-border/70 hover:border-primary/40 hover:bg-muted/15'
          }`}
        >
          <input {...getInputProps()} />
          
          <div className="flex flex-col items-center">
            <div className={`w-10 h-10 mx-auto mb-2 rounded-lg bg-muted/50 border border-border/30 flex items-center justify-center transition-transform duration-300 ${isDragActive ? 'scale-105' : ''}`}>
              <Upload className={`h-5 w-5 text-muted-foreground transition-all duration-300 ${isDragActive ? 'rotate-6' : ''}`} />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">
              {isDragActive ? t('files.dropFilesHere') : t('files.clickOrDragFiles')}
            </p>
            <p className="text-xs text-muted-foreground/70">
              {t('files.supportedFormats')}
            </p>
          </div>
        </div>
      </div>

      {/* Modern File List */}
      <div className="flex-1 overflow-y-auto p-3">
        {attachedFiles.length === 0 ? (
          <div className="text-center p-8">
            <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-muted/30 flex items-center justify-center">
              <FileText className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">{t('files.noFilesYet')}</p>
            <p className="text-xs text-muted-foreground/70 mt-1">{t('files.uploadToGetStarted')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {attachedFiles.map((file) => (
              <div 
                key={file.id} 
                className="group rounded-lg border-2 border-border/60 bg-card/40 hover:border-primary/40 hover:bg-card/80 hover:shadow-lg transition-all duration-300 p-3"
              >
                <div className="flex items-start gap-3">
                  {/* Simple file icon */}
                  <div className="relative">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors duration-200 ${
                      file.extractedContent 
                        ? 'bg-primary/15 border-2 border-primary/30' 
                        : 'bg-muted/60 border border-border/30'
                    }`}>
                      <FileText className={`h-5 w-5 transition-colors duration-200 ${
                        file.extractedContent 
                          ? 'text-primary' 
                          : 'text-muted-foreground'
                      }`} />
                    </div>
                    {file.extractedContent && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary border-2 border-background shadow-sm"></div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    {/* File info */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate" title={file.name}>
                          {file.name}
                        </p>
                        <p className="text-xs text-muted-foreground/80 mt-0.5">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                        
                      {/* Simple delete button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onFileRemoved(file.id)}
                        className="h-6 w-6 p-0 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0 hover:bg-muted/50"
                      >
                        <X className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                    
                    {/* Simple status and actions */}
                    <div className="flex items-center gap-2">
                      {file.extractedContent ? (
                        <>
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary/15 border-2 border-primary/30 shadow-md">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                            <span className="text-xs font-bold text-primary">{t('files.ready')}</span>
                          </div>
                          <span className="text-xs text-muted-foreground/70">
                            {t('files.charactersCount', { count: Math.round(file.extractedContent.length / 1000) })}
                          </span>
                        </>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExtractContent(file.id)}
                          disabled={file.isExtracting || isExtractingContent}
                          className="h-7 px-3 text-xs rounded bg-muted/50 hover:bg-muted/70 text-foreground border border-border/30 hover:border-primary/20 transition-all duration-200"
                        >
                          {file.isExtracting ? (
                            <>
                              <Loader2 className="h-3 w-3 me-1.5 animate-spin" />
                              {t('files.processing')}
                            </>
                          ) : (
                            t('files.extract')
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileAttachmentSidebar;