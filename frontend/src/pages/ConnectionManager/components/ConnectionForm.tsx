import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  CreateConnectionRequest,
  ModelConnection,
} from "@/types/connection";
import axios from "axios";
import React, { useEffect, useState } from "react";
import { MCP_ENABLED } from "@/config/features";

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
  isLoading = false,
}) => {
  const isDefaultConnection = connection?.is_default === true;
  const [formData, setFormData] = useState<CreateConnectionRequest>({
    name: connection?.name || "",
    description: connection?.description || "",
    provider: connection?.provider || "",
    model_name: connection?.model_name || "",
    api_key: connection?.api_key || "",
    base_url: connection?.base_url || "",
    mcp_server_url: connection?.mcp_server_url || "",
    mcp_server_config: connection?.mcp_server_config || {},
    available_tools: connection?.available_tools || [],
    mcp_capabilities: connection?.mcp_capabilities || undefined,
  });

  const [providers, setProviders] = useState<
    Record<
      string,
      {
        models: string[];
        requires_api_key?: boolean;
        base_url_required?: boolean;
        supports_tools?: boolean;
        connection_type?: string;
      }
    >
  >({});
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);

  const [testingMcp, setTestingMcp] = useState(false);
  const [mcpTestResult, setMcpTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const response = await axios.get("/chat/providers");
        setProviders(response.data.providers || {});
      } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
          console.error("Failed to fetch providers:", error.message);
        } else {
          console.error("Failed to fetch providers:", error);
        }
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

  const handleChange = (
    field: keyof CreateConnectionRequest,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const submitData = { ...formData };
    if (isMcpProvider && !submitData.model_name) {
      submitData.model_name = "mcp-server";
    }

    await onSubmit(submitData);
  };

  const selectedProvider = formData.provider
    ? providers[formData.provider]
    : null;
  const requiresApiKey = selectedProvider?.requires_api_key || false;
  const requiresBaseUrl = selectedProvider?.base_url_required || false;
  const isMcpProvider = formData.provider === "mcp";

  const handleMcpTest = async () => {
    if (!formData.mcp_server_url) {
      setMcpTestResult({
        success: false,
        message: "Please enter an MCP server URL",
      });
      return;
    }

    setTestingMcp(true);
    setMcpTestResult(null);

    try {
      const response = await axios.post("/connections/mcp/test", {
        server_url: formData.mcp_server_url,
        server_config: formData.mcp_server_config,
      });

      setMcpTestResult({
        success: response.data.success,
        message: response.data.message,
      });
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        setMcpTestResult({
          success: false,
          message:
            error.response?.data?.detail || "Failed to test MCP connection",
        });
      } else {
        setMcpTestResult({
          success: false,
          message: "Failed to test MCP connection",
        });
      }
    } finally {
      setTestingMcp(false);
    }
  };

  if (isDefaultConnection) {
    return (
      <div className="h-[calc(100vh-12rem)] overflow-y-auto overflow-x-hidden scrollbar-hide">
        <Card>
          <CardHeader>
            <CardTitle>Default ChatsParty Connection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-md bg-blue-50 border border-blue-200 text-blue-800 dark:bg-blue-950/50 dark:border-blue-900/50 dark:text-blue-300">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium">ℹ️ Platform Default Connection</span>
              </div>
              <p>This is a default connection provided by the ChatsParty platform and cannot be modified.</p>
              <p className="mt-2">Model: <strong>{connection.model_name}</strong></p>
              <p>Provider: <strong>{connection.provider}</strong></p>
            </div>
            <Button type="button" variant="outline" onClick={onCancel}>
              Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-12rem)] overflow-y-auto overflow-x-hidden scrollbar-hide">
      <form onSubmit={handleSubmit} className="space-y-6 pb-6 max-w-full">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-sm font-medium">
                Connection Name *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="e.g., OpenAI GPT-4 Production"
                required
              />
            </div>

            <div>
              <Label htmlFor="description" className="text-sm font-medium">
                Description
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Optional description of this connection..."
                rows={2}
                className="resize-y"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Provider Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="provider" className="text-sm font-medium">
                AI Provider *
              </Label>
              <Select
                value={formData.provider}
                onValueChange={(value) => handleChange("provider", value)}
                disabled={loadingProviders}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue
                    placeholder={
                      loadingProviders
                        ? "Loading providers..."
                        : "Select a provider"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(providers)
                    .filter(provider => MCP_ENABLED || provider !== "mcp")
                    .map((provider) => (
                      <SelectItem key={provider} value={provider}>
                        {provider.charAt(0).toUpperCase() + provider.slice(1)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {!isMcpProvider && (
              <div>
                <Label htmlFor="model" className="text-sm font-medium">
                  Model *
                </Label>
                <Select
                  value={formData.model_name}
                  onValueChange={(value) => handleChange("model_name", value)}
                  disabled={!formData.provider || availableModels.length === 0}
                >
                  <SelectTrigger className="mt-1">
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
          </CardContent>
        </Card>

        {(requiresApiKey || requiresBaseUrl) && (
          <Card>
            <CardHeader>
              <CardTitle>Authentication</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {requiresApiKey && (
                <div>
                  <Label htmlFor="api_key" className="text-sm font-medium">
                    API Key *
                  </Label>
                  <Input
                    id="api_key"
                    type="password"
                    value={formData.api_key}
                    onChange={(e) => handleChange("api_key", e.target.value)}
                    placeholder="Enter your API key"
                    required
                  />
                </div>
              )}

              {requiresBaseUrl && (
                <div>
                  <Label htmlFor="base_url" className="text-sm font-medium">
                    Base URL *
                  </Label>
                  <Input
                    id="base_url"
                    value={formData.base_url}
                    onChange={(e) => handleChange("base_url", e.target.value)}
                    placeholder="https://api.openai.com/v1"
                    required
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {MCP_ENABLED && isMcpProvider && (
          <Card>
            <CardHeader>
              <CardTitle>MCP Server Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="mcp_server_url" className="text-sm font-medium">
                  MCP Server URL *
                </Label>
                <Input
                  id="mcp_server_url"
                  value={formData.mcp_server_url}
                  onChange={(e) =>
                    handleChange("mcp_server_url", e.target.value)
                  }
                  placeholder="ws://localhost:3000 or https://your-mcp-server.com"
                  required
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleMcpTest}
                  disabled={testingMcp || !formData.mcp_server_url}
                  className="flex-1"
                >
                  {testingMcp ? "Testing..." : "Test MCP Connection"}
                </Button>
              </div>

              {mcpTestResult && (
                <div
                  className={`p-3 rounded-lg text-sm ${
                    mcpTestResult.success
                      ? "bg-green-50 border border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200"
                      : "bg-red-50 border border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200"
                  }`}
                >
                  {mcpTestResult.message}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end space-x-3 pt-6">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading
              ? "Saving..."
              : connection
              ? "Update Connection"
              : "Create Connection"}
          </Button>
        </div>
      </form>
    </div>
  );
};
