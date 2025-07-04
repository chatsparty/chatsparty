import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ConnectionTestResult, ModelConnection } from "@/types/connection";
import React, { useState } from "react";

interface ConnectionCardProps {
  connection: ModelConnection;
  onEdit: (connection: ModelConnection) => void;
  onDelete: (id: string) => void;
  onTest: (id: string) => Promise<ConnectionTestResult>;
  onToggleActive: (id: string, isActive: boolean) => void;
}

export const ConnectionCard: React.FC<ConnectionCardProps> = ({
  connection,
  onEdit,
  onDelete,
  onTest,
  onToggleActive,
}) => {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(
    null
  );

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await onTest(connection.id);
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        message:
          "Test failed: " +
          (error instanceof Error ? error.message : "Unknown error"),
      });
    } finally {
      setTesting(false);
    }
  };

  const handleToggleActive = () => {
    onToggleActive(connection.id, !connection.is_active);
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg text-card-foreground">
              {connection.name}
            </CardTitle>
            <CardDescription className="mt-1 text-muted-foreground">
              {connection.description ||
                `${connection.provider} • ${connection.model_name}`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={connection.is_active ? "default" : "secondary"}>
              {connection.is_active ? "Active" : "Inactive"}
            </Badge>
            {connection.is_default && (
              <Badge variant="outline" className="border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-950/50 dark:text-blue-400">
                Default
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-muted-foreground">
                Provider:
              </span>
              <p className="capitalize text-card-foreground">
                {connection.provider}
              </p>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Model:</span>
              <p className="text-card-foreground">{connection.model_name}</p>
            </div>
          </div>

          {connection.base_url && (
            <div className="text-sm">
              <span className="font-medium text-muted-foreground">
                Base URL:
              </span>
              <p className="break-all text-card-foreground">
                {connection.base_url}
              </p>
            </div>
          )}

          {testResult && (
            <div
              className={`p-3 rounded-md text-sm border ${
                testResult.success
                  ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-950/50 dark:border-green-900/50 dark:text-green-300"
                  : "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/50 dark:border-red-900/50 dark:text-red-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {testResult.success ? "✓" : "✗"} Test Result:
                </span>
                <span>{testResult.message}</span>
                {testResult.latency && (
                  <span className="opacity-70">({testResult.latency}ms)</span>
                )}
              </div>
            </div>
          )}

          {connection.is_default && (
            <div className="p-3 rounded-md text-sm bg-blue-50 border border-blue-200 text-blue-800 dark:bg-blue-950/50 dark:border-blue-900/50 dark:text-blue-300">
              <div className="flex items-center gap-2">
                <span className="font-medium">ℹ️ Platform Default:</span>
                <span>This connection is provided by the ChatsParty platform and cannot be modified.</span>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTest}
              disabled={testing || connection.is_default}
            >
              {testing ? "Testing..." : connection.is_default ? "Test Unavailable" : "Test Connection"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(connection)}
              disabled={connection.is_default}
            >
              Edit
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleToggleActive}
              disabled={connection.is_default}
            >
              {connection.is_active ? "Deactivate" : "Activate"}
            </Button>
            {!connection.is_default && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDelete(connection.id)}
              >
                Delete
              </Button>
            )}
            {process.env.NODE_ENV === 'development' && (
              <span className="text-xs text-gray-500">
                is_default: {String(connection.is_default)}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
