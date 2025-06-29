import { useState, useEffect } from 'react';
import axios from 'axios';
import { useTracking } from '../../../hooks/useTracking';
import { useConnections } from '../../../hooks/useConnections';
import type { AgentVoiceConfig } from '../../../types/voice';

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
  voice_config?: AgentVoiceConfig;
  mcp_server_id?: string;
  selected_mcp_tools?: string[];
  mcp_tool_config?: Record<string, any>;
}

interface FormData {
  name: string;
  prompt: string;
  characteristics: string;
  connection_id: string;
  chat_style: ChatStyle;
  voice_config: AgentVoiceConfig;
  mcp_server_id: string;
  selected_mcp_tools: string[];
  mcp_tool_config: Record<string, any>;
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
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);
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
    },
    voice_config: {
      voice_enabled: false,
      podcast_settings: {
        intro_enabled: true,
        outro_enabled: true,
        background_music: false
      }
    },
    mcp_server_id: '',
    selected_mcp_tools: [],
    mcp_tool_config: {}
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
      if (editingAgent) {
        await axios.put(`/chat/agents/${editingAgent.agent_id}`, {
          name: formData.name,
          prompt: formData.prompt,
          characteristics: formData.characteristics,
          connection_id: formData.connection_id,
          chat_style: formData.chat_style,
          voice_config: formData.voice_config,
          mcp_server_id: formData.mcp_server_id,
          mcp_tools: formData.selected_mcp_tools,
          mcp_tool_config: formData.mcp_tool_config
        });
      } else {
        await axios.post('/chat/agents', {
          name: formData.name,
          prompt: formData.prompt,
          characteristics: formData.characteristics,
          connection_id: formData.connection_id,
          chat_style: formData.chat_style,
          voice_config: formData.voice_config,
          mcp_server_id: formData.mcp_server_id,
          mcp_tools: formData.selected_mcp_tools,
          mcp_tool_config: formData.mcp_tool_config
        });
      }
      
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
      },
      voice_config: agent.voice_config || {
        voice_enabled: false,
        podcast_settings: {
          intro_enabled: true,
          outro_enabled: true,
          background_music: false
        }
      },
      mcp_server_id: agent.mcp_server_id || '',
      selected_mcp_tools: agent.selected_mcp_tools || [],
      mcp_tool_config: agent.mcp_tool_config || {}
    });
    setShowCreateForm(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const target = e.target;
    const { name, value, type } = target;
    
    const actualValue = type === 'checkbox' ? (target as HTMLInputElement).checked : value;
    
    if (name.startsWith('chat_style.')) {
      const styleKey = name.split('.')[1];
      setFormData({
        ...formData,
        chat_style: {
          ...formData.chat_style,
          [styleKey]: actualValue
        }
      });
    } else if (name.startsWith('voice_config.')) {
      const configKey = name.split('.')[1];
      if (configKey === 'voice_enabled') {
        setFormData({
          ...formData,
          voice_config: {
            ...formData.voice_config,
            voice_enabled: typeof actualValue === 'boolean' ? actualValue : (actualValue === 'true' || actualValue === 'on')
          }
        });
      } else if (configKey === 'voice_connection_id') {
        setFormData({
          ...formData,
          voice_config: {
            ...formData.voice_config,
            voice_connection_id: actualValue as string
          }
        });
      } else if (name.startsWith('voice_config.podcast_settings.')) {
        const settingKey = name.split('.')[2];
        setFormData({
          ...formData,
          voice_config: {
            ...formData.voice_config,
            podcast_settings: {
              ...formData.voice_config.podcast_settings,
              [settingKey]: typeof actualValue === 'boolean' ? actualValue : (actualValue === 'true' || actualValue === 'on')
            }
          }
        });
      }
    } else if (name === 'selected_mcp_tools') {
      setFormData({
        ...formData,
        selected_mcp_tools: Array.isArray(actualValue) ? actualValue : []
      });
    } else if (name === 'mcp_server_id') {
      setFormData({
        ...formData,
        mcp_server_id: actualValue as string
      });
    } else {
      setFormData({
        ...formData,
        [name]: actualValue
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
      },
      voice_config: {
        voice_enabled: false,
        podcast_settings: {
          intro_enabled: true,
          outro_enabled: true,
          background_music: false
        }
      },
      mcp_server_id: '',
      selected_mcp_tools: [],
      mcp_tool_config: {}
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
      },
      voice_config: {
        voice_enabled: false,
        podcast_settings: {
          intro_enabled: true,
          outro_enabled: true,
          background_music: false
        }
      },
      mcp_server_id: '',
      selected_mcp_tools: [],
      mcp_tool_config: {}
    });
    setShowCreateForm(true);
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
    presetAgents,
    deleteModalOpen,
    agentToDelete,
    setShowCreateForm,
    handleCreateAgent,
    handleEditAgent,
    handleInputChange,
    resetForm,
    createPresetAgent,
    handleDeleteAgent,
    confirmDeleteAgent,
    cancelDeleteAgent
  };
};