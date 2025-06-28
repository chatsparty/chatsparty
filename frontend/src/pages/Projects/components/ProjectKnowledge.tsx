import React, { useState, useEffect, useCallback } from "react";
import { Upload, File, X, FileText, FileCode, Image, AlertCircle } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Textarea } from "../../../components/ui/textarea";
import { ScrollArea } from "../../../components/ui/scroll-area";
import axios from "axios";
import { API_BASE_URL } from "../../../config/api";
import { useDropzone } from "react-dropzone";

interface ProjectFile {
  id: string;
  filename: string;
  file_size: number;
  mime_type: string;
  uploaded_at: string;
}

interface ProjectKnowledgeProps {
  projectId: string;
}

export const ProjectKnowledge: React.FC<ProjectKnowledgeProps> = ({ projectId }) => {
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [instructionsExpanded, setInstructionsExpanded] = useState(true);

  useEffect(() => {
    fetchFiles();
    fetchInstructions();
  }, [projectId]);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_BASE_URL}/api/projects/${projectId}/files`
      );
      setFiles(response.data.files || []);
    } catch (error) {
      console.error("Failed to fetch files:", error);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchInstructions = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/projects/${projectId}`
      );
      setInstructions(response.data.project.instructions || "");
    } catch (error) {
      console.error("Failed to fetch instructions:", error);
    }
  };

  const handleFileUpload = async (acceptedFiles: File[]) => {
    setUploading(true);
    
    for (const file of acceptedFiles) {
      const formData = new FormData();
      formData.append("file", file);

      try {
        await axios.post(
          `${API_BASE_URL}/api/projects/${projectId}/files/upload`,
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );
      } catch (error) {
        console.error("Failed to upload file:", error);
      }
    }

    setUploading(false);
    fetchFiles(); // Refresh file list
  };

  const handleFileDelete = async (fileId: string) => {
    try {
      await axios.delete(
        `${API_BASE_URL}/api/projects/${projectId}/files/${fileId}`
      );
      fetchFiles(); // Refresh file list
    } catch (error) {
      console.error("Failed to delete file:", error);
    }
  };

  const handleInstructionsSave = async () => {
    try {
      await axios.patch(
        `${API_BASE_URL}/api/projects/${projectId}`,
        { instructions }
      );
      setInstructionsExpanded(false);
    } catch (error) {
      console.error("Failed to save instructions:", error);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    handleFileUpload(acceptedFiles);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
  });

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return <Image className="h-4 w-4" />;
    if (mimeType.includes("pdf") || mimeType.includes("doc")) return <FileText className="h-4 w-4" />;
    if (mimeType.includes("code") || mimeType.includes("json") || mimeType.includes("javascript")) 
      return <FileCode className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Project Knowledge</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setInstructionsExpanded(!instructionsExpanded)}
            className="h-8 w-8"
          >
            <AlertCircle className="h-4 w-4" />
          </Button>
        </div>

        {/* Instructions Section */}
        {instructionsExpanded && (
          <div className="space-y-3 p-3 bg-muted/20 rounded-lg border border-border/20">
            <Textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Project instructions: Add specific guidance for how Claude should work with this project, coding standards, preferences, and any context that will help in conversations..."
              className="min-h-[80px] resize-none"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setInstructionsExpanded(false);
                  fetchInstructions(); // Reset to saved value
                }}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleInstructionsSave}>
                Save
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Files Section */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
              <p className="mt-4 text-sm text-muted-foreground">Loading files...</p>
            </div>
          ) : (
            <>
              {/* File List */}
              {files.length > 0 && (
                <div className="space-y-3 mb-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">Project Files</h3>
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border/30 hover:bg-accent/30 transition-all duration-200 group"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-primary/10 rounded flex items-center justify-center">
                          {getFileIcon(file.mime_type)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{file.filename}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(file.file_size)} · {new Date(file.uploaded_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => handleFileDelete(file.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Drop Zone */}
              <div
                {...getRootProps()}
                className={`
                  border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
                  transition-all duration-200
                  ${isDragActive 
                    ? "border-primary bg-primary/10" 
                    : "border-border/50 hover:border-primary/50 hover:bg-accent/20"
                  }
                  ${uploading ? "opacity-50 pointer-events-none" : ""}
                `}
              >
                <input {...getInputProps()} />
                <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                </div>
                {isDragActive ? (
                  <p className="text-sm font-medium text-primary">Drop the files here...</p>
                ) : (
                  <>
                    <p className="text-sm font-medium mb-1">
                      {files.length === 0 
                        ? "Add knowledge to your project"
                        : "Add more files"
                      }
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {files.length === 0 
                        ? "Upload files that Claude will reference"
                        : "Drag & drop or click to browse"
                      }
                    </p>
                  </>
                )}
                {uploading && (
                  <div className="mt-3">
                    <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
                    <p className="mt-2 text-xs text-muted-foreground">Uploading...</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};