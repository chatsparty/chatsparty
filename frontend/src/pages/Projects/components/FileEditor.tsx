import React from "react";
import { Textarea } from "../../../components/ui/textarea";

interface FileTab {
  id: string;
  name: string;
  path: string;
  content: string;
  isDirty: boolean;
}

interface FileEditorProps {
  fileTab: FileTab;
  onUpdateContent: (tabId: string, content: string) => void;
}

export const FileEditor: React.FC<FileEditorProps> = ({
  fileTab,
  onUpdateContent,
}) => {
  return (
    <div className="h-full flex flex-col">
      <div className="p-2 border-b border-border bg-muted">
        <span className="text-xs text-muted-foreground">{fileTab.path}</span>
      </div>
      <div className="flex-1 p-3">
        <Textarea
          value={fileTab.content}
          onChange={(e) => onUpdateContent(fileTab.id, e.target.value)}
          className="w-full h-full resize-none font-mono text-sm"
          placeholder="File content..."
        />
      </div>
    </div>
  );
};