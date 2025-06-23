import { useState, useCallback } from "react";

interface UseCommandExecutionProps {
  onExecuteCommand: (command: string, workingDir?: string) => Promise<string>;
}

export const useCommandExecution = ({ onExecuteCommand }: UseCommandExecutionProps) => {
  const [commandInput, setCommandInput] = useState("");
  const [commandOutput, setCommandOutput] = useState("");
  const [commandLoading, setCommandLoading] = useState(false);

  const handleExecuteCommand = useCallback(async () => {
    if (!commandInput.trim()) return;

    setCommandLoading(true);
    try {
      const output = await onExecuteCommand(commandInput);
      setCommandOutput((prev) => `$ ${commandInput}\n${output}\n\n${prev}`);
      setCommandInput("");
    } catch (error) {
      setCommandOutput(
        (prev) => `$ ${commandInput}\n❌ Error: ${error}\n\n${prev}`
      );
    } finally {
      setCommandLoading(false);
    }
  }, [commandInput, onExecuteCommand]);

  const clearOutput = useCallback(() => {
    setCommandOutput("");
  }, []);

  return {
    commandInput,
    commandOutput,
    commandLoading,
    setCommandInput,
    handleExecuteCommand,
    clearOutput,
  };
};