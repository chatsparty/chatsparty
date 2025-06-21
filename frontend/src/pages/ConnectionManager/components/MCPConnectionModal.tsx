import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import type { ModelConnection } from "@/types/connection";
import React, { useState } from "react";
import { MCPToolManager } from "./MCPToolManager";

interface MCPConnectionModalProps {
  connection: ModelConnection;
  isOpen: boolean;
  onClose: () => void;
}

export const MCPConnectionModal: React.FC<MCPConnectionModalProps> = ({
  connection,
  isOpen,
  onClose,
}) => {
  const [selectedTools, setSelectedTools] = useState<string[]>([]);

  if (connection.provider !== "mcp") {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="MCP Connection Details"
      size="lg"
    >
      <div className="space-y-4 max-h-[70vh] overflow-y-auto">
        {/* Connection Information Section */}
        <Card>
          <CardHeader>
            <CardTitle>Connection Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <h4 className="font-medium text-sm text-muted-foreground">
                Name
              </h4>
              <p className="font-semibold">{connection.name}</p>
            </div>

            {connection.description && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground">
                  Description
                </h4>
                <p className="text-sm">{connection.description}</p>
              </div>
            )}

            <div>
              <h4 className="font-medium text-sm text-muted-foreground">
                Server URL
              </h4>
              <p className="text-sm font-mono bg-muted px-2 py-1 rounded">
                {connection.mcp_server_url || connection.base_url}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* MCP Tools Section */}
        <Card>
          <CardHeader>
            <CardTitle>Available Tools</CardTitle>
          </CardHeader>
          <CardContent>
            <MCPToolManager
              connection={connection}
              selectedTools={selectedTools}
              onToolsSelected={setSelectedTools}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
