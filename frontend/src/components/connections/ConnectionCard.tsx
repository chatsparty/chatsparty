import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ModelConnection, ConnectionTestResult } from '@/types/connection';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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
  onToggleActive
}) => {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await onTest(connection.id);
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Test failed: ' + (error instanceof Error ? error.message : 'Unknown error')
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
            <CardTitle className="text-lg">{connection.name}</CardTitle>
            <CardDescription className="mt-1">
              {connection.description || `${connection.provider} • ${connection.model_name}`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={connection.is_active ? "default" : "secondary"}>
              {connection.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-muted-foreground">Provider:</span>
              <p className="capitalize">{connection.provider}</p>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Model:</span>
              <p>{connection.model_name}</p>
            </div>
          </div>

          {connection.base_url && (
            <div className="text-sm">
              <span className="font-medium text-muted-foreground">Base URL:</span>
              <p className="break-all">{connection.base_url}</p>
            </div>
          )}

          {testResult && (
            <div className={`p-2 rounded text-sm ${
              testResult.success 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {testResult.success ? '✓' : '✗'} Test Result:
                </span>
                <span>{testResult.message}</span>
                {testResult.latency && (
                  <span className="text-muted-foreground">
                    ({testResult.latency}ms)
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTest}
              disabled={testing}
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(connection)}
            >
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleActive}
            >
              {connection.is_active ? 'Deactivate' : 'Activate'}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onDelete(connection.id)}
            >
              Delete
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};