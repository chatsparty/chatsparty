import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, Info, Loader2, TestTube, XCircle } from "lucide-react";
import React, { useState } from "react";

interface MCPServer {
  id: string;
  name: string;
  description?: string;
  server_url: string;
  server_config?: Record<string, unknown>;
  available_tools?: string[];
  status: "active" | "inactive" | "error";
}

interface FormData {
  name: string;
  description: string;
  server_url: string;
  server_config: Record<string, unknown>;
}

interface MCPServerFormProps {
  formData: FormData;
  editingServer: MCPServer | null;
  isLoading: boolean;
  onInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  onTestConnection: (
    serverData?: FormData
  ) => Promise<{ success: boolean; tools?: string[]; error?: string }>;
}

const MCPServerForm: React.FC<MCPServerFormProps> = ({
  formData,
  editingServer,
  isLoading,
  onInputChange,
  onSubmit,
  onCancel,
  onTestConnection,
}) => {
  const [testResult, setTestResult] = useState<{
    success: boolean;
    tools?: string[];
    error?: string;
  } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await onTestConnection(formData);
      setTestResult(result);
    } catch {
      setTestResult({ success: false, error: "Connection test failed" });
    } finally {
      setIsTesting(false);
    }
  };

  const getServerTypeInfo = (url: string) => {
    if (url.startsWith("stdio://")) {
      return {
        type: "Local Executable",
        description: "Runs a local MCP server executable",
        example: "stdio://uvx mcp-server-filesystem",
      };
    } else if (url.startsWith("ws://") || url.startsWith("wss://")) {
      return {
        type: "WebSocket",
        description: "Real-time connection to a WebSocket MCP server",
        example: "wss://api.example.com/mcp",
      };
    } else if (url.startsWith("http://") || url.startsWith("https://")) {
      return {
        type: "HTTP/SSE",
        description: "HTTP-based MCP server with Server-Sent Events",
        example: "https://api.example.com/mcp",
      };
    }
    return {
      type: "Unknown",
      description: "Please provide a valid MCP server URL",
      example: "",
    };
  };

  const serverInfo = getServerTypeInfo(formData.server_url);

  return (
    <div className="h-[calc(100vh-12rem)] overflow-y-auto overflow-x-hidden scrollbar-hide">
      <form onSubmit={onSubmit} className="space-y-6 pb-6 max-w-full">
        {/* Basic Information Section */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Configure the basic details for your MCP server
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-sm font-medium">
                Server Name *
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={onInputChange}
                placeholder="e.g., File System Server, Web Search Server"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                A descriptive name to identify this MCP server
              </p>
            </div>

            <div>
              <Label htmlFor="description" className="text-sm font-medium">
                Description
              </Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={onInputChange}
                placeholder="Describe what this server provides..."
                rows={2}
                className="resize-y"
              />
            </div>
          </CardContent>
        </Card>

        {/* Server Configuration Section */}
        <Card>
          <CardHeader>
            <CardTitle>Server Configuration</CardTitle>
            <CardDescription>
              Configure the MCP server connection details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="server_url" className="text-sm font-medium">
                Server URL *
              </Label>
              <Input
                id="server_url"
                name="server_url"
                value={formData.server_url}
                onChange={onInputChange}
                placeholder="stdio://uvx mcp-server-filesystem or https://api.example.com/mcp"
                required
              />

              {/* Server Type Info */}
              {formData.server_url && (
                <Alert className="mt-2">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{serverInfo.type}</Badge>
                        <span className="text-sm">
                          {serverInfo.description}
                        </span>
                      </div>
                      {serverInfo.example && (
                        <div className="text-xs text-muted-foreground">
                          Example:{" "}
                          <code className="bg-muted px-1 rounded">
                            {serverInfo.example}
                          </code>
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Common Examples - Minimal */}
        <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
          <h4 className="text-sm font-medium text-muted-foreground">
            Common Examples:
          </h4>
          <div className="space-y-2 text-xs">
            <div>
              <span className="text-muted-foreground">File System:</span>
              <code className="ml-2 bg-muted px-2 py-1 rounded font-mono">
                stdio://npx -y @modelcontextprotocol/server-filesystem /path
              </code>
            </div>
            <div>
              <span className="text-muted-foreground">Git:</span>
              <code className="ml-2 bg-muted px-2 py-1 rounded font-mono">
                stdio://npx -y @modelcontextprotocol/server-git
              </code>
            </div>
            <div>
              <span className="text-muted-foreground">Memory:</span>
              <code className="ml-2 bg-muted px-2 py-1 rounded font-mono">
                stdio://npx -y @modelcontextprotocol/server-memory
              </code>
            </div>
          </div>
        </div>

        {/* Connection Testing Section */}
        <Card>
          <CardHeader>
            <CardTitle>Connection Testing</CardTitle>
            <CardDescription>
              Test your MCP server connection before saving
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleTestConnection}
              disabled={!formData.server_url || isTesting}
              className="w-fit"
            >
              {isTesting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing Connection...
                </>
              ) : (
                <>
                  <TestTube className="h-4 w-4 mr-2" />
                  Test Connection
                </>
              )}
            </Button>

            {/* Test Results */}
            {testResult && (
              <Alert
                className={
                  testResult.success
                    ? "border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800"
                    : "border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800"
                }
              >
                {testResult.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                )}
                <AlertDescription>
                  {testResult.success ? (
                    <div className="space-y-2">
                      <div className="text-green-800 dark:text-green-200 font-medium">
                        Connection successful!
                      </div>
                      {testResult.tools && testResult.tools.length > 0 && (
                        <div>
                          <div className="text-sm text-green-700 dark:text-green-300 mb-1">
                            Available tools:
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {testResult.tools.map((tool) => (
                              <Badge
                                key={tool}
                                variant="secondary"
                                className="text-xs"
                              >
                                {tool}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-red-800 dark:text-red-200">
                      {testResult.error || "Connection failed"}
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Actions Section */}
        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading || !formData.name || !formData.server_url}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {editingServer ? "Updating..." : "Creating..."}
              </>
            ) : editingServer ? (
              "Update Server"
            ) : (
              "Create Server"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default MCPServerForm;
