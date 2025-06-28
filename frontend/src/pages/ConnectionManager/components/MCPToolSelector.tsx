import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { MCPTool, ModelConnection } from '@/types/connection';
import axios from 'axios';

interface MCPToolSelectorProps {
  connection: ModelConnection;
  selectedTools: string[];
  onToolsChange: (selectedTools: string[]) => void;
  disabled?: boolean;
}

export const MCPToolSelector: React.FC<MCPToolSelectorProps> = ({
  connection,
  selectedTools,
  onToolsChange,
  disabled = false
}) => {
  const [availableTools, setAvailableTools] = useState<MCPTool[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (connection.provider === 'mcp') {
      fetchTools();
    }
  }, [connection]);

  const fetchTools = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`/connections/${connection.id}/mcp/tools`);
      setAvailableTools(response.data.tools || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch MCP tools');
      setAvailableTools([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToolToggle = (toolName: string, checked: boolean) => {
    if (disabled) return;

    const newSelection = checked
      ? [...selectedTools, toolName]
      : selectedTools.filter(t => t !== toolName);
    
    onToolsChange(newSelection);
  };

  const handleSelectAll = () => {
    if (disabled) return;
    onToolsChange(availableTools.map(t => t.name));
  };

  const handleDeselectAll = () => {
    if (disabled) return;
    onToolsChange([]);
  };

  if (connection.provider !== 'mcp') {
    return (
      <div className="text-sm text-muted-foreground">
        Tool selection is only available for MCP connections.
      </div>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            Loading MCP tools...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <div className="text-sm text-red-600">{error}</div>
            <Button onClick={fetchTools} variant="outline" size="sm">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (availableTools.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <div className="text-sm text-muted-foreground">
              No tools available from this MCP connection.
            </div>
            <Button onClick={fetchTools} variant="outline" size="sm">
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-base">
              MCP Tools ({availableTools.length} available)
            </CardTitle>
            <CardDescription>
              Select tools for this agent to use
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleSelectAll}
              variant="outline"
              size="sm"
              disabled={disabled}
            >
              All
            </Button>
            <Button
              onClick={handleDeselectAll}
              variant="outline"
              size="sm"
              disabled={disabled}
            >
              None
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {availableTools.map((tool) => (
            <div
              key={tool.name}
              className="flex items-start space-x-3 p-2 rounded-md hover:bg-muted/50"
            >
              <Checkbox
                id={`tool-selector-${tool.name}`}
                checked={selectedTools.includes(tool.name)}
                onCheckedChange={(checked) => 
                  handleToolToggle(tool.name, checked as boolean)
                }
                disabled={disabled}
              />
              <div className="flex-1 space-y-1">
                <label
                  htmlFor={`tool-selector-${tool.name}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {tool.name}
                </label>
                {tool.description && (
                  <p className="text-xs text-muted-foreground">
                    {tool.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {selectedTools.length > 0 && (
          <div className="mt-4 pt-3 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedTools.length} tools selected
              </span>
              <div className="flex flex-wrap gap-1 max-w-xs">
                {selectedTools.slice(0, 4).map((toolName) => (
                  <Badge key={toolName} variant="secondary" className="text-xs">
                    {toolName}
                  </Badge>
                ))}
                {selectedTools.length > 4 && (
                  <Badge variant="secondary" className="text-xs">
                    +{selectedTools.length - 4}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};