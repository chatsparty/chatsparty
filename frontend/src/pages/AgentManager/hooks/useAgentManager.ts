import { useState, useEffect } from 'react';
import axios from 'axios';
import { useTracking } from '../../../hooks/useTracking';
import { useConnections } from '../../../hooks/useConnections';

interface ChatStyle {
  friendliness: 'friendly' | 'neutral' | 'formal';
  response_length: 'short' | 'medium' | 'long';
  personality: 'enthusiastic' | 'balanced' | 'reserved';
  humor: 'none' | 'light' | 'witty';
  expertise_level: 'beginner' | 'intermediate' | 'expert';
}

interface Agent {
  agent_id: string;
  name: string;
  prompt: string;
  characteristics: string;
  connection_id?: string;
  chat_style?: ChatStyle;
}

interface FormData {
  name: string;
  prompt: string;
  characteristics: string;
  connection_id: string;
  chat_style: ChatStyle;
}

interface PresetAgent {
  name: string;
  prompt: string;
  characteristics: string;
}

export const useAgentManager = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const { trackAgentCreated, trackAgentUpdated, trackAgentDeleted, trackError, trackFeatureUsed } = useTracking();
  const { connections } = useConnections();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    prompt: '',
    characteristics: '',
    connection_id: '',
    chat_style: {
      friendliness: 'friendly',
      response_length: 'medium',
      personality: 'balanced',
      humor: 'light',
      expertise_level: 'expert'
    }
  });

  const presetAgents: PresetAgent[] = [
    {
      name: 'Business Analyst',
      prompt: 'You are a business analyst. Focus on analyzing business requirements, identifying opportunities, and providing strategic insights.',
      characteristics: 'Professional, analytical, detail-oriented, business-focused. You excel at breaking down complex business problems and providing actionable recommendations.'
    },
    {
      name: 'Creative Writer',
      prompt: 'You are a creative writer. Focus on storytelling, creative expression, and imaginative content creation.',
      characteristics: 'Creative, imaginative, expressive, artistic. You love crafting engaging narratives, developing characters, and exploring creative ideas.'
    },
    {
      name: 'Technical Expert',
      prompt: 'You are a technical expert. Focus on technical solutions, system architecture, and engineering best practices.',
      characteristics: 'Technical, precise, methodical, solution-oriented. You excel at solving complex technical problems and explaining technical concepts clearly.'
    },
    {
      name: 'Project Manager',
      prompt: 'You are a project manager. Focus on coordination, planning, risk management, and ensuring project success.',
      characteristics: 'Organized, leadership-focused, deadline-driven, collaborative. You excel at coordinating teams and keeping projects on track.'
    }
  ];

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
      await axios.post('/chat/agents', {
        name: formData.name,
        prompt: formData.prompt,
        characteristics: formData.characteristics,
        connection_id: formData.connection_id,
        chat_style: formData.chat_style
      });
      
      const connection = connections.find(conn => conn.id === formData.connection_id);
      
      if (editingAgent) {
        trackAgentUpdated(editingAgent.agent_id, formData.name);
      } else {
        trackAgentCreated({
          agent_name: formData.name,
          agent_type: 'custom',
          provider: connection?.provider || 'unknown',
          model_name: connection?.model_name || 'unknown',
          chat_style_friendliness: formData.chat_style.friendliness,
          chat_style_response_length: formData.chat_style.response_length,
          chat_style_personality: formData.chat_style.personality,
          chat_style_humor: formData.chat_style.humor,
          chat_style_expertise_level: formData.chat_style.expertise_level
        });
      }
      
      await fetchAgents();
      resetForm();
    } catch (error) {
      console.error('Failed to create agent:', error);
      trackError('agent_creation_error', error instanceof Error ? error.message : 'Unknown error', 'agent_manager');
      alert('Failed to create agent. Make sure the agent ID is unique.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditAgent = (agent: Agent) => {
    setEditingAgent(agent);
    setFormData({
      name: agent.name,
      prompt: agent.prompt,
      characteristics: agent.characteristics,
      connection_id: agent.connection_id || '',
      chat_style: agent.chat_style || {
        friendliness: 'friendly',
        response_length: 'medium',
        personality: 'balanced',
        humor: 'light',
        expertise_level: 'expert'
      }
    });
    setShowCreateForm(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name.startsWith('chat_style.')) {
      const styleKey = name.split('.')[1];
      setFormData({
        ...formData,
        chat_style: {
          ...formData.chat_style,
          [styleKey]: value
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const resetForm = () => {
    setShowCreateForm(false);
    setEditingAgent(null);
    setFormData({
      name: '',
      prompt: '',
      characteristics: '',
      connection_id: '',
      chat_style: {
        friendliness: 'friendly',
        response_length: 'medium',
        personality: 'balanced',
        humor: 'light',
        expertise_level: 'expert'
      }
    });
  };

  const createPresetAgent = (preset: PresetAgent) => {
    trackFeatureUsed('preset_agent_selected', { preset_name: preset.name });
    
    setFormData({
      name: preset.name,
      prompt: preset.prompt,
      characteristics: preset.characteristics,
      connection_id: '',
      chat_style: {
        friendliness: 'friendly',
        response_length: 'medium',
        personality: 'balanced',
        humor: 'light',
        expertise_level: 'expert'
      }
    });
    setShowCreateForm(true);
  };

  const handleDeleteAgent = async (agentId: string) => {
    const agent = agents.find(a => a.agent_id === agentId);
    const agentName = agent?.name || 'Unknown';
    
    if (!window.confirm('Are you sure you want to delete this agent?')) {
      return;
    }
    
    setIsLoading(true);
    try {
      await axios.delete(`/chat/agents/${agentId}`);
      trackAgentDeleted(agentId, agentName);
      await fetchAgents();
    } catch (error) {
      console.error('Failed to delete agent:', error);
      trackError('agent_deletion_error', error instanceof Error ? error.message : 'Unknown error', 'agent_manager');
      alert('Failed to delete agent. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    agents,
    isLoading,
    showCreateForm,
    editingAgent,
    formData,
    presetAgents,
    setShowCreateForm,
    handleCreateAgent,
    handleEditAgent,
    handleInputChange,
    resetForm,
    createPresetAgent,
    handleDeleteAgent
  };
};