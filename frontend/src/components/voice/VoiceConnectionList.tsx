import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VoiceConnectionForm } from "./VoiceConnectionForm";
import { useVoiceConnections } from "@/hooks/useVoiceConnections";
import type {
  VoiceConnection,
  CreateVoiceConnectionRequest,
} from "@/types/voice";

interface VoiceConnectionListProps {
  className?: string;
}

export const VoiceConnectionList: React.FC<VoiceConnectionListProps> = ({
  className,
}) => {
  const {
    connections,
    loading,
    error,
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

  const handleToggleActive = async (connection: VoiceConnection) => {
    try {
      await updateConnection(connection.id, {
        is_active: !connection.is_active,
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

  const getProviderBadgeColor = (provider: string) => {
    switch (provider) {
      case "elevenlabs":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      case "openai":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "google":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "chatsparty":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const getProviderName = (provider: string) => {
    switch (provider) {
      case "elevenlabs":
        return "ElevenLabs";
      case "openai":
        return "OpenAI";
      case "google":
        return "Google Cloud";
      case "chatsparty":
        return "ChatsParty Cloud";
      default:
        return provider;
    }
  };

  const getServiceTypeLabel = (type: string) => {
    switch (type) {
      case "tts":
        return "Text-to-Speech";
      case "stt":
        return "Speech-to-Text";
      case "both":
        return "TTS + STT";
      default:
        return type;
    }
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
        <div className="grid gap-4">
          {connections.map((connection) => (
            <Card key={connection.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-lg">
                        {connection.name}
                      </CardTitle>
                      <Badge
                        variant={connection.is_active ? "default" : "secondary"}
                        className={
                          connection.is_active
                            ? "bg-green-100 text-green-800"
                            : ""
                        }
                      >
                        {connection.is_active ? "Active" : "Inactive"}
                      </Badge>
                      {connection.is_cloud_proxy && (
                        <Badge variant="outline">Cloud Proxy</Badge>
                      )}
                    </div>
                    <CardDescription>{connection.description}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(connection)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(connection)}
                    >
                      {connection.is_active ? "Disable" : "Enable"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteConnection(connection.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-card-foreground">Provider</p>
                    <Badge
                      className={getProviderBadgeColor(connection.provider)}
                    >
                      {getProviderName(connection.provider)}
                    </Badge>
                  </div>
                  <div>
                    <p className="font-medium text-card-foreground">
                      Service Type
                    </p>
                    <p className="text-muted-foreground">
                      {getServiceTypeLabel(connection.provider_type)}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-card-foreground">
                      Voice Style
                    </p>
                    <p className="text-muted-foreground capitalize">
                      {connection.style}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-card-foreground">Settings</p>
                    <p className="text-muted-foreground">
                      Speed: {connection.speed}x, Stability:{" "}
                      {connection.stability}
                    </p>
                  </div>
                </div>
                {connection.voice_id && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-sm">
                      <span className="font-medium text-card-foreground">
                        Voice ID:
                      </span>{" "}
                      <span className="text-muted-foreground">
                        {connection.voice_id}
                      </span>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
