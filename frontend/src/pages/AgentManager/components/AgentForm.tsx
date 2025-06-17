import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import axios from 'axios';

interface ChatStyle {
  friendliness: 'friendly' | 'neutral' | 'formal';
  response_length: 'short' | 'medium' | 'long';
  personality: 'enthusiastic' | 'balanced' | 'reserved';
  humor: 'none' | 'light' | 'witty';
  expertise_level: 'beginner' | 'intermediate' | 'expert';
}

interface ModelConfig {
  provider: string;
  model_name: string;
  api_key?: string;
  base_url?: string;
}

interface Agent {
  agent_id: string;
  name: string;
  prompt: string;
  characteristics: string;
  model_configuration?: ModelConfig;
  chat_style?: ChatStyle;
}

interface FormData {
  agent_id: string;
  name: string;
  prompt: string;
  characteristics: string;
  model_configuration: ModelConfig;
  chat_style: ChatStyle;
}

interface AgentFormProps {
  formData: FormData;
  editingAgent: Agent | null;
  isLoading: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

const AgentForm: React.FC<AgentFormProps> = ({
  formData,
  editingAgent,
  isLoading,
  onInputChange,
  onSubmit,
  onCancel
}) => {
  const [providers, setProviders] = useState<Record<string, { models: string[]; requires_api_key?: boolean; base_url_required?: boolean }>>({});
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const response = await axios.get('http://localhost:8000/chat/providers');
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
    if (formData.model_configuration?.provider && providers[formData.model_configuration.provider]) {
      setAvailableModels(providers[formData.model_configuration.provider].models || []);
    }
  }, [formData.model_configuration?.provider, providers]);

  const handleSelectChange = (field: string, value: string) => {
    const event = {
      target: { name: field, value }
    } as React.ChangeEvent<HTMLSelectElement>;
    onInputChange(event);
  };

  const handleModelConfigChange = (field: string, value: string) => {
    const event = {
      target: { name: `model_configuration.${field}`, value }
    } as React.ChangeEvent<HTMLInputElement>;
    onInputChange(event);
  };

  const selectedProvider = formData.model_configuration?.provider ? providers[formData.model_configuration.provider] : null;
  const requiresApiKey = selectedProvider?.requires_api_key || false;
  const requiresBaseUrl = selectedProvider?.base_url_required || false;

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="flex justify-between items-center p-5 border-b border-border">
        <h2 className="text-lg font-semibold text-card-foreground">
          {editingAgent ? 'Edit Agent' : 'Create New Agent'}
        </h2>
        <Button
          onClick={onCancel}
          variant="outline"
          size="sm"
        >
          Cancel
        </Button>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <form onSubmit={onSubmit} className="flex flex-col min-h-full">
          <div className="flex-1 p-5 pb-0">
            <div className="space-y-5">
              <div>
                <label className="block mb-2 font-medium text-card-foreground">
                  Agent ID *
                </label>
                <Input
                  name="agent_id"
                  value={formData.agent_id}
                  onChange={onInputChange}
                  placeholder="e.g., business-analyst"
                  disabled={editingAgent !== null}
                  className={editingAgent ? "bg-muted" : ""}
                  required
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Unique identifier for the agent (cannot be changed after creation)
                </p>
              </div>

              <div>
                <label className="block mb-2 font-medium text-card-foreground">
                  Agent Name *
                </label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={onInputChange}
                  placeholder="e.g., Business Analyst"
                  required
                />
              </div>

              <div>
                <label className="block mb-2 font-medium text-card-foreground">
                  Characteristics *
                </label>
                <Textarea
                  name="characteristics"
                  value={formData.characteristics}
                  onChange={onInputChange}
                  rows={3}
                  placeholder="Describe the agent's personality, expertise, and behavioral traits..."
                  className="resize-y"
                  required
                />
              </div>

              <div>
                <label className="block mb-2 font-medium text-card-foreground">
                  System Prompt *
                </label>
                <Textarea
                  name="prompt"
                  value={formData.prompt}
                  onChange={onInputChange}
                  rows={6}
                  placeholder="Detailed instructions for how the agent should behave and respond..."
                  className="resize-y"
                  required
                />
              </div>

              <Separator />

              <div>
                <h3 className="mb-4 font-bold text-card-foreground text-lg">
                  Model Configuration
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block mb-2 font-medium text-card-foreground">
                      AI Provider *
                    </label>
                    <Select
                      value={formData.model_configuration?.provider || ''}
                      onValueChange={(value) => handleModelConfigChange('provider', value)}
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
                      value={formData.model_configuration?.model_name || ''}
                      onValueChange={(value) => handleModelConfigChange('model_name', value)}
                      disabled={!formData.model_configuration?.provider || availableModels.length === 0}
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
                        value={formData.model_configuration?.api_key || ''}
                        onChange={(e) => handleModelConfigChange('api_key', e.target.value)}
                        placeholder={`Enter your ${formData.model_configuration?.provider || 'provider'} API key`}
                        required
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Your API key will be used securely for this agent only
                      </p>
                    </div>
                  )}

                  {requiresBaseUrl && (
                    <div>
                      <label className="block mb-2 font-medium text-card-foreground">
                        Base URL
                      </label>
                      <Input
                        value={formData.model_configuration?.base_url || ''}
                        onChange={(e) => handleModelConfigChange('base_url', e.target.value)}
                        placeholder="http://localhost:11434"
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Leave empty to use default URL
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="mb-4 font-bold text-card-foreground text-lg">
                  Chat Style Settings
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-2 font-medium text-card-foreground">
                      Friendliness
                    </label>
                    <Select
                      value={formData.chat_style.friendliness}
                      onValueChange={(value) => handleSelectChange('chat_style.friendliness', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="friendly">Friendly</SelectItem>
                        <SelectItem value="neutral">Neutral</SelectItem>
                        <SelectItem value="formal">Formal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block mb-2 font-medium text-card-foreground">
                      Response Length
                    </label>
                    <Select
                      value={formData.chat_style.response_length}
                      onValueChange={(value) => handleSelectChange('chat_style.response_length', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="short">Short & Concise</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="long">Detailed & Long</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block mb-2 font-medium text-card-foreground">
                      Personality
                    </label>
                    <Select
                      value={formData.chat_style.personality}
                      onValueChange={(value) => handleSelectChange('chat_style.personality', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                        <SelectItem value="balanced">Balanced</SelectItem>
                        <SelectItem value="reserved">Reserved</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block mb-2 font-medium text-card-foreground">
                      Humor Level
                    </label>
                    <Select
                      value={formData.chat_style.humor}
                      onValueChange={(value) => handleSelectChange('chat_style.humor', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Humor</SelectItem>
                        <SelectItem value="light">Light Humor</SelectItem>
                        <SelectItem value="witty">Witty</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-2">
                    <label className="block mb-2 font-medium text-card-foreground">
                      Expertise Level
                    </label>
                    <Select
                      value={formData.chat_style.expertise_level}
                      onValueChange={(value) => handleSelectChange('chat_style.expertise_level', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner-friendly</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="expert">Expert Level</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Submit button fixed at bottom */}
          <div className="border-t border-border p-5 flex-shrink-0">
            <Button
              type="submit"
              size="lg"
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Creating...' : editingAgent ? 'Update Agent' : 'Create Agent'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AgentForm;