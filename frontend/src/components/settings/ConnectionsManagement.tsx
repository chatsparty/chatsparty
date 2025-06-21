import { Button } from "@/components/ui/button";
import { useConnections } from "@/hooks/useConnections";
import {
  ConnectionForm,
  ConnectionsTable,
} from "@/pages/ConnectionManager/components";
import type {
  CreateConnectionRequest,
  ModelConnection,
} from "@/types/connection";
import React, { useState } from "react";

export const ConnectionsManagement: React.FC = () => {
  const {
    connections,
    loading,
    error,
    createConnection,
    updateConnection,
    deleteConnection,
    testConnection,
  } = useConnections();

  const [showForm, setShowForm] = useState(false);
  const [editingConnection, setEditingConnection] =
    useState<ModelConnection | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateConnection = async (data: CreateConnectionRequest) => {
    setIsSubmitting(true);
    try {
      await createConnection(data);
      setShowForm(false);
    } catch (error) {
      console.error("Failed to create connection:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateConnection = async (data: CreateConnectionRequest) => {
    if (!editingConnection) return;

    setIsSubmitting(true);
    try {
      await updateConnection(editingConnection.id, data);
      setEditingConnection(null);
      setShowForm(false);
    } catch (error) {
      console.error("Failed to update connection:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConnection = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this connection?")) {
      try {
        await deleteConnection(id);
      } catch (error) {
        console.error("Failed to delete connection:", error);
      }
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await updateConnection(id, { is_active: isActive });
    } catch (error) {
      console.error("Failed to toggle connection status:", error);
    }
  };

  const handleEditConnection = (connection: ModelConnection) => {
    setEditingConnection(connection);
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingConnection(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading connections...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-destructive">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Model Connections</h2>
          <p className="text-muted-foreground">
            Manage your AI model connections and configurations
          </p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            Create New Connection
          </Button>
        )}
      </div>

      {showForm && (
        <div className="mb-6">
          <ConnectionForm
            connection={editingConnection || undefined}
            onSubmit={
              editingConnection
                ? handleUpdateConnection
                : handleCreateConnection
            }
            onCancel={handleCancelForm}
            isLoading={isSubmitting}
          />
        </div>
      )}

      {connections.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-muted-foreground mb-4">
            No connections configured yet
          </div>
          {!showForm && (
            <Button onClick={() => setShowForm(true)}>
              Create Your First Connection
            </Button>
          )}
        </div>
      ) : (
        <ConnectionsTable
          connections={connections}
          onEdit={handleEditConnection}
          onDelete={handleDeleteConnection}
          onTest={testConnection}
          onToggleActive={handleToggleActive}
        />
      )}
    </div>
  );
};
