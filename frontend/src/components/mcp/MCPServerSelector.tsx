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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { API_BASE_URL } from "@/config/api";
import axios from "axios";
import { AlertCircle, Plus, Server } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface MCPServer {
  id: string;
  name: string;
  description?: string;
  server_url: string;
  available_tools?: string[];
  status: "active" | "inactive" | "error";
}

interface MCPServerSelectorProps {
  selectedServerId?: string;
  selectedTools: string[];
  onServerChange: (serverId: string) => void;
  onToolsChange: (tools: string[]) => void;
}

const MCPServerSelector: React.FC<MCPServerSelectorProps> = ({
  selectedServerId,
  selectedTools,
  onServerChange,
  onToolsChange,
}) => {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const selectedServer = servers.find(
    (server) => server.id === selectedServerId
  );

  useEffect(() => {
    fetchServers();
  }, []);

  const fetchServers = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/mcp/servers`);
      setServers(response.data);
    } catch (error) {
      console.error("Failed to fetch MCP servers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleServerChange = (serverId: string) => {
    if (serverId === "add-new") {
      navigate("/settings/mcp-servers");
      return;
    }

    onServerChange(serverId);
    // Reset selected tools when server changes
    if (serverId !== selectedServerId) {
      onToolsChange([]);
    }
  };

  const handleToolToggle = (tool: string, checked: boolean) => {
    if (checked) {
      onToolsChange([...selectedTools, tool]);
    } else {
      onToolsChange(selectedTools.filter((t) => t !== tool));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        <span className="ml-2 text-muted-foreground">
          Loading MCP servers...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Server Selection */}
      <div>
        <Label className="text-base font-medium">MCP Server</Label>
        <p className="text-sm text-muted-foreground mb-3">
          Choose an MCP server that provides tools for your agent
        </p>

        {servers.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p>No MCP servers configured yet.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/settings/mcp-servers")}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-3 w-3" />
                  Add MCP Server
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid gap-3">
            {servers.map((server) => (
              <Card
                key={server.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedServerId === server.id
                    ? "ring-2 ring-primary bg-primary/5"
                    : "hover:bg-muted/50"
                }`}
                onClick={() => handleServerChange(server.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Server className="h-4 w-4" />
                        {server.name}
                        <Badge
                          variant={
                            server.status === "active" ? "default" : "secondary"
                          }
                          className={
                            server.status === "active"
                              ? "bg-green-100 text-green-800 text-xs"
                              : "text-xs"
                          }
                        >
                          {server.status}
                        </Badge>
                      </CardTitle>
                      {server.description && (
                        <CardDescription className="text-xs mt-1">
                          {server.description}
                        </CardDescription>
                      )}
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        selectedServerId === server.id
                          ? "border-primary bg-primary"
                          : "border-muted-foreground"
                      }`}
                    >
                      {selectedServerId === server.id && (
                        <div className="w-2 h-2 rounded-full bg-white"></div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-xs text-muted-foreground">
                    <div>
                      URL:{" "}
                      <code className="bg-muted px-1 rounded">
                        {server.server_url}
                      </code>
                    </div>
                    <div className="mt-1">
                      Tools: {server.available_tools?.length || 0} available
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Add New Server Option */}
            <Card
              className="cursor-pointer transition-all hover:shadow-md border-dashed hover:bg-muted/50"
              onClick={() => handleServerChange("add-new")}
            >
              <CardContent className="flex items-center justify-center py-6">
                <div className="text-center">
                  <Plus className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                  <div className="text-sm font-medium text-muted-foreground">
                    Add New MCP Server
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Configure a new server with tools
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Tool Selection */}
      {selectedServer &&
        selectedServer.available_tools &&
        selectedServer.available_tools.length > 0 && (
          <div>
            <Label className="text-base font-medium">Available Tools</Label>
            <p className="text-sm text-muted-foreground mb-3">
              Select which tools this agent should have access to
            </p>

            <div className="grid grid-cols-2 gap-2">
              {selectedServer.available_tools.map((tool) => (
                <div key={tool} className="flex items-center space-x-2">
                  <Checkbox
                    id={`tool-${tool}`}
                    checked={selectedTools.includes(tool)}
                    onCheckedChange={(checked) =>
                      handleToolToggle(tool, checked as boolean)
                    }
                  />
                  <Label
                    htmlFor={`tool-${tool}`}
                    className="text-sm font-mono cursor-pointer"
                  >
                    {tool}
                  </Label>
                </div>
              ))}
            </div>

            {selectedTools.length > 0 && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm text-blue-800">
                  <strong>Selected tools:</strong> This agent will be able to
                  use {selectedTools.length} tool
                  {selectedTools.length !== 1 ? "s" : ""}
                  from {selectedServer.name}
                </div>
              </div>
            )}
          </div>
        )}

      {selectedServer &&
        (!selectedServer.available_tools ||
          selectedServer.available_tools.length === 0) && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This server doesn't have any discovered tools yet. The server may
              need to be tested or configured properly.
            </AlertDescription>
          </Alert>
        )}
    </div>
  );
};

export default MCPServerSelector;
