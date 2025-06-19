import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useConnections } from "@/hooks/useConnections";
import { useVoiceConnections } from "@/hooks/useVoiceConnections";
import type { AgentVoiceConfig } from "@/types/voice";

interface ChatStyle {
  friendliness: "friendly" | "neutral" | "formal";
  response_length: "short" | "medium" | "long";
  personality: "enthusiastic" | "balanced" | "reserved";
  humor: "none" | "light" | "witty";
  expertise_level: "beginner" | "intermediate" | "expert";
}

interface Agent {
  agent_id: string;
  name: string;
  prompt: string;
  characteristics: string;
  connection_id?: string;
  chat_style?: ChatStyle;
  voice_config?: AgentVoiceConfig;
}

interface FormData {
  name: string;
  prompt: string;
  characteristics: string;
  connection_id: string;
  chat_style: ChatStyle;
  voice_config: AgentVoiceConfig;
}

interface AgentFormProps {
  formData: FormData;
  editingAgent: Agent | null;
  isLoading: boolean;
  onInputChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

const AgentForm: React.FC<AgentFormProps> = ({
  formData,
  editingAgent,
  isLoading,
  onInputChange,
  onSubmit,
  onCancel,
}) => {
  const navigate = useNavigate();
  const { loading: connectionsLoading, getActiveConnections } = useConnections();
  const { getTTSConnections } = useVoiceConnections();
  
  const activeConnections = getActiveConnections();
  const selectedConnection = activeConnections.find(conn => conn.id === formData.connection_id);
  const voiceConnections = getTTSConnections();
  const selectedVoiceConnection = voiceConnections.find(conn => conn.id === formData.voice_config.voice_connection_id);
  const handleSelectChange = (field: string, value: string) => {
    const event = {
      target: { name: field, value },
    } as React.ChangeEvent<HTMLSelectElement>;
    onInputChange(event);
  };

  const handleConnectionChange = (connectionId: string) => {
    if (connectionId === "add-new") {
      navigate('/connections');
      return;
    }

    const event = {
      target: { name: "connection_id", value: connectionId },
    } as React.ChangeEvent<HTMLInputElement>;
    onInputChange(event);
  };

  const handleVoiceConnectionChange = (connectionId: string) => {
    if (connectionId === "add-new") {
      navigate('/settings', { state: { activeTab: 'voice-connections' } });
      return;
    }

    const event = {
      target: { name: "voice_config.voice_connection_id", value: connectionId },
    } as React.ChangeEvent<HTMLInputElement>;
    onInputChange(event);
  };

  const handleVoiceEnabledChange = (checked: boolean) => {
    const event = {
      target: { name: "voice_config.voice_enabled", value: checked },
    } as unknown as React.ChangeEvent<HTMLInputElement>;
    onInputChange(event);
  };

  const handlePodcastSettingChange = (setting: string, checked: boolean) => {
    const event = {
      target: { name: `voice_config.podcast_settings.${setting}`, value: checked },
    } as unknown as React.ChangeEvent<HTMLInputElement>;
    onInputChange(event);
  };

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="flex justify-between items-center p-5 border-b border-border">
        <h2 className="text-lg font-semibold text-card-foreground">
          {editingAgent ? "Edit Agent" : "Create New Agent"}
        </h2>
        <Button onClick={onCancel} variant="outline" size="sm">
          Cancel
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <form onSubmit={onSubmit} className="flex flex-col min-h-full">
          <div className="flex-1 p-5 pb-0">
            <div className="space-y-5">

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
                  Model Connection
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block mb-2 font-medium text-card-foreground">
                      Connection *
                    </label>
                    <Select
                      value={formData.connection_id || ""}
                      onValueChange={handleConnectionChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a connection" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeConnections.map((connection) => (
                          <SelectItem key={connection.id} value={connection.id}>
                            <div className="flex flex-col">
                              <span>{connection.name}</span>
                              <span className="text-sm text-muted-foreground">
                                {connection.provider} • {connection.model_name}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                        <SelectItem value="add-new">
                          <div className="flex items-center gap-2 text-primary">
                            <span>+ Add New Connection</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {activeConnections.length === 0 && !connectionsLoading && (
                      <p className="text-sm text-muted-foreground mt-1">
                        No active connections available. Create a connection first in the Connections tab.
                      </p>
                    )}
                  </div>

                  {selectedConnection && (
                    <div className="p-3 bg-muted rounded-lg">
                      <h4 className="font-medium mb-2">Selected Connection Details:</h4>
                      <div className="text-sm space-y-1">
                        <p><span className="font-medium">Provider:</span> {selectedConnection.provider}</p>
                        <p><span className="font-medium">Model:</span> {selectedConnection.model_name}</p>
                        {selectedConnection.description && (
                          <p><span className="font-medium">Description:</span> {selectedConnection.description}</p>
                        )}
                      </div>
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
                      onValueChange={(value) =>
                        handleSelectChange("chat_style.friendliness", value)
                      }
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
                      onValueChange={(value) =>
                        handleSelectChange("chat_style.response_length", value)
                      }
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
                      onValueChange={(value) =>
                        handleSelectChange("chat_style.personality", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="enthusiastic">
                          Enthusiastic
                        </SelectItem>
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
                      onValueChange={(value) =>
                        handleSelectChange("chat_style.humor", value)
                      }
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
                      onValueChange={(value) =>
                        handleSelectChange("chat_style.expertise_level", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">
                          Beginner-friendly
                        </SelectItem>
                        <SelectItem value="intermediate">
                          Intermediate
                        </SelectItem>
                        <SelectItem value="expert">Expert Level</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="mb-4 font-bold text-card-foreground text-lg">
                  Voice Configuration
                </h3>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="voice_enabled"
                      checked={formData.voice_config.voice_enabled}
                      onCheckedChange={handleVoiceEnabledChange}
                    />
                    <Label htmlFor="voice_enabled" className="font-medium">
                      Enable voice for this agent
                    </Label>
                  </div>

                  {formData.voice_config.voice_enabled && (
                    <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                      <div>
                        <label className="block mb-2 font-medium text-card-foreground">
                          Voice Connection
                        </label>
                        <Select
                          value={formData.voice_config.voice_connection_id || ""}
                          onValueChange={handleVoiceConnectionChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a voice connection" />
                          </SelectTrigger>
                          <SelectContent>
                            {voiceConnections.map((connection) => (
                              <SelectItem key={connection.id} value={connection.id}>
                                <div className="flex flex-col">
                                  <span>{connection.name}</span>
                                  <span className="text-sm text-muted-foreground">
                                    {connection.provider} • {connection.style} • {connection.provider_type.toUpperCase()}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                            <SelectItem value="add-new">
                              <div className="flex items-center gap-2 text-primary">
                                <span>+ Add New Voice Connection</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        {voiceConnections.length === 0 && (
                          <p className="text-sm text-muted-foreground mt-1">
                            No voice connections available. Create a voice connection first in Settings.
                          </p>
                        )}
                      </div>

                      {selectedVoiceConnection && (
                        <div className="p-3 bg-muted rounded-lg">
                          <h4 className="font-medium mb-2">Selected Voice Connection Details:</h4>
                          <div className="text-sm space-y-1">
                            <p><span className="font-medium">Provider:</span> {selectedVoiceConnection.provider}</p>
                            <p><span className="font-medium">Voice ID:</span> {selectedVoiceConnection.voice_id || 'Default'}</p>
                            <p><span className="font-medium">Style:</span> {selectedVoiceConnection.style}</p>
                            <p><span className="font-medium">Speed:</span> {selectedVoiceConnection.speed}x</p>
                            {selectedVoiceConnection.description && (
                              <p><span className="font-medium">Description:</span> {selectedVoiceConnection.description}</p>
                            )}
                          </div>
                        </div>
                      )}

                      <div>
                        <h4 className="font-medium mb-3 text-card-foreground">Podcast Settings</h4>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="intro_enabled"
                              checked={formData.voice_config.podcast_settings?.intro_enabled || false}
                              onCheckedChange={(checked) => handlePodcastSettingChange('intro_enabled', checked as boolean)}
                            />
                            <Label htmlFor="intro_enabled" className="text-sm">
                              Include intro when generating podcasts
                            </Label>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="outro_enabled"
                              checked={formData.voice_config.podcast_settings?.outro_enabled || false}
                              onCheckedChange={(checked) => handlePodcastSettingChange('outro_enabled', checked as boolean)}
                            />
                            <Label htmlFor="outro_enabled" className="text-sm">
                              Include outro when generating podcasts
                            </Label>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="background_music"
                              checked={formData.voice_config.podcast_settings?.background_music || false}
                              onCheckedChange={(checked) => handlePodcastSettingChange('background_music', checked as boolean)}
                            />
                            <Label htmlFor="background_music" className="text-sm">
                              Add background music to podcasts
                            </Label>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
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
              {isLoading
                ? "Creating..."
                : editingAgent
                ? "Update Agent"
                : "Create Agent"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AgentForm;
