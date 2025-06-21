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
    base_url: connection?.base_url || ''
  });

  const [providers, setProviders] = useState<Record<string, { models: string[]; requires_api_key?: boolean; base_url_required?: boolean }>>({});
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);

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
    await onSubmit(formData);
  };

  const selectedProvider = formData.provider ? providers[formData.provider] : null;
  const requiresApiKey = selectedProvider?.requires_api_key || false;
  const requiresBaseUrl = selectedProvider?.base_url_required || false;

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

        {requiresBaseUrl && (
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