import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { VoiceConnection, VoiceConnectionTestResult } from "@/types/voice";
import React, { useState } from "react";
import {
  FaCheckCircle,
  FaEdit,
  FaMicrophone,
  FaPause,
  FaPlay,
  FaSpinner,
  FaTimesCircle,
  FaTrash,
  FaVolumeUp,
} from "react-icons/fa";

interface VoiceConnectionsTableProps {
  connections: VoiceConnection[];
  onEdit: (connection: VoiceConnection) => void;
  onDelete: (id: string) => void;
  onTest?: (id: string) => Promise<VoiceConnectionTestResult>;
  onToggleActive: (id: string, isActive: boolean) => void;
}

interface TestState {
  [connectionId: string]: {
    testing: boolean;
    result: VoiceConnectionTestResult | null;
  };
}

export const VoiceConnectionsTable: React.FC<VoiceConnectionsTableProps> = ({
  connections,
  onEdit,
  onDelete,
  onTest,
  onToggleActive,
}) => {
  const [testStates, setTestStates] = useState<TestState>({});

  const handleTest = async (connection: VoiceConnection) => {
    if (!onTest) return;

    setTestStates((prev) => ({
      ...prev,
      [connection.id]: { testing: true, result: null },
    }));

    try {
      const result = await onTest(connection.id);
      setTestStates((prev) => ({
        ...prev,
        [connection.id]: { testing: false, result },
      }));
    } catch (error) {
      const errorResult: VoiceConnectionTestResult = {
        success: false,
        message:
          "Test failed: " +
          (error instanceof Error ? error.message : "Unknown error"),
      };
      setTestStates((prev) => ({
        ...prev,
        [connection.id]: { testing: false, result: errorResult },
      }));
    }
  };

  const getTestState = (connectionId: string) => {
    return testStates[connectionId] || { testing: false, result: null };
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

  const getServiceTypeIcon = (type: string) => {
    switch (type) {
      case "tts":
        return <FaVolumeUp className="h-3 w-3" />;
      case "stt":
        return <FaMicrophone className="h-3 w-3" />;
      case "both":
        return (
          <div className="flex gap-1">
            <FaVolumeUp className="h-3 w-3" />
            <FaMicrophone className="h-3 w-3" />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-sm text-card-foreground">
                Connection
              </th>
              <th className="text-left px-4 py-3 font-medium text-sm text-card-foreground">
                Provider
              </th>
              <th className="text-left px-4 py-3 font-medium text-sm text-card-foreground">
                Service Type
              </th>
              <th className="text-left px-4 py-3 font-medium text-sm text-card-foreground">
                Voice Style
              </th>
              <th className="text-center px-4 py-3 font-medium text-sm text-card-foreground">
                Status
              </th>
              {onTest && (
                <th className="text-center px-4 py-3 font-medium text-sm text-card-foreground">
                  Test
                </th>
              )}
              <th className="text-center px-4 py-3 font-medium text-sm text-card-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-card">
            {connections.map((connection) => {
              const testState = getTestState(connection.id);
              return (
                <tr
                  key={connection.id}
                  className="border-b border-border last:border-b-0 hover:bg-muted/30"
                >
                  {/* Connection Name & Description */}
                  <td className="px-4 py-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-card-foreground">
                          {connection.name}
                        </span>
                        {connection.is_default && (
                          <Badge variant="outline" className="text-xs border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-950/50 dark:text-blue-400">
                            Default
                          </Badge>
                        )}
                      </div>
                      {connection.description && (
                        <div className="text-sm text-muted-foreground truncate max-w-[200px] mt-1">
                          {connection.description}
                        </div>
                      )}
                      {connection.is_cloud_proxy && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Cloud Proxy
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Provider */}
                  <td className="px-4 py-3">
                    <span className="text-sm text-card-foreground">
                      {getProviderName(connection.provider)}
                    </span>
                  </td>

                  {/* Service Type */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getServiceTypeIcon(connection.provider_type)}
                      <span className="text-sm text-card-foreground">
                        {getServiceTypeLabel(connection.provider_type)}
                      </span>
                    </div>
                  </td>

                  {/* Voice Style */}
                  <td className="px-4 py-3">
                    <div>
                      <span className="text-sm capitalize text-card-foreground">
                        {connection.style}
                      </span>
                      {connection.voice_id && (
                        <div className="text-xs text-muted-foreground mt-1 font-mono">
                          ID: {connection.voice_id}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 text-center">
                    <div
                      className={`inline-flex h-3 w-3 rounded-full ${
                        connection.is_active
                          ? "bg-green-500 dark:bg-green-400"
                          : "bg-muted-foreground/40"
                      }`}
                      title={connection.is_active ? "Active" : "Inactive"}
                    />
                  </td>

                  {/* Test Status */}
                  {onTest && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTest(connection)}
                          disabled={testState.testing || connection.is_default}
                          className="h-7 px-3 text-sm"
                          title={connection.is_default ? "Default connections cannot be tested" : "Test connection"}
                        >
                          {testState.testing ? (
                            <FaSpinner className="h-3 w-3 animate-spin" />
                          ) : (
                            "Test"
                          )}
                        </Button>
                        {testState.result && (
                          <>
                            {testState.result.success ? (
                              <FaCheckCircle className="h-3 w-3 text-green-600 dark:text-green-400" />
                            ) : (
                              <FaTimesCircle className="h-3 w-3 text-destructive" />
                            )}
                            {testState.result.latency_ms && (
                              <span className="text-sm text-muted-foreground">
                                {testState.result.latency_ms}ms
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  )}

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          onToggleActive(connection.id, !connection.is_active)
                        }
                        disabled={connection.is_default}
                        className="h-7 w-7 p-0"
                        title={connection.is_default ? "Default connections cannot be modified" : (connection.is_active ? "Deactivate" : "Activate")}
                      >
                        {connection.is_active ? (
                          <FaPause className="h-3 w-3" />
                        ) : (
                          <FaPlay className="h-3 w-3" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(connection)}
                        disabled={connection.is_default}
                        className="h-7 w-7 p-0"
                        title={connection.is_default ? "Default connections cannot be edited" : "Edit"}
                      >
                        <FaEdit className="h-3 w-3" />
                      </Button>
                      {!connection.is_default && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(connection.id)}
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive/80"
                          title="Delete"
                        >
                          <FaTrash className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Test Result Details */}
      {onTest &&
        Object.entries(testStates).some(
          ([, state]) => state.result && !state.result.success
        ) && (
          <div className="border-t border-border bg-destructive/5 px-3 py-2">
            <div className="text-xs text-destructive space-y-1">
              {Object.entries(testStates).map(([connectionId, state]) => {
                if (!state.result || state.result.success) return null;
                const connection = connections.find(
                  (c) => c.id === connectionId
                );
                return (
                  <div key={connectionId}>
                    <span className="font-medium">{connection?.name}:</span>{" "}
                    {state.result.message}
                  </div>
                );
              })}
            </div>
          </div>
        )}
    </div>
  );
};
