import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Separator } from '@/components/ui/separator';
import { MCPToolManager } from './MCPToolManager';
import type { ModelConnection } from '@/types/connection';

interface MCPConnectionModalProps {
  connection: ModelConnection;
  isOpen: boolean;
  onClose: () => void;
}

export const MCPConnectionModal: React.FC<MCPConnectionModalProps> = ({
  connection,
  isOpen,
  onClose
}) => {
  const [selectedTools, setSelectedTools] = useState<string[]>([]);

  if (connection.provider !== 'mcp') {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="MCP Connection Details" size="lg">
      <div className="space-y-4">
        {/* Connection Info */}
        <div className="space-y-2">
          <h3 className="font-medium">{connection.name}</h3>
          {connection.description && (
            <p className="text-sm text-muted-foreground">{connection.description}</p>
          )}
          <div className="text-xs text-muted-foreground">
            <span className="font-medium">Server URL:</span> {connection.mcp_server_url || connection.base_url}
          </div>
        </div>

        <Separator />

        {/* MCP Tool Manager */}
        <MCPToolManager
          connection={connection}
          selectedTools={selectedTools}
          onToolsSelected={setSelectedTools}
        />

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