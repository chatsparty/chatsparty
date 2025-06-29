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
            {editingAgent ? "Edit Agent" : "Create New Agent"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-sm font-medium">
              Agent Name *
            </Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={onInputChange}
              placeholder="e.g., My Assistant"
              required
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
              className="resize-none"
              required
            />
          </div>

          <div>
            <Label htmlFor="connection" className="text-sm font-medium">
              AI Model Connection *
            </Label>
            <Select
              value={formData.connection_id || ""}
              onValueChange={handleConnectionChange}
              disabled={connectionsLoading}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select a model connection" />
              </SelectTrigger>
              <SelectContent>
                {activeConnections.map((connection) => (
                  <SelectItem key={connection.id} value={connection.id}>
                    {connection.name} ({connection.provider})
                    {connection.is_default && " • Default"}
                  </SelectItem>
                ))}
                <SelectItem value="add-new">+ Add New Connection</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
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
      </DialogContent>
    </Dialog>
  );
};

export default AgentModal;