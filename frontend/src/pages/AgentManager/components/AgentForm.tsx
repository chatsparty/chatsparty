import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useConnections } from "@/hooks/useConnections";
import { useVoiceConnections } from "@/hooks/useVoiceConnections";
import type { AgentVoiceConfig } from "@/types/voice";
import React from "react";
import { useNavigate } from "react-router-dom";

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
  const { getActiveConnections } = useConnections();
  const { getTTSConnections } = useVoiceConnections();

  const activeConnections = getActiveConnections();
  const voiceConnections = getTTSConnections();

  const presetTemplates = [
    {
      name: "Business Analyst",
      prompt:
        "You are a business analyst. Focus on analyzing business requirements, identifying opportunities, and providing strategic insights.",
      characteristics:
        "Professional, analytical, detail-oriented, business-focused.",
    },
    {
      name: "Creative Writer",
      prompt:
        "You are a creative writer. Focus on storytelling, creative expression, and imaginative content creation.",
      characteristics: "Creative, imaginative, expressive, artistic.",
    },
    {
      name: "Technical Expert",
      prompt:
        "You are a technical expert. Focus on technical solutions, system architecture, and engineering best practices.",
      characteristics: "Technical, precise, methodical, solution-oriented.",
    },
    {
      name: "Project Manager",
      prompt:
        "You are a project manager. Focus on coordination, planning, risk management, and ensuring project success.",
      characteristics:
        "Organized, leadership-focused, deadline-driven, collaborative.",
    },
  ];

  const handleSelectChange = (field: string, value: string) => {
    const event = {
      target: { name: field, value },
    } as React.ChangeEvent<HTMLSelectElement>;
    onInputChange(event);
  };

  const handleConnectionChange = (connectionId: string) => {
    if (connectionId === "add-new") {
      navigate("/connections");
      return;
    }

    const event = {
      target: { name: "connection_id", value: connectionId },
    } as React.ChangeEvent<HTMLInputElement>;
    onInputChange(event);
  };

  const handleVoiceConnectionChange = (connectionId: string) => {
    if (connectionId === "add-new") {
      navigate("/settings", { state: { activeTab: "voice-connections" } });
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
      target: {
        name: `voice_config.podcast_settings.${setting}`,
        value: checked,
      },
    } as unknown as React.ChangeEvent<HTMLInputElement>;
    onInputChange(event);
  };

  const handleTemplateSelect = (template: (typeof presetTemplates)[0]) => {
    const nameEvent = {
      target: { name: "name", value: template.name },
    } as React.ChangeEvent<HTMLInputElement>;
    onInputChange(nameEvent);

    const promptEvent = {
      target: { name: "prompt", value: template.prompt },
    } as React.ChangeEvent<HTMLTextAreaElement>;
    onInputChange(promptEvent);

    const characteristicsEvent = {
      target: { name: "characteristics", value: template.characteristics },
    } as React.ChangeEvent<HTMLTextAreaElement>;
    onInputChange(characteristicsEvent);
  };

  return (
    <div className="h-[calc(100vh-12rem)] overflow-y-auto overflow-x-hidden scrollbar-hide">
      <form onSubmit={onSubmit} className="space-y-6 pb-6 max-w-full">
        {/* Quick Templates Section */}
        {!editingAgent && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Start Templates</CardTitle>
              <p className="text-sm text-muted-foreground">
                Choose a template to pre-fill the form
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {presetTemplates.map((template, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                    onClick={() => handleTemplateSelect(template)}
                  >
                    {template.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-sm font-medium">
                Agent Name *
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={onInputChange}
                placeholder="e.g., Business Analyst"
                required
                className="mt-1 w-full"
              />
            </div>

            <div>
              <Label htmlFor="characteristics" className="text-sm font-medium">
                Characteristics *
              </Label>
              <Textarea
                id="characteristics"
                name="characteristics"
                value={formData.characteristics}
                onChange={onInputChange}
                rows={3}
                placeholder="Describe the agent's personality, expertise, and behavioral traits..."
                className="mt-1 resize-y w-full"
                required
              />
            </div>

            <div>
              <Label htmlFor="prompt" className="text-sm font-medium">
                System Prompt *
              </Label>
              <Textarea
                id="prompt"
                name="prompt"
                value={formData.prompt}
                onChange={onInputChange}
                rows={6}
                placeholder="Detailed instructions for how the agent should behave and respond..."
                className="mt-1 resize-y w-full"
                required
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Model Connection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="connection" className="text-sm font-medium">
                Connection *
              </Label>
              <Select
                value={formData.connection_id || ""}
                onValueChange={handleConnectionChange}
              >
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue placeholder="Select a connection" />
                </SelectTrigger>
                <SelectContent>
                  {activeConnections.map((connection) => (
                    <SelectItem key={connection.id} value={connection.id}>
                      {connection.name} ({connection.provider}:{" "}
                      {connection.model_name})
                    </SelectItem>
                  ))}
                  <SelectItem value="add-new">+ Add New Connection</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Chat Style Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="friendliness" className="text-sm font-medium">
                  Friendliness
                </Label>
                <Select
                  value={formData.chat_style.friendliness}
                  onValueChange={(value) =>
                    handleSelectChange("chat_style.friendliness", value)
                  }
                >
                  <SelectTrigger className="mt-1 w-full">
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
                <Label
                  htmlFor="response_length"
                  className="text-sm font-medium"
                >
                  Response Length
                </Label>
                <Select
                  value={formData.chat_style.response_length}
                  onValueChange={(value) =>
                    handleSelectChange("chat_style.response_length", value)
                  }
                >
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">Short</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="long">Long</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="personality" className="text-sm font-medium">
                  Personality
                </Label>
                <Select
                  value={formData.chat_style.personality}
                  onValueChange={(value) =>
                    handleSelectChange("chat_style.personality", value)
                  }
                >
                  <SelectTrigger className="mt-1 w-full">
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
                <Label htmlFor="humor" className="text-sm font-medium">
                  Humor Level
                </Label>
                <Select
                  value={formData.chat_style.humor}
                  onValueChange={(value) =>
                    handleSelectChange("chat_style.humor", value)
                  }
                >
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="witty">Witty</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label
                  htmlFor="expertise_level"
                  className="text-sm font-medium"
                >
                  Expertise Level
                </Label>
                <Select
                  value={formData.chat_style.expertise_level}
                  onValueChange={(value) =>
                    handleSelectChange("chat_style.expertise_level", value)
                  }
                >
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="expert">Expert</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Voice Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="voice_enabled"
                checked={formData.voice_config.voice_enabled}
                onCheckedChange={handleVoiceEnabledChange}
              />
              <Label htmlFor="voice_enabled" className="text-sm font-medium">
                Enable Voice Features
              </Label>
            </div>

            {formData.voice_config.voice_enabled && (
              <>
                <div>
                  <Label
                    htmlFor="voice_connection"
                    className="text-sm font-medium"
                  >
                    Voice Connection
                  </Label>
                  <Select
                    value={formData.voice_config.voice_connection_id || ""}
                    onValueChange={handleVoiceConnectionChange}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select a voice connection" />
                    </SelectTrigger>
                    <SelectContent>
                      {voiceConnections.map((connection) => (
                        <SelectItem key={connection.id} value={connection.id}>
                          {connection.name} ({connection.provider})
                        </SelectItem>
                      ))}
                      <SelectItem value="add-new">
                        + Add New Voice Connection
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div>
                  <Label className="text-sm font-medium mb-3 block">
                    Podcast Settings
                  </Label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="intro_enabled"
                        checked={
                          formData.voice_config.podcast_settings
                            ?.intro_enabled ?? true
                        }
                        onCheckedChange={(checked) =>
                          handlePodcastSettingChange(
                            "intro_enabled",
                            checked as boolean
                          )
                        }
                      />
                      <Label htmlFor="intro_enabled" className="text-sm">
                        Enable Intro
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="outro_enabled"
                        checked={
                          formData.voice_config.podcast_settings
                            ?.outro_enabled ?? true
                        }
                        onCheckedChange={(checked) =>
                          handlePodcastSettingChange(
                            "outro_enabled",
                            checked as boolean
                          )
                        }
                      />
                      <Label htmlFor="outro_enabled" className="text-sm">
                        Enable Outro
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="background_music"
                        checked={
                          formData.voice_config.podcast_settings
                            ?.background_music ?? false
                        }
                        onCheckedChange={(checked) =>
                          handlePodcastSettingChange(
                            "background_music",
                            checked as boolean
                          )
                        }
                      />
                      <Label htmlFor="background_music" className="text-sm">
                        Background Music
                      </Label>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-3 pt-6 sticky bottom-0 bg-background border-t border-border p-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading
              ? "Saving..."
              : editingAgent
              ? "Update Agent"
              : "Create Agent"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AgentForm;
