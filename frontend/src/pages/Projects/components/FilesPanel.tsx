import { FileUp } from "lucide-react";
import React from "react";
import { Button } from "../../../components/ui/button";

interface FilesPanelProps {
  dragOver: boolean;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
}

export const FilesPanel: React.FC<FilesPanelProps> = ({
  dragOver,
  onDrop,
  onDragOver,
  onDragLeave,
}) => {
  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <FileUp className="w-5 h-5" />
        <h2 className="text-lg font-semibold">Project Files</h2>
      </div>
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        }`}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
      >
        <FileUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-sm text-muted-foreground mb-4">
          Drag &amp; drop files here or click to browse
        </p>
        <Button variant="outline" size="sm">
          Browse Files
        </Button>
      </div>
    </div>
  );
};