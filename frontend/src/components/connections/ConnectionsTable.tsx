import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { FaEdit, FaTrash, FaPlay, FaPause, FaCheckCircle, FaTimesCircle, FaSpinner } from 'react-icons/fa';
import type { ModelConnection, ConnectionTestResult } from '@/types/connection';

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
  onToggleActive
}) => {
  const [testStates, setTestStates] = useState<TestState>({});

  const handleTest = async (connection: ModelConnection) => {
    setTestStates(prev => ({
      ...prev,
      [connection.id]: { testing: true, result: null }
    }));

    try {
      const result = await onTest(connection.id);
      setTestStates(prev => ({
        ...prev,
        [connection.id]: { testing: false, result }
      }));
    } catch (error) {
      const errorResult: ConnectionTestResult = {
        success: false,
        message: 'Test failed: ' + (error instanceof Error ? error.message : 'Unknown error')
      };
      setTestStates(prev => ({
        ...prev,
        [connection.id]: { testing: false, result: errorResult }
      }));
    }
  };

  const getTestState = (connectionId: string) => {
    return testStates[connectionId] || { testing: false, result: null };
  };

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-sm">Connection</th>
              <th className="text-left px-4 py-3 font-medium text-sm">Provider</th>
              <th className="text-left px-4 py-3 font-medium text-sm">Model</th>
              <th className="text-center px-4 py-3 font-medium text-sm">Status</th>
              <th className="text-center px-4 py-3 font-medium text-sm">Test</th>
              <th className="text-center px-4 py-3 font-medium text-sm">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {connections.map((connection) => {
              const testState = getTestState(connection.id);
              return (
                <tr key={connection.id} className="border-b last:border-b-0 hover:bg-gray-50">
                  {/* Connection Name & Description */}
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium text-sm">{connection.name}</div>
                      {(connection.description || connection.base_url) && (
                        <div className="text-sm text-muted-foreground truncate max-w-[200px] mt-1">
                          {connection.description || connection.base_url}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Provider */}
                  <td className="px-4 py-3">
                    <span className="text-sm capitalize">{connection.provider}</span>
                  </td>

                  {/* Model */}
                  <td className="px-4 py-3">
                    <span className="text-sm font-mono">{connection.model_name}</span>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 text-center">
                    <div className={`inline-flex h-3 w-3 rounded-full ${
                      connection.is_active ? 'bg-green-500' : 'bg-gray-300'
                    }`} title={connection.is_active ? "Active" : "Inactive"} />
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
                            <FaCheckCircle className="h-3 w-3 text-green-500" />
                          ) : (
                            <FaTimesCircle className="h-3 w-3 text-red-500" />
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
                        onClick={() => onToggleActive(connection.id, !connection.is_active)}
                        className="h-7 w-7 p-0"
                        title={connection.is_active ? "Deactivate" : "Activate"}
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
                        title="Edit"
                      >
                        <FaEdit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(connection.id)}
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                        title="Delete"
                      >
                        <FaTrash className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Test Result Details */}
      {Object.entries(testStates).some(([_, state]) => state.result && !state.result.success) && (
        <div className="border-t bg-red-50/50 px-3 py-2">
          <div className="text-xs text-red-600 space-y-1">
            {Object.entries(testStates).map(([connectionId, state]) => {
              if (!state.result || state.result.success) return null;
              const connection = connections.find(c => c.id === connectionId);
              return (
                <div key={connectionId}>
                  <span className="font-medium">{connection?.name}:</span> {state.result.message}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};