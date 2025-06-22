import { Button } from "@/components/ui/button";
import { useVoiceConnections } from "@/hooks/useVoiceConnections";
import type {
  CreateVoiceConnectionRequest,
  VoiceConnection,
} from "@/types/voice";
import React, { useState } from "react";
import { VoiceConnectionForm } from "./VoiceConnectionForm";
import { VoiceConnectionsTable } from "./VoiceConnectionsTable";

interface VoiceConnectionListProps {
  className?: string;
}

export const VoiceConnectionList: React.FC<VoiceConnectionListProps> = ({
  className,
}) => {
  const {
    connections,
    loading,
    createConnection,
    updateConnection,
    deleteConnection,
    testConnection,
  } = useVoiceConnections();

  const [showForm, setShowForm] = useState(false);
  const [editingConnection, setEditingConnection] = useState<
    VoiceConnection | undefined
  >();
  const [formLoading, setFormLoading] = useState(false);

  const handleCreateConnection = async (data: CreateVoiceConnectionRequest) => {
    try {
      setFormLoading(true);
      await createConnection(data);
      setShowForm(false);
      setEditingConnection(undefined);
    } catch (error) {
      console.error("Failed to create voice connection:", error);
      throw error;
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateConnection = async (data: CreateVoiceConnectionRequest) => {
    if (!editingConnection) return;

    try {
      setFormLoading(true);
      await updateConnection(editingConnection.id, data);
      setShowForm(false);
      setEditingConnection(undefined);
    } catch (error) {
      console.error("Failed to update voice connection:", error);
      throw error;
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteConnection = async (connectionId: string) => {
    if (!confirm("Are you sure you want to delete this voice connection?"))
      return;

    try {
      await deleteConnection(connectionId);
    } catch (error) {
      console.error("Failed to delete voice connection:", error);
    }
  };

  const handleToggleActive = async (
    connectionId: string,
    isActive: boolean
  ) => {
    try {
      await updateConnection(connectionId, {
        is_active: isActive,
      });
    } catch (error) {
      console.error("Failed to toggle connection status:", error);
    }
  };

  const handleEdit = (connection: VoiceConnection) => {
    setEditingConnection(connection);
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingConnection(undefined);
  };

  if (showForm) {
    return (
      <div className={className}>
        <VoiceConnectionForm
          connection={editingConnection}
          onSubmit={
            editingConnection ? handleUpdateConnection : handleCreateConnection
          }
          onCancel={handleCancelForm}
          isLoading={formLoading}
        />
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-card-foreground">
            Voice Connections
          </h2>
          <p className="text-muted-foreground">
            Manage your voice synthesis and recognition connections
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>Add Voice Connection</Button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading voice connections...</p>
        </div>
      ) : connections.length === 0 ? (
        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <h3 className="text-lg font-medium text-card-foreground mb-2">
              No voice connections yet
            </h3>
            <p className="text-muted-foreground mb-4">
              Create your first voice connection to enable text-to-speech and
              speech-to-text features for your agents.
            </p>
            <Button onClick={() => setShowForm(true)}>
              Create Voice Connection
            </Button>
          </div>
        </div>
      ) : (
        <VoiceConnectionsTable
          connections={connections}
          onEdit={handleEdit}
          onDelete={handleDeleteConnection}
          onTest={testConnection}
          onToggleActive={handleToggleActive}
        />
      )}
    </div>
  );
};
