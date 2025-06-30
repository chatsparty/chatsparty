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
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();

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
    if (window.confirm(t("connections.confirmDelete"))) {
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
        <div className="text-muted-foreground">{t("connections.loadingConnections")}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-destructive">{t("common.error")}: {error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold mb-2">{t("connections.title")}</h2>
          <p className="text-muted-foreground">
            {t("settings.connectionsDescription")}
          </p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            {t("connections.addConnection")}
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
            {t("connections.noConnections")}
          </div>
          {!showForm && (
            <Button onClick={() => setShowForm(true)}>
              {t("connections.createFirstConnection")}
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
