import { useState, useEffect } from 'react';
import axios from 'axios';

interface ChatStyle {
  friendliness: 'friendly' | 'neutral' | 'formal';
  response_length: 'short' | 'medium' | 'long';
  personality: 'enthusiastic' | 'balanced' | 'reserved';
  humor: 'none' | 'light' | 'witty';
  expertise_level: 'beginner' | 'intermediate' | 'expert';
}

interface ModelConfig {
  provider: string;
  model_name: string;
  api_key?: string;
  base_url?: string;
}

interface Agent {
  agent_id: string;
  name: string;
  prompt: string;
  characteristics: string;
  model_configuration?: ModelConfig;
  chat_style?: ChatStyle;
}

interface FormData {
  agent_id: string;
  name: string;
  prompt: string;
  characteristics: string;
  model_configuration: ModelConfig;
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
  const [formData, setFormData] = useState<FormData>({
    agent_id: '',
    name: '',
    prompt: '',
    characteristics: '',
    model_configuration: {
      provider: 'ollama',
      model_name: 'gemma3:4b',
      api_key: '',
      base_url: ''
    },
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
      const response = await axios.get('http://localhost:8000/chat/agents');
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
      await axios.post('http://localhost:8000/chat/agents', {
        agent_id: formData.agent_id,
        name: formData.name,
        prompt: formData.prompt,
        characteristics: formData.characteristics,
        model_configuration: formData.model_configuration,
        chat_style: formData.chat_style
      });
      
      await fetchAgents();
      resetForm();
    } catch (error) {
      console.error('Failed to create agent:', error);
      alert('Failed to create agent. Make sure the agent ID is unique.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditAgent = (agent: Agent) => {
    setEditingAgent(agent);
    setFormData({
      agent_id: agent.agent_id,
      name: agent.name,
      prompt: agent.prompt,
      characteristics: agent.characteristics,
      model_configuration: agent.model_configuration || {
        provider: 'ollama',
        model_name: 'gemma3:4b',
        api_key: '',
        base_url: ''
      },
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
    } else if (name.startsWith('model_configuration.')) {
      const configKey = name.split('.')[1];
      setFormData({
        ...formData,
        model_configuration: {
          ...formData.model_configuration,
          [configKey]: value
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
      agent_id: '',
      name: '',
      prompt: '',
      characteristics: '',
      model_configuration: {
        provider: 'ollama',
        model_name: 'gemma3:4b',
        api_key: '',
        base_url: ''
      },
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
    const agentId = preset.name.toLowerCase().replace(/\s+/g, '-');
    setFormData({
      agent_id: agentId,
      name: preset.name,
      prompt: preset.prompt,
      characteristics: preset.characteristics,
      model_configuration: {
        provider: 'ollama',
        model_name: 'gemma3:4b',
        api_key: '',
        base_url: ''
      },
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
    if (!window.confirm('Are you sure you want to delete this agent?')) {
      return;
    }
    
    setIsLoading(true);
    try {
      await axios.delete(`http://localhost:8000/chat/agents/${agentId}`);
      await fetchAgents();
    } catch (error) {
      console.error('Failed to delete agent:', error);
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