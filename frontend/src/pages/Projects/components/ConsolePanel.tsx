import { AlertCircle, Loader2 } from "lucide-react";
import React from "react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";

interface ConsolePanelProps {
  canExecuteCommands: boolean;
  commandInput: string;
  commandOutput: string;
  commandLoading: boolean;
  onCommandInputChange: (value: string) => void;
  onExecuteCommand: () => void;
}

export const ConsolePanel: React.FC<ConsolePanelProps> = ({
  canExecuteCommands,
  commandInput,
  commandOutput,
  commandLoading,
  onCommandInputChange,
  onExecuteCommand,
}) => {
  return (
    <div className="flex flex-col h-full p-4">
      {!canExecuteCommands && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-600" />
            <p className="text-sm text-yellow-800">
              VM must be active to execute commands
            </p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={commandInput}
            onChange={(e) => onCommandInputChange(e.target.value)}
            placeholder="Enter command..."
            disabled={!canExecuteCommands || commandLoading}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onExecuteCommand();
              }
            }}
            className="font-mono text-sm"
          />
          <Button
            onClick={onExecuteCommand}
            disabled={
              !canExecuteCommands || commandLoading || !commandInput.trim()
            }
            size="sm"
          >
            {commandLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Run"
            )}
          </Button>
        </div>

        {commandOutput && (
          <div className="bg-slate-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
            <pre className="whitespace-pre-wrap">{commandOutput}</pre>
          </div>
        )}
      </div>
    </div>
  );
};