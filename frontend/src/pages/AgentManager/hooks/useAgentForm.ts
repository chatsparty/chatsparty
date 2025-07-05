import { useState, useCallback, useEffect } from 'react';
import type { ModelConnection } from '@/types/connection';
import type { FormData } from './useAgentValidation';

interface Agent {
  agent_id: string;
  name: string;
  characteristics?: string;
  gender?: string;
  connection_id?: string;
  voice_config?: any;
}

const getInitialFormData = (connections: ModelConnection[]): FormData => {
  const chatspartyDefault = connections.find(conn => conn.id === 'chatsparty-default');
  return {
    name: '',
    characteristics: '',
    gender: 'neutral',
    connection_id: chatspartyDefault ? 'chatsparty-default' : '',
    voice_config: {
      voice_enabled: false,
      voice_connection_id: undefined
    }
  };
};

export const useAgentForm = (connections: ModelConnection[]) => {
  const [formData, setFormData] = useState<FormData>(() => getInitialFormData(connections));
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (connections.length > 0 && !formData.connection_id) {
      const chatspartyDefault = connections.find(conn => conn.id === 'chatsparty-default');
      if (chatspartyDefault) {
        setFormData(prev => ({ ...prev, connection_id: 'chatsparty-default' }));
      }
    }
  }, [connections, formData.connection_id]);

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
    resetForm();
    setIsModalOpen(true);
  }, [resetForm]);

  const openEditModal = useCallback((agent: Agent) => {
    setEditingAgent(agent);
    setFormData({
      name: agent.name,
      characteristics: agent.characteristics || '',
      gender: agent.gender || 'neutral',
      connection_id: agent.connection_id || '',
      voice_config: agent.voice_config || {
        voice_enabled: false,
        voice_connection_id: undefined
      }
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