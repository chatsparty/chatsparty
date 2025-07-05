import { useState, useCallback } from 'react';

interface Agent {
  agent_id: string;
  name: string;
  characteristics?: string;
  gender?: string;
  connection_id?: string;
  voice_config?: any;
}

export const useDeleteConfirmation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);

  const openConfirmation = useCallback((agent: Agent) => {
    setAgentToDelete(agent);
    setIsOpen(true);
  }, []);

  const closeConfirmation = useCallback(() => {
    setIsOpen(false);
    setAgentToDelete(null);
  }, []);

  const confirmDelete = useCallback(async (onDelete: (agent: Agent) => Promise<boolean>) => {
    if (!agentToDelete) return false;
    
    const success = await onDelete(agentToDelete);
    if (success) {
      closeConfirmation();
    }
    return success;
  }, [agentToDelete, closeConfirmation]);

  return {
    isOpen,
    agentToDelete,
    openConfirmation,
    closeConfirmation,
    confirmDelete
  };
};