import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ModelConnection, CreateConnectionRequest } from '@/types/connection';
import axios from 'axios';

interface ConnectionFormProps {
  connection?: ModelConnection;
  onSubmit: (data: CreateConnectionRequest) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ConnectionForm: React.FC<ConnectionFormProps> = ({
  connection,
  onSubmit,
  onCancel,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<CreateConnectionRequest>({
    name: connection?.name || '',
    description: connection?.description || '',
    provider: connection?.provider || '',
    model_name: connection?.model_name || '',
    api_key: connection?.api_key || '',
    base_url: connection?.base_url || '',
    // MCP-specific fields
    mcp_server_url: connection?.mcp_server_url || '',
    mcp_server_config: connection?.mcp_server_config || {},
    available_tools: connection?.available_tools || [],
    mcp_capabilities: connection?.mcp_capabilities || undefined
  });

  const [providers, setProviders] = useState<Record<string, { models: string[]; requires_api_key?: boolean; base_url_required?: boolean; supports_tools?: boolean; connection_type?: string }>>({});
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  
  // MCP-specific state
  const [testingMcp, setTestingMcp] = useState(false);
  const [mcpTestResult, setMcpTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [discoveringTools, setDiscoveringTools] = useState(false);

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const response = await axios.get('/chat/providers');
        setProviders(response.data.providers || {});
      } catch (error) {
        console.error('Failed to fetch providers:', error);
      } finally {
        setLoadingProviders(false);
      }
    };

    fetchProviders();
  }, []);

  useEffect(() => {
    if (formData.provider && providers[formData.provider]) {
      setAvailableModels(providers[formData.provider].models || []);
    }
  }, [formData.provider, providers]);

  const handleChange = (field: keyof CreateConnectionRequest, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // For MCP provider, set model_name to 'mcp-server' if not provided
    const submitData = { ...formData };
    if (isMcpProvider && !submitData.model_name) {
      submitData.model_name = 'mcp-server';
    }
    
    await onSubmit(submitData);
  };

  const selectedProvider = formData.provider ? providers[formData.provider] : null;
  const requiresApiKey = selectedProvider?.requires_api_key || false;
  const requiresBaseUrl = selectedProvider?.base_url_required || false;
  const isMcpProvider = formData.provider === 'mcp';

  const handleMcpTest = async () => {
    if (!formData.mcp_server_url) {
      setMcpTestResult({ success: false, message: 'Please enter an MCP server URL' });
      return;
    }

    setTestingMcp(true);
    setMcpTestResult(null);

    try {
      const response = await axios.post('/connections/mcp/test', {
        server_url: formData.mcp_server_url,
        server_config: formData.mcp_server_config
      });

      setMcpTestResult({
        success: response.data.success,
        message: response.data.message
      });
    } catch (error: any) {
      setMcpTestResult({
        success: false,
        message: error.response?.data?.detail || 'Failed to test MCP connection'
      });
    } finally {
      setTestingMcp(false);
    }
  };

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-card-foreground">
          {connection ? 'Edit Connection' : 'Create New Connection'}
        </h2>
        <Button
          onClick={onCancel}
          variant="outline"
          size="sm"
        >
          Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-2 font-medium text-card-foreground">
            Connection Name *
          </label>
          <Input
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="e.g., OpenAI GPT-4 Production"
            required
          />
        </div>

        <div>
          <label className="block mb-2 font-medium text-card-foreground">
            Description
          </label>
          <Textarea
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Optional description of this connection..."
            rows={2}
          />
        </div>

        <div>
          <label className="block mb-2 font-medium text-card-foreground">
            AI Provider *
          </label>
          <Select
            value={formData.provider}
            onValueChange={(value) => handleChange('provider', value)}
            disabled={loadingProviders}
          >
            <SelectTrigger>
              <SelectValue placeholder={loadingProviders ? "Loading providers..." : "Select a provider"} />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(providers).map((provider) => (
                <SelectItem key={provider} value={provider}>
                  {provider.charAt(0).toUpperCase() + provider.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!isMcpProvider && (
          <div>
            <label className="block mb-2 font-medium text-card-foreground">
              Model *
            </label>
            <Select
              value={formData.model_name}
              onValueChange={(value) => handleChange('model_name', value)}
              disabled={!formData.provider || availableModels.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {availableModels.map((model) => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {requiresApiKey && (
          <div>
            <label className="block mb-2 font-medium text-card-foreground">
              API Key *
            </label>
            <Input
              type="password"
              value={formData.api_key}
              onChange={(e) => handleChange('api_key', e.target.value)}
              placeholder={`Enter your ${formData.provider} API key`}
              required
            />
            <p className="text-sm text-muted-foreground mt-1">
              Your API key will be stored securely
            </p>
          </div>
        )}

        {requiresBaseUrl && !isMcpProvider && (
          <div>
            <label className="block mb-2 font-medium text-card-foreground">
              Base URL
            </label>
            <Input
              value={formData.base_url}
              onChange={(e) => handleChange('base_url', e.target.value)}
              placeholder="http://localhost:11434"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Leave empty to use default URL
            </p>
          </div>
        )}

        {isMcpProvider && (
          <>
            <div>
              <label className="block mb-2 font-medium text-card-foreground">
                MCP Server URL *
              </label>
              <Input
                value={formData.mcp_server_url}
                onChange={(e) => handleChange('mcp_server_url', e.target.value)}
                placeholder="https://api.example.com/mcp or stdio://uvx mcp-server"
                required
              />
              <p className="text-sm text-muted-foreground mt-1">
                Supported formats: https://api.example.com/mcp (remote), stdio://command (local)
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleMcpTest}
                disabled={testingMcp || !formData.mcp_server_url}
              >
                {testingMcp ? 'Testing...' : 'Test Connection'}
              </Button>
            </div>

            {mcpTestResult && (
              <div className={`p-3 rounded-md text-sm ${
                mcpTestResult.success 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {mcpTestResult.message}
              </div>
            )}

            {formData.available_tools && formData.available_tools.length > 0 && (
              <div>
                <label className="block mb-2 font-medium text-card-foreground">
                  Available Tools ({formData.available_tools.length})
                </label>
                <div className="max-h-32 overflow-y-auto bg-muted/30 rounded p-2">
                  {formData.available_tools.map((tool, index) => (
                    <div key={index} className="text-sm py-1">
                      <span className="font-medium">{tool.name}</span>
                      {tool.description && (
                        <span className="text-muted-foreground ml-2">- {tool.description}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="flex gap-2 pt-4">
          <Button
            type="submit"
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? 'Saving...' : connection ? 'Update Connection' : 'Create Connection'}
          </Button>
        </div>
      </form>
    </div>
  );
};