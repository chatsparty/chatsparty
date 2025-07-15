import { useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../../../config/api";
import type { AttachedFile } from "../types";

export const useFileAttachments = (initialFiles: AttachedFile[] = []) => {
  const [attachedFiles, setAttachedFiles] =
    useState<AttachedFile[]>(initialFiles);
  const [isExtractingContent, setIsExtractingContent] = useState(false);

  const handleFilesAttached = (files: AttachedFile[]) => {
    setAttachedFiles(files);
  };

  const handleFileRemoved = (fileId: string) => {
    setAttachedFiles((prev) => prev.filter((file) => file.id !== fileId));
  };

  const handleExtractContent = async (fileId: string): Promise<string> => {
    setIsExtractingContent(true);
    try {
      const file = attachedFiles.find((f) => f.id === fileId);
      if (!file) throw new Error("File not found");

      setAttachedFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, isExtracting: true } : f))
      );

      const formData = new FormData();
      formData.append("file", file.file);

      const response = await axios.post(
        `${API_BASE_URL}/files/extract-content`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const content = response.data.content || "";

      setAttachedFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? { ...f, extractedContent: content, isExtracting: false }
            : f
        )
      );

      return content;
    } catch (error) {
      console.error("Error extracting content:", error);
      setAttachedFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, isExtracting: false } : f))
      );
      throw error;
    } finally {
      setIsExtractingContent(false);
    }
  };

  return {
    attachedFiles,
    isExtractingContent,
    handleFilesAttached,
    handleFileRemoved,
    handleExtractContent,
    setAttachedFiles,
  };
};
