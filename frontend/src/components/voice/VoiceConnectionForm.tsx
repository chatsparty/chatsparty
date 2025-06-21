import React, { useState, useEffect } from "react";
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
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type {
  VoiceConnection,
  CreateVoiceConnectionRequest,
  VoiceProvider,
  VoiceOption,
  VoiceConnectionTestResult,
} from "@/types/voice";
import { voiceConnectionApi } from "@/services/voiceConnectionApi";
import { VoiceConnectionTestModal } from "./VoiceConnectionTestModal";

interface VoiceConnectionFormProps {
  connection?: VoiceConnection;
  onSubmit: (data: CreateVoiceConnectionRequest) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const VOICE_PROVIDERS: Record<string, VoiceProvider> = {
  elevenlabs: {
    id: "elevenlabs",
    name: "ElevenLabs",
    supported_types: ["tts"],
    requires_api_key: true,
    default_base_url: "https://api.elevenlabs.io/v1",
  },
  openai: {
    id: "openai",
    name: "OpenAI",
    supported_types: ["tts", "stt", "both"],
    requires_api_key: true,
    default_base_url: "https://api.openai.com/v1",
  },
  google: {
    id: "google",
    name: "Google Cloud",
    supported_types: ["tts", "stt", "both"],
    requires_api_key: true,
    default_base_url: "https://texttospeech.googleapis.com/v1",
  },
  chatsparty: {
    id: "chatsparty",
    name: "ChatsParty Cloud",
    supported_types: ["tts", "stt", "both"],
    requires_api_key: false,
  },
};

const VOICE_STYLES = [
  { value: "conversational", label: "Conversational" },
  { value: "podcast", label: "Podcast" },
  { value: "professional", label: "Professional" },
  { value: "narrative", label: "Narrative" },
];

export const VoiceConnectionForm: React.FC<VoiceConnectionFormProps> = ({
  connection,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<CreateVoiceConnectionRequest>({
    name: connection?.name || "",
    description: connection?.description || "",
    provider: connection?.provider || "",
    provider_type: connection?.provider_type || "tts",
    voice_id: connection?.voice_id || "",
    speed: connection?.speed || 1.0,
    pitch: connection?.pitch || 1.0,
    stability: connection?.stability || 0.75,
    clarity: connection?.clarity || 0.8,
    style: connection?.style || "conversational",
    api_key: connection?.api_key || "",
    base_url: connection?.base_url || "",
    is_cloud_proxy: connection?.is_cloud_proxy || false,
  });

  const [availableVoices, setAvailableVoices] = useState<VoiceOption[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] =
    useState<VoiceConnectionTestResult | null>(null);
  const [showTestModal, setShowTestModal] = useState(false);

  const selectedProvider = formData.provider
    ? VOICE_PROVIDERS[formData.provider]
    : null;
  const requiresApiKey =
    selectedProvider?.requires_api_key && !formData.is_cloud_proxy;
  const supportsMultipleTypes =
    selectedProvider?.supported_types.includes("both") ||
    (selectedProvider?.supported_types.includes("tts") &&
      selectedProvider?.supported_types.includes("stt"));

  useEffect(() => {
    const loadVoices = async () => {
      if (!formData.provider || !formData.api_key) return;

      setLoadingVoices(true);
      try {
        if (formData.provider === "openai") {
          setAvailableVoices([
            {
              id: "alloy",
              name: "Alloy",
              description: "Neutral, balanced voice",
              category: "generated",
            },
            {
              id: "echo",
              name: "Echo",
              description: "Male voice with slight echo",
              category: "generated",
            },
            {
              id: "fable",
              name: "Fable",
              description: "Storytelling voice",
              category: "generated",
            },
            {
              id: "onyx",
              name: "Onyx",
              description: "Deep male voice",
              category: "generated",
            },
            {
              id: "nova",
              name: "Nova",
              description: "Young female voice",
              category: "generated",
            },
            {
              id: "shimmer",
              name: "Shimmer",
              description: "Soft female voice",
              category: "generated",
            },
          ]);
        }
      } catch (error) {
        console.error("Failed to load voices:", error);
      } finally {
        setLoadingVoices(false);
      }
    };

    loadVoices();
  }, [formData.provider, formData.api_key]);

  const handleChange = (
    field: keyof CreateVoiceConnectionRequest,
    value: any
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (
      field === "provider" &&
      value &&
      VOICE_PROVIDERS[value]?.default_base_url
    ) {
      setFormData((prev) => ({
        ...prev,
        base_url: VOICE_PROVIDERS[value].default_base_url || "",
      }));
    }

    if (field === "provider") {
      setFormData((prev) => ({
        ...prev,
        voice_id: "",
      }));
      setAvailableVoices([]);
    }
  };

  const handleSliderChange = (field: string, values: number[]) => {
    handleChange(field as keyof CreateVoiceConnectionRequest, values[0]);
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    setShowTestModal(true);

    try {
      console.log("Testing voice connection...", formData);

      const result = await voiceConnectionApi.testVoiceConnectionData(formData);
      setTestResult(result);
    } catch (error: any) {
      console.error("Connection test failed:", error);

      let errorMessage = "Connection test failed. Please check your settings.";

      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.message) {
        errorMessage = error.message;
      }

      setTestResult({
        success: false,
        message: errorMessage,
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleCloseTestModal = () => {
    setShowTestModal(false);
    setTestResult(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-card-foreground">
          {connection ? "Edit Voice Connection" : "Create New Voice Connection"}
        </h2>
        <Button onClick={onCancel} variant="outline" size="sm">
          Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-card-foreground">
            Basic Information
          </h3>

          <div>
            <Label htmlFor="name">Connection Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="e.g., ElevenLabs Production Voice"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Optional description of this voice connection..."
              rows={2}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium text-card-foreground">
            Provider Configuration
          </h3>

          <div>
            <Label htmlFor="provider">Voice Provider *</Label>
            <Select
              value={formData.provider}
              onValueChange={(value) => handleChange("provider", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a voice provider" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(VOICE_PROVIDERS).map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    {provider.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {supportsMultipleTypes && (
            <div>
              <Label htmlFor="provider_type">Service Type *</Label>
              <Select
                value={formData.provider_type}
                onValueChange={(value) => handleChange("provider_type", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select service type" />
                </SelectTrigger>
                <SelectContent>
                  {selectedProvider?.supported_types.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type === "tts"
                        ? "Text-to-Speech (TTS)"
                        : type === "stt"
                        ? "Speech-to-Text (STT)"
                        : "Both TTS and STT"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedProvider?.id === "chatsparty" && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_cloud_proxy"
                checked={formData.is_cloud_proxy}
                onCheckedChange={(checked) =>
                  handleChange("is_cloud_proxy", checked)
                }
              />
              <Label htmlFor="is_cloud_proxy">
                Use ChatsParty Cloud (no API key required)
              </Label>
            </div>
          )}

          {requiresApiKey && (
            <div>
              <Label htmlFor="api_key">API Key *</Label>
              <Input
                id="api_key"
                type="password"
                value={formData.api_key}
                onChange={(e) => handleChange("api_key", e.target.value)}
                placeholder={`Enter your ${selectedProvider?.name} API key`}
                required
              />
              <p className="text-sm text-muted-foreground mt-1">
                Your API key will be stored securely and encrypted
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="base_url">Base URL</Label>
            <Input
              id="base_url"
              value={formData.base_url}
              onChange={(e) => handleChange("base_url", e.target.value)}
              placeholder={
                selectedProvider?.default_base_url || "Custom base URL"
              }
            />
            <p className="text-sm text-muted-foreground mt-1">
              Leave empty to use the default URL
            </p>
          </div>
        </div>

        {(formData.provider_type === "tts" ||
          formData.provider_type === "both") && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-card-foreground">
              Voice Settings
            </h3>

            {availableVoices.length > 0 && (
              <div>
                <Label htmlFor="voice_id">Voice</Label>
                <Select
                  value={formData.voice_id}
                  onValueChange={(value) => handleChange("voice_id", value)}
                  disabled={loadingVoices}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        loadingVoices ? "Loading voices..." : "Select a voice"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {availableVoices.map((voice) => (
                      <SelectItem key={voice.id} value={voice.id}>
                        {voice.name} - {voice.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="style">Voice Style</Label>
              <Select
                value={formData.style}
                onValueChange={(value) => handleChange("style", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select voice style" />
                </SelectTrigger>
                <SelectContent>
                  {VOICE_STYLES.map((style) => (
                    <SelectItem key={style.value} value={style.value}>
                      {style.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="speed">
                  Speed: {formData.speed?.toFixed(2)}x
                </Label>
                <Slider
                  id="speed"
                  min={0.1}
                  max={3.0}
                  step={0.1}
                  value={[formData.speed || 1.0]}
                  onValueChange={(values) =>
                    handleSliderChange("speed", values)
                  }
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="pitch">
                  Pitch: {formData.pitch?.toFixed(2)}
                </Label>
                <Slider
                  id="pitch"
                  min={0.1}
                  max={3.0}
                  step={0.1}
                  value={[formData.pitch || 1.0]}
                  onValueChange={(values) =>
                    handleSliderChange("pitch", values)
                  }
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="stability">
                  Stability: {formData.stability?.toFixed(2)}
                </Label>
                <Slider
                  id="stability"
                  min={0.0}
                  max={1.0}
                  step={0.05}
                  value={[formData.stability || 0.75]}
                  onValueChange={(values) =>
                    handleSliderChange("stability", values)
                  }
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="clarity">
                  Clarity: {formData.clarity?.toFixed(2)}
                </Label>
                <Slider
                  id="clarity"
                  min={0.0}
                  max={1.0}
                  step={0.05}
                  value={[formData.clarity || 0.8]}
                  onValueChange={(values) =>
                    handleSliderChange("clarity", values)
                  }
                  className="mt-2"
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleTestConnection}
            disabled={
              testingConnection ||
              !formData.provider ||
              (requiresApiKey && !formData.api_key)
            }
            className="flex-1"
          >
            {testingConnection ? "Testing..." : "Test Connection"}
          </Button>

          <Button type="submit" disabled={isLoading} className="flex-1">
            {isLoading
              ? "Saving..."
              : connection
              ? "Update Connection"
              : "Create Connection"}
          </Button>
        </div>
      </form>

      <VoiceConnectionTestModal
        isOpen={showTestModal}
        onClose={handleCloseTestModal}
        testResult={testResult}
        isLoading={testingConnection}
      />
    </div>
  );
};
