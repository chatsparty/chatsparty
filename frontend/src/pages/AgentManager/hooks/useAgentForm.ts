import { useState, useCallback, useEffect } from 'react';
import type { ModelConnection } from '@/types/connection';
import type { FormData } from './useAgentValidation';

interface Agent {
  id: string;
  name: string;
  characteristics?: string;
  connectionId?: string;
}

const getInitialFormData = (connections: ModelConnection[]): FormData => {
  const chatspartyDefault = connections.find(conn => conn.id === 'chatsparty-default');
  return {
    name: '',
    characteristics: '',
    connection_id: chatspartyDefault ? 'chatsparty-default' : ''
  };
};

export const useAgentForm = (connections: ModelConnection[]) => {
  const [formData, setFormData] = useState<FormData>(() => getInitialFormData(connections));
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // Update default connection when connections load
    if (connections.length > 0 && !editingAgent) {
      const chatspartyDefault = connections.find(conn => conn.id === 'chatsparty-default');
      if (chatspartyDefault && !formData.connection_id) {
        setFormData(prev => ({ ...prev, connection_id: 'chatsparty-default' }));
      } else if (!formData.connection_id && connections.length > 0) {
        // If no default connection, select the first available
        setFormData(prev => ({ ...prev, connection_id: connections[0].id }));
      }
    }
  }, [connections, editingAgent]);

  const updateField = useCallback(<K extends keyof FormData>(name: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any) => {
    const { name, value } = e.target;
    updateField(name as keyof FormData, value);
  }, [updateField]);

  const resetForm = useCallback(() => {
    setFormData(getInitialFormData(connections));
    setEditingAgent(null);
    setIsModalOpen(false);
  }, [connections]);

  const openCreateModal = useCallback(() => {
    setEditingAgent(null);
    setFormData(getInitialFormData(connections));
    setIsModalOpen(true);
  }, [connections]);

  const openEditModal = useCallback((agent: Agent) => {
    setEditingAgent(agent);
    setFormData({
      name: agent.name,
      characteristics: agent.characteristics || '',
      connection_id: agent.connectionId || ''
    });
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setTimeout(resetForm, 300);
  }, [resetForm]);

  return {
    formData,
    editingAgent,
    isModalOpen,
    updateField,
    handleInputChange,
    resetForm,
    openCreateModal,
    openEditModal,
    closeModal,
    isEditing: !!editingAgent
  };
};