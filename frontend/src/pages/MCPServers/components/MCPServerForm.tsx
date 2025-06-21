import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, TestTube, CheckCircle, XCircle, Info } from 'lucide-react';

interface MCPServer {
  id: string;
  name: string;
  description?: string;
  server_url: string;
  server_config?: Record<string, any>;
  available_tools?: string[];
  status: 'active' | 'inactive' | 'error';
}

interface FormData {
  name: string;
  description: string;
  server_url: string;
  server_config: Record<string, any>;
}

interface MCPServerFormProps {
  formData: FormData;
  editingServer: MCPServer | null;
  isLoading: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  onTestConnection: (serverData?: FormData) => Promise<{ success: boolean; tools?: string[]; error?: string }>;
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
  const [testResult, setTestResult] = useState<{ success: boolean; tools?: string[]; error?: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await onTestConnection(formData);
      setTestResult(result);
    } catch (error) {
      setTestResult({ success: false, error: 'Connection test failed' });
    } finally {
      setIsTesting(false);
    }
  };

  const getServerTypeInfo = (url: string) => {
    if (url.startsWith('stdio://')) {
      return {
        type: 'Local Executable',
        description: 'Runs a local MCP server executable',
        example: 'stdio://uvx mcp-server-filesystem'
      };
    } else if (url.startsWith('ws://') || url.startsWith('wss://')) {
      return {
        type: 'WebSocket',
        description: 'Real-time connection to a WebSocket MCP server',
        example: 'wss://api.example.com/mcp'
      };
    } else if (url.startsWith('http://') || url.startsWith('https://')) {
      return {
        type: 'HTTP/SSE',
        description: 'HTTP-based MCP server with Server-Sent Events',
        example: 'https://api.example.com/mcp'
      };
    }
    return {
      type: 'Unknown',
      description: 'Please provide a valid MCP server URL',
      example: ''
    };
  };

  const serverInfo = getServerTypeInfo(formData.server_url);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {editingServer ? 'Edit MCP Server' : 'Add New MCP Server'}
        </CardTitle>
        <CardDescription>
          Configure a Model Context Protocol server to provide tools for your agents
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Server Name *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={onInputChange}
                placeholder="e.g., File System Server, Web Search Server"
                required
              />
              <p className="text-sm text-muted-foreground mt-1">
                A descriptive name to identify this MCP server
              </p>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={onInputChange}
                placeholder="Describe what this server provides..."
                rows={2}
              />
            </div>
          </div>

          {/* Server Configuration */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="server_url">Server URL *</Label>
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
                        <span className="text-sm">{serverInfo.description}</span>
                      </div>
                      {serverInfo.example && (
                        <div className="text-xs text-muted-foreground">
                          Example: <code className="bg-muted px-1 rounded">{serverInfo.example}</code>
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Test Connection */}
            <div className="flex flex-col gap-2">
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
                <Alert className={testResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                  {testResult.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <AlertDescription>
                    {testResult.success ? (
                      <div className="space-y-2">
                        <div className="text-green-800 font-medium">Connection successful!</div>
                        {testResult.tools && testResult.tools.length > 0 && (
                          <div>
                            <div className="text-sm text-green-700 mb-1">Available tools:</div>
                            <div className="flex flex-wrap gap-1">
                              {testResult.tools.map((tool) => (
                                <Badge key={tool} variant="secondary" className="text-xs">
                                  {tool}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-red-800">
                        {testResult.error || 'Connection failed'}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          {/* MCP Server Examples */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-3">
                <div className="font-medium">Test MCP Servers with npx:</div>
                <div className="text-sm space-y-2">
                  <div className="space-y-1">
                    <div><strong>File System Server:</strong></div>
                    <code className="bg-muted px-2 py-1 rounded text-xs block">stdio://npx -y @modelcontextprotocol/server-filesystem /path/to/allowed/directory</code>
                    <div className="text-xs text-muted-foreground">Replace /path/to/allowed/directory with your desired path</div>
                  </div>
                  
                  <div className="space-y-1">
                    <div><strong>Git Repository Server:</strong></div>
                    <code className="bg-muted px-2 py-1 rounded text-xs block">stdio://npx -y @modelcontextprotocol/server-git</code>
                  </div>
                  
                  <div className="space-y-1">
                    <div><strong>Web Search (Brave):</strong></div>
                    <code className="bg-muted px-2 py-1 rounded text-xs block">stdio://npx -y @modelcontextprotocol/server-brave-search</code>
                    <div className="text-xs text-muted-foreground">Requires BRAVE_API_KEY environment variable</div>
                  </div>
                  
                  <div className="space-y-1">
                    <div><strong>SQLite Database:</strong></div>
                    <code className="bg-muted px-2 py-1 rounded text-xs block">stdio://npx -y @modelcontextprotocol/server-sqlite --db-path /path/to/database.db</code>
                  </div>
                  
                  <div className="space-y-1">
                    <div><strong>Memory/Notes Server:</strong></div>
                    <code className="bg-muted px-2 py-1 rounded text-xs block">stdio://npx -y @modelcontextprotocol/server-memory</code>
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground p-2 bg-blue-50 rounded border border-blue-200">
                  <div className="font-medium text-blue-800 mb-1">💡 Testing Tips:</div>
                  <ul className="space-y-1 text-blue-700">
                    <li>• Use <code>npx -y</code> to automatically install and run servers</li>
                    <li>• Test connections before saving to verify they work</li>
                    <li>• Some servers need environment variables (API keys)</li>
                    <li>• Check the <a href="https://github.com/modelcontextprotocol/servers" className="underline" target="_blank" rel="noopener noreferrer">MCP Servers repo</a> for full documentation</li>
                  </ul>
                </div>
              </div>
            </AlertDescription>
          </Alert>

          {/* Form Actions */}
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
                  {editingServer ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                editingServer ? 'Update Server' : 'Create Server'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default MCPServerForm;