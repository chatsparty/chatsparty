import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import type { MCPCapabilities, ModelConnection } from '@/types/connection';
import axios from 'axios';

interface MCPToolManagerProps {
  connection: ModelConnection;
  onToolsSelected?: (selectedTools: string[]) => void;
  selectedTools?: string[];
}

export const MCPToolManager: React.FC<MCPToolManagerProps> = ({
  connection,
  onToolsSelected,
  selectedTools = []
}) => {
  const [capabilities, setCapabilities] = useState<MCPCapabilities | null>(null);
  const [discovering, setDiscovering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localSelectedTools, setLocalSelectedTools] = useState<string[]>(selectedTools);

  useEffect(() => {
    setLocalSelectedTools(selectedTools);
  }, [selectedTools]);

  useEffect(() => {
    if (connection.mcp_capabilities) {
      setCapabilities(connection.mcp_capabilities);
    } else {
      discoverCapabilities();
    }
  }, [connection]);

  const discoverCapabilities = async () => {
    setDiscovering(true);
    setError(null);

    try {
      const response = await axios.post(`/connections/${connection.id}/mcp/discover`);
      
      if (response.data.success) {
        setCapabilities(response.data.capabilities);
      } else {
        setError(response.data.error || 'Failed to discover capabilities');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to discover MCP capabilities');
    } finally {
      setDiscovering(false);
    }
  };

  const handleToolToggle = (toolName: string, checked: boolean) => {
    const newSelection = checked
      ? [...localSelectedTools, toolName]
      : localSelectedTools.filter(t => t !== toolName);
    
    setLocalSelectedTools(newSelection);
    onToolsSelected?.(newSelection);
  };

  const handleSelectAll = () => {
    const allToolNames = capabilities?.tools.map(t => t.name) || [];
    setLocalSelectedTools(allToolNames);
    onToolsSelected?.(allToolNames);
  };

  const handleDeselectAll = () => {
    setLocalSelectedTools([]);
    onToolsSelected?.([]);
  };

  if (connection.provider !== 'mcp') {
    return (
      <div className="text-sm text-muted-foreground">
        Tool management is only available for MCP connections.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">MCP Tools & Capabilities</h3>
        <Button
          onClick={discoverCapabilities}
          disabled={discovering}
          variant="outline"
          size="sm"
        >
          {discovering ? 'Discovering...' : 'Refresh Capabilities'}
        </Button>
      </div>

      {error && (
        <div className="p-3 rounded-md bg-red-50 text-red-700 border border-red-200 text-sm">
          {error}
        </div>
      )}

      {capabilities && (
        <div className="space-y-4">
          {/* Server Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Server Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Name:</span>
                <span>{capabilities.server_info.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Version:</span>
                <span>{capabilities.server_info.version}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Protocol:</span>
                <span>{capabilities.server_info.protocol_version}</span>
              </div>
            </CardContent>
          </Card>

          {/* Tools Section */}
          {capabilities.tools.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-base">
                      Available Tools ({capabilities.tools.length})
                    </CardTitle>
                    <CardDescription>
                      Select tools to enable for agents using this connection
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSelectAll}
                      variant="outline"
                      size="sm"
                    >
                      Select All
                    </Button>
                    <Button
                      onClick={handleDeselectAll}
                      variant="outline"
                      size="sm"
                    >
                      Deselect All
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {capabilities.tools.map((tool) => (
                    <div
                      key={tool.name}
                      className="flex items-start space-x-3 p-3 rounded-md border bg-card"
                    >
                      <Checkbox
                        id={`tool-${tool.name}`}
                        checked={localSelectedTools.includes(tool.name)}
                        onCheckedChange={(checked) => 
                          handleToolToggle(tool.name, checked as boolean)
                        }
                      />
                      <div className="flex-1 space-y-1">
                        <label
                          htmlFor={`tool-${tool.name}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {tool.name}
                        </label>
                        {tool.description && (
                          <p className="text-sm text-muted-foreground">
                            {tool.description}
                          </p>
                        )}
                        {tool.input_schema && (
                          <div className="text-xs text-muted-foreground">
                            <details className="mt-1">
                              <summary className="cursor-pointer hover:text-foreground">
                                View schema
                              </summary>
                              <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-32">
                                {JSON.stringify(tool.input_schema, null, 2)}
                              </pre>
                            </details>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Resources Section */}
          {capabilities.resources.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Available Resources ({capabilities.resources.length})
                </CardTitle>
                <CardDescription>
                  Resources that can be accessed by agents
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {capabilities.resources.map((resource, index) => (
                    <div
                      key={index}
                      className="flex items-start justify-between p-3 rounded-md border bg-card"
                    >
                      <div className="space-y-1">
                        <div className="font-medium text-sm">{resource.name}</div>
                        {resource.description && (
                          <div className="text-sm text-muted-foreground">
                            {resource.description}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          URI: {resource.uri}
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {resource.mime_type}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Prompts Section */}
          {capabilities.prompts.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Available Prompts ({capabilities.prompts.length})
                </CardTitle>
                <CardDescription>
                  Pre-defined prompts available from the MCP server
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {capabilities.prompts.map((prompt, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-md border bg-card space-y-1"
                    >
                      <div className="font-medium text-sm">{prompt.name}</div>
                      {prompt.description && (
                        <div className="text-sm text-muted-foreground">
                          {prompt.description}
                        </div>
                      )}
                      {prompt.arguments && Object.keys(prompt.arguments).length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          <details className="mt-1">
                            <summary className="cursor-pointer hover:text-foreground">
                              View arguments
                            </summary>
                            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-32">
                              {JSON.stringify(prompt.arguments, null, 2)}
                            </pre>
                          </details>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Summary */}
          {localSelectedTools.length > 0 && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-900">
                    {localSelectedTools.length} tools selected
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {localSelectedTools.slice(0, 3).map((toolName) => (
                      <Badge key={toolName} variant="secondary" className="text-xs">
                        {toolName}
                      </Badge>
                    ))}
                    {localSelectedTools.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{localSelectedTools.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!capabilities && !discovering && !error && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No capabilities discovered yet.</p>
          <Button
            onClick={discoverCapabilities}
            variant="outline"
            className="mt-2"
          >
            Discover Capabilities
          </Button>
        </div>
      )}
    </div>
  );
};