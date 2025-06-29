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

interface AgentFormProps {
  formData: FormData;
  editingAgent: Agent | null;
  isLoading: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
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

  return (
    <div className="max-w-md mx-auto">
      <form onSubmit={onSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>
              {editingAgent ? "Edit Agent" : "Create Agent"}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Create an AI agent with essential information
            </p>
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
                className="resize-y"
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
                    </SelectItem>
                  ))}
                  <SelectItem value="add-new">+ Add New Connection</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-3 pt-4">
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