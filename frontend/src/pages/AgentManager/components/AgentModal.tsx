import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Switch } from "@/components/ui/switch";
import { useConnections } from "@/hooks/useConnections";
import { useVoiceConnections } from "@/hooks/useVoiceConnections";
import type { AgentVoiceConfig } from "@/types/voice";
import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface Agent {
  agent_id: string;
  name: string;
  characteristics?: string;
  gender?: string;
  connection_id?: string;
  voice_config?: AgentVoiceConfig;
}

interface FormData {
  name: string;
  characteristics: string;
  gender: string;
  connection_id: string;
  voice_config?: AgentVoiceConfig;
}

interface AgentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: FormData;
  editingAgent: Agent | null;
  isLoading: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
}

const AgentModal: React.FC<AgentModalProps> = ({
  open,
  onOpenChange,
  formData,
  editingAgent,
  isLoading,
  onInputChange,
  onSubmit,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { loading: connectionsLoading, getActiveConnections } = useConnections();
  const activeConnections = getActiveConnections();
  
  const { connections: voiceConnections, loading: voiceConnectionsLoading } = useVoiceConnections();
  const activeVoiceConnections = voiceConnections.filter(vc => vc.is_active);
  
  
  const voiceConfig = formData.voice_config || {
    voice_enabled: false,
    voice_connection_id: undefined,
    selected_voice_id: undefined,
  };

  const handleConnectionChange = (connectionId: string) => {
    if (connectionId === "add-new") {
      navigate("/settings/connections");
      return;
    }

    const event = {
      target: { name: "connection_id", value: connectionId },
    } as React.ChangeEvent<HTMLInputElement>;
    onInputChange(event);
  };
  
  const handleVoiceEnabledChange = (enabled: boolean) => {
    const event = {
      target: {
        name: "voice_config",
        value: {
          ...voiceConfig,
          voice_enabled: enabled,
        },
      },
    } as any;
    onInputChange(event);
  };
  
  const handleVoiceConnectionChange = (connectionId: string) => {
    if (connectionId === "add-new") {
      navigate("/settings/voice-connections");
      return;
    }
    
    const event = {
      target: {
        name: "voice_config",
        value: {
          ...voiceConfig,
          voice_connection_id: connectionId,
        },
      },
    } as any;
    onInputChange(event);
  };
  

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(e);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingAgent ? t("agents.editAgent") : t("agents.createNewAgent")}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-sm font-medium">
                  {t("agents.agentName")} *
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={onInputChange}
                  placeholder={t("agents.namePlaceholder")}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="characteristics" className="text-sm font-medium">
                  {t("agents.characteristics")} *
                </Label>
                <Textarea
                  id="characteristics"
                  name="characteristics"
                  value={formData.characteristics}
                  onChange={onInputChange}
                  rows={3}
                  placeholder={t("agents.characteristicsPlaceholder")}
                  className="resize-none mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="gender" className="text-sm font-medium">
                  {t("agents.gender")} *
                </Label>
                <Select
                  value={formData.gender || "neutral"}
                  onValueChange={(value) => {
                    const event = {
                      target: { name: "gender", value },
                    } as React.ChangeEvent<HTMLInputElement>;
                    onInputChange(event);
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={t("agents.selectGender")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">{t("agents.male")}</SelectItem>
                    <SelectItem value="female">{t("agents.female")}</SelectItem>
                    <SelectItem value="neutral">{t("agents.neutral")}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("agents.genderDescription")}
                </p>
              </div>

              <div>
                <Label htmlFor="connection" className="text-sm font-medium">
                  {t("agents.modelConnection")} *
                </Label>
                <Select
                  value={formData.connection_id || ""}
                  onValueChange={handleConnectionChange}
                  disabled={connectionsLoading}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={t("agents.selectModelConnection")} />
                  </SelectTrigger>
                  <SelectContent>
                    {activeConnections.map((connection) => (
                      <SelectItem key={connection.id} value={connection.id}>
                        {connection.name} ({connection.provider})
                        {connection.is_default && ` • ${t("agents.default")}`}
                      </SelectItem>
                    ))}
                    <SelectItem value="add-new">{t("agents.addNewConnection")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <Label htmlFor="voice-enabled" className="text-sm font-medium">
                      {t("agents.voiceConfiguration")}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("agents.voiceConfigurationDescription")}
                    </p>
                  </div>
                  <Switch
                    id="voice-enabled"
                    checked={voiceConfig.voice_enabled}
                    onCheckedChange={handleVoiceEnabledChange}
                  />
                </div>
                
                {voiceConfig.voice_enabled && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="voice-connection" className="text-sm font-medium">
                        {t("agents.voiceConnection")}
                      </Label>
                      <Select
                        value={voiceConfig.voice_connection_id || ""}
                        onValueChange={handleVoiceConnectionChange}
                        disabled={voiceConnectionsLoading}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder={t("agents.selectVoiceConnection")} />
                        </SelectTrigger>
                        <SelectContent>
                          {activeVoiceConnections.map((connection) => (
                            <SelectItem key={connection.id} value={connection.id}>
                              {connection.name} ({connection.provider})
                              {connection.is_default && ` • ${t("agents.default")}`}
                            </SelectItem>
                          ))}
                          <SelectItem value="add-new">{t("agents.addVoiceConnection")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? t("agents.saving")
                : editingAgent
                ? t("agents.updateAgent")
                : t("agents.createAgent")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AgentModal;