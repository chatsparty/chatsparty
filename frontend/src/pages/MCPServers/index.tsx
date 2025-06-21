import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Server, Settings, Trash2, TestTube } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import MCPServerForm from './components/MCPServerForm';
import { useMCPServers } from './hooks/useMCPServers';

const MCPServersPage: React.FC = () => {
  const {
    servers,
    isLoading,
    showCreateForm,
    editingServer,
    formData,
    setShowCreateForm,
    handleCreateServer,
    handleEditServer,
    handleInputChange,
    resetForm,
    handleDeleteServer,
    handleTestConnection
  } = useMCPServers();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">MCP Servers</h2>
          <p className="text-muted-foreground mt-2">
            Manage Model Context Protocol servers that provide tools for your agents
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add MCP Server
        </Button>
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 text-blue-800">
            <Server className="h-5 w-5" />
            What are MCP Servers?
          </CardTitle>
        </CardHeader>
        <CardContent className="text-blue-700">
          <p className="text-sm">
            MCP (Model Context Protocol) servers provide tools that your agents can use to perform tasks like reading files, 
            searching the web, managing git repositories, and more. Each server offers a specific set of capabilities that 
            you can assign to your agents.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="outline" className="border-blue-300 text-blue-800">File System</Badge>
            <Badge variant="outline" className="border-blue-300 text-blue-800">Web Search</Badge>
            <Badge variant="outline" className="border-blue-300 text-blue-800">Git Operations</Badge>
            <Badge variant="outline" className="border-blue-300 text-blue-800">Database Access</Badge>
            <Badge variant="outline" className="border-blue-300 text-blue-800">API Integrations</Badge>
          </div>
        </CardContent>
      </Card>

      {showCreateForm && (
        <Card>
          <MCPServerForm
            formData={formData}
            editingServer={editingServer}
            isLoading={isLoading}
            onInputChange={handleInputChange}
            onSubmit={handleCreateServer}
            onCancel={resetForm}
            onTestConnection={handleTestConnection}
          />
        </Card>
      )}

      {/* Servers List */}
      <div className="grid gap-4">
        {servers.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Server className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">No MCP Servers</h3>
              <p className="text-muted-foreground text-center mb-4">
                Get started by adding your first MCP server. These provide tools that your agents can use.
              </p>
              <Button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Your First MCP Server
              </Button>
            </CardContent>
          </Card>
        ) : (
          servers.map((server) => (
            <Card key={server.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <Server className="h-5 w-5" />
                      {server.name}
                      <Badge 
                        variant={server.status === 'active' ? 'default' : 'secondary'}
                        className={server.status === 'active' ? 'bg-green-100 text-green-800' : ''}
                      >
                        {server.status}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {server.description || 'No description provided'}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestConnection(server)}
                      className="flex items-center gap-1"
                    >
                      <TestTube className="h-3 w-3" />
                      Test
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditServer(server)}
                      className="flex items-center gap-1"
                    >
                      <Settings className="h-3 w-3" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteServer(server.id)}
                      className="flex items-center gap-1 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-muted-foreground">Server URL:</span>
                    <p className="font-mono text-xs bg-muted px-2 py-1 rounded mt-1">
                      {server.server_url}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">Available Tools:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {server.available_tools && server.available_tools.length > 0 ? (
                        server.available_tools.slice(0, 3).map((tool) => (
                          <Badge key={tool} variant="secondary" className="text-xs">
                            {tool}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-xs">No tools discovered</span>
                      )}
                      {server.available_tools && server.available_tools.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{server.available_tools.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                {server.server_config && Object.keys(server.server_config).length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <span className="font-medium text-muted-foreground text-sm">Configuration:</span>
                    <div className="text-xs text-muted-foreground mt-1">
                      {Object.keys(server.server_config).length} configuration options set
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default MCPServersPage;