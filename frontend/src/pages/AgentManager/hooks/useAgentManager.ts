import { useState, useEffect } from 'react';
import axios from 'axios';
import { useTracking } from '../../../hooks/useTracking';
import { useConnections } from '../../../hooks/useConnections';

interface Agent {
  agent_id: string;
  name: string;
  characteristics?: string;
  connection_id?: string;
}

interface FormData {
  name: string;
  characteristics: string;
  connection_id: string;
}

export const useAgentManager = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);
  const { trackAgentCreated, trackAgentUpdated, trackAgentDeleted, trackError } = useTracking();
  const { connections } = useConnections();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    characteristics: '',
    connection_id: ''
  });

  const fetchAgents = async () => {
    try {
      const response = await axios.get('/chat/agents');
      setAgents(response.data);
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (editingAgent) {
        await axios.put(`/chat/agents/${editingAgent.agent_id}`, {
          name: formData.name,
          characteristics: formData.characteristics,
          connection_id: formData.connection_id
        });
      } else {
        await axios.post('/chat/agents', {
          name: formData.name,
          characteristics: formData.characteristics,
          connection_id: formData.connection_id
        });
      }
      
      const connection = connections.find(conn => conn.id === formData.connection_id);
      
      if (editingAgent) {
        trackAgentUpdated(editingAgent.agent_id, formData.name);
      } else {
        trackAgentCreated({
          agent_name: formData.name,
          agent_type: 'simple',
          provider: connection?.provider || 'unknown',
          model_name: connection?.model_name || 'unknown',
          chat_style_friendliness: 'friendly',
          chat_style_response_length: 'medium',
          chat_style_personality: 'balanced',
          chat_style_humor: 'light',
          chat_style_expertise_level: 'expert'
        });
      }
      
      await fetchAgents();
      resetForm();
    } catch (error) {
      console.error('Failed to create agent:', error);
      trackError('agent_creation_error', error instanceof Error ? error.message : 'Unknown error', 'agent_manager');
      alert('Failed to create agent. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditAgent = (agent: Agent) => {
    setEditingAgent(agent);
    setFormData({
      name: agent.name,
      characteristics: agent.characteristics || '',
      connection_id: agent.connection_id || ''
    });
    setShowCreateForm(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const resetForm = () => {
    setShowCreateForm(false);
    setEditingAgent(null);
    setFormData({
      name: '',
      characteristics: '',
      connection_id: ''
    });
  };

  const handleDeleteAgent = (agentId: string) => {
    const agent = agents.find(a => a.agent_id === agentId);
    if (agent) {
      setAgentToDelete(agent);
      setDeleteModalOpen(true);
    }
  };

  const confirmDeleteAgent = async () => {
    if (!agentToDelete) return;
    
    setIsLoading(true);
    try {
      await axios.delete(`/chat/agents/${agentToDelete.agent_id}`);
      trackAgentDeleted(agentToDelete.agent_id, agentToDelete.name);
      await fetchAgents();
      setDeleteModalOpen(false);
      setAgentToDelete(null);
    } catch (error) {
      console.error('Failed to delete agent:', error);
      trackError('agent_deletion_error', error instanceof Error ? error.message : 'Unknown error', 'agent_manager');
      alert('Failed to delete agent. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const cancelDeleteAgent = () => {
    setDeleteModalOpen(false);
    setAgentToDelete(null);
  };

  return {
    agents,
    isLoading,
    showCreateForm,
    editingAgent,
    formData,
    deleteModalOpen,
    agentToDelete,
    setShowCreateForm,
    handleCreateAgent,
    handleEditAgent,
    handleInputChange,
    resetForm,
    handleDeleteAgent,
    confirmDeleteAgent,
    cancelDeleteAgent
  };
};