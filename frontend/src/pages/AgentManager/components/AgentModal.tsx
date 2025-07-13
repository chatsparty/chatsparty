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
  id: string;
  name: string;
  characteristics?: string;
  connectionId?: string;
}

interface FormData {
  name: string;
  characteristics: string;
  connection_id: string;
}

interface FormErrors {
  name?: string;
  characteristics?: string;
  connection_id?: string;
}

interface AgentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: FormData;
  formErrors: FormErrors;
  editingAgent: Agent | null;
  isLoading: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
}

const AgentModal: React.FC<AgentModalProps> = ({
  open,
  onOpenChange,
  formData,
  formErrors,
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
                  className={`mt-1 ${formErrors.name ? 'border-red-500 focus:border-red-500' : ''}`}
                />
                {formErrors.name && (
                  <p className="text-sm text-red-500 mt-1">{formErrors.name}</p>
                )}
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
                  className={`resize-none mt-1 ${formErrors.characteristics ? 'border-red-500 focus:border-red-500' : ''}`}
                  required
                />
                {formErrors.characteristics && (
                  <p className="text-sm text-red-500 mt-1">{formErrors.characteristics}</p>
                )}
              </div>


              <div>
                <Label htmlFor="connection" className="text-sm font-medium">
                  {t("agents.modelConnection")} <span className="text-muted-foreground text-xs">{t("common.optional")}</span>
                </Label>
                <Select
                  value={formData.connection_id || ""}
                  onValueChange={handleConnectionChange}
                  disabled={connectionsLoading}
                >
                  <SelectTrigger className={`mt-1 ${formErrors.connection_id ? 'border-red-500 focus:border-red-500' : ''}`}>
                    <SelectValue placeholder={connectionsLoading ? t("common.loading") : t("agents.selectModelConnection")} />
                  </SelectTrigger>
                  <SelectContent>
                    {connectionsLoading ? (
                      <SelectItem value="loading" disabled>{t("common.loading")}</SelectItem>
                    ) : activeConnections.length === 0 ? (
                      <SelectItem value="no-connections" disabled>{t("agents.noConnectionsAvailable")}</SelectItem>
                    ) : (
                      <>
                        {activeConnections.map((connection) => (
                          <SelectItem key={connection.id} value={connection.id}>
                            {connection.name} ({connection.provider})
                            {connection.is_default && ` • ${t("agents.default")}`}
                          </SelectItem>
                        ))}
                        <SelectItem value="add-new">{t("agents.addNewConnection")}</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
                {formErrors.connection_id ? (
                  <p className="text-sm text-red-500 mt-1">{formErrors.connection_id}</p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("agents.connectionHelpText")}
                  </p>
                )}
              </div>
            </div>

          {Object.keys(formErrors).length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-4">
              <p className="text-sm text-red-700 font-medium">
                {t('errors.invalidInput')}
              </p>
              <p className="text-xs text-red-600 mt-1">
                {t('errors.pleaseCheckFields')}
              </p>
            </div>
          )}

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