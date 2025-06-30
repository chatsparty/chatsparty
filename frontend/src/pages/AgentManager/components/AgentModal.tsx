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
import { useConnections } from "@/hooks/useConnections";
import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface Agent {
  agent_id: string;
  name: string;
  characteristics?: string;
  connection_id?: string;
}

interface FormData {
  name: string;
  characteristics: string;
  connection_id: string;
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

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(e);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingAgent ? t("agents.editAgent") : t("agents.createNewAgent")}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleFormSubmit} className="space-y-4">
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
              className="resize-none"
              required
            />
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