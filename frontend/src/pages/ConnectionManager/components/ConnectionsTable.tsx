import { Button } from "@/components/ui/button";
import type { ConnectionTestResult, ModelConnection } from "@/types/connection";
import React, { useState } from "react";
import {
  FaCheckCircle,
  FaEdit,
  FaPause,
  FaPlay,
  FaSpinner,
  FaTimesCircle,
  FaTrash,
} from "react-icons/fa";

interface ConnectionsTableProps {
  connections: ModelConnection[];
  onEdit: (connection: ModelConnection) => void;
  onDelete: (id: string) => void;
  onTest: (id: string) => Promise<ConnectionTestResult>;
  onToggleActive: (id: string, isActive: boolean) => void;
}

interface TestState {
  [connectionId: string]: {
    testing: boolean;
    result: ConnectionTestResult | null;
  };
}

export const ConnectionsTable: React.FC<ConnectionsTableProps> = ({
  connections,
  onEdit,
  onDelete,
  onTest,
  onToggleActive,
}) => {
  const [testStates, setTestStates] = useState<TestState>({});

  const handleTest = async (connection: ModelConnection) => {
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
      const errorResult: ConnectionTestResult = {
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
                Model
              </th>
              <th className="text-center px-4 py-3 font-medium text-sm text-card-foreground">
                Status
              </th>
              <th className="text-center px-4 py-3 font-medium text-sm text-card-foreground">
                Test
              </th>
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
                      <div className="font-medium text-sm text-card-foreground flex items-center gap-2">
                        {connection.name}
                        {connection.is_system_default && (
                          <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-1 rounded-full">
                            System
                          </span>
                        )}
                      </div>
                      {(connection.description || connection.base_url) && (
                        <div className="text-sm text-muted-foreground truncate max-w-[200px] mt-1">
                          {connection.description || connection.base_url}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Provider */}
                  <td className="px-4 py-3">
                    <span className="text-sm capitalize text-card-foreground">
                      {connection.provider}
                    </span>
                  </td>

                  {/* Model */}
                  <td className="px-4 py-3">
                    <span className="text-sm font-mono text-card-foreground">
                      {connection.model_name}
                    </span>
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
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTest(connection)}
                        disabled={testState.testing}
                        className="h-7 px-3 text-sm"
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
                          {testState.result.latency && (
                            <span className="text-sm text-muted-foreground">
                              {testState.result.latency}ms
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          onToggleActive(connection.id, !connection.is_active)
                        }
                        className="h-7 w-7 p-0"
                        title={
                          connection.is_system_default
                            ? "System connections cannot be deactivated"
                            : connection.is_active
                            ? "Deactivate"
                            : "Activate"
                        }
                        disabled={connection.is_system_default}
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
                        className="h-7 w-7 p-0"
                        title={
                          connection.is_system_default
                            ? "System connections cannot be edited"
                            : "Edit"
                        }
                        disabled={connection.is_system_default}
                      >
                        <FaEdit className="h-3 w-3" />
                      </Button>
                      {!connection.is_system_default && (
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
      {Object.entries(testStates).some(
        ([, state]) => state.result && !state.result.success
      ) && (
        <div className="border-t border-border bg-destructive/5 px-3 py-2">
          <div className="text-xs text-destructive space-y-1">
            {Object.entries(testStates).map(([connectionId, state]) => {
              if (!state.result || state.result.success) return null;
              const connection = connections.find((c) => c.id === connectionId);
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
