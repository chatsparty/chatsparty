import React, { useCallback, useMemo } from "react";
import Editor from "@monaco-editor/react";

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
  const getLanguageFromPath = useCallback((path: string): string => {
    const extension = path.split('.').pop()?.toLowerCase();
    
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'json': 'json',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'sass': 'sass',
      'md': 'markdown',
      'yaml': 'yaml',
      'yml': 'yaml',
      'xml': 'xml',
      'sql': 'sql',
      'sh': 'shell',
      'bash': 'shell',
      'php': 'php',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'go': 'go',
      'rust': 'rust',
      'rb': 'ruby',
      'vue': 'vue',
      'svelte': 'svelte',
      'dockerfile': 'dockerfile',
      'gitignore': 'ignore',
      'env': 'dotenv',
      'toml': 'toml',
      'ini': 'ini',
      'log': 'log'
    };

    return languageMap[extension || ''] || 'plaintext';
  }, []);

  const language = useMemo(() => getLanguageFromPath(fileTab.path), [fileTab.path, getLanguageFromPath]);

  const handleEditorChange = useCallback((value: string | undefined) => {
    onUpdateContent(fileTab.id, value || '');
  }, [fileTab.id, onUpdateContent]);

  return (
    <div className="h-full flex flex-col">
      <div className="p-2 border-b border-border bg-muted">
        <span className="text-xs text-muted-foreground">{fileTab.path}</span>
      </div>
      <div className="flex-1">
        <Editor
          height="100%"
          language={language}
          value={fileTab.content}
          onChange={handleEditorChange}
          theme="vs-dark"
          options={{
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
            fontSize: 14,
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
            automaticLayout: true,
            wordWrap: 'on',
            lineNumbers: 'on',
            rulers: [80, 120],
            tabSize: 2,
            insertSpaces: true,
            detectIndentation: true,
            trimAutoWhitespace: true,
            formatOnPaste: true,
            formatOnType: true,
            bracketPairColorization: { enabled: true },
            guides: {
              bracketPairs: true,
              indentation: true
            },
            suggest: {
              showKeywords: true,
              showSnippets: true
            },
            quickSuggestions: {
              other: true,
              comments: true,
              strings: true
            }
          }}
          loading={<div className="flex items-center justify-center h-full text-muted-foreground">Loading editor...</div>}
        />
      </div>
    </div>
  );
};