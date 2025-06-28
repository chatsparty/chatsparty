import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '@/config/api';

interface MCPServer {
  id: string;
  name: string;
  description?: string;
  server_url: string;
  server_config?: Record<string, any>;
  available_tools?: string[];
  status: 'active' | 'inactive' | 'error';
}

interface FormData {
  name: string;
  description: string;
  server_url: string;
  server_config: Record<string, any>;
}

export const useMCPServers = () => {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingServer, setEditingServer] = useState<MCPServer | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    server_url: '',
    server_config: {}
  });

  const fetchServers = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/mcp/servers`);
      setServers(response.data);
    } catch (error) {
      console.error('Failed to fetch MCP servers:', error);
    }
  };

  useEffect(() => {
    fetchServers();
  }, []);

  const handleCreateServer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (editingServer) {
        // Update existing server
        await axios.put(`${API_BASE_URL}/mcp/servers/${editingServer.id}`, {
          name: formData.name,
          description: formData.description,
          server_url: formData.server_url,
          server_config: formData.server_config
        });
      } else {
        // Create new server
        await axios.post(`${API_BASE_URL}/mcp/servers`, {
          name: formData.name,
          description: formData.description,
          server_url: formData.server_url,
          server_config: formData.server_config
        });
      }
      
      await fetchServers();
      resetForm();
    } catch (error) {
      console.error('Failed to create/update MCP server:', error);
      alert('Failed to save MCP server. Please check your configuration and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditServer = (server: MCPServer) => {
    setEditingServer(server);
    setFormData({
      name: server.name,
      description: server.description || '',
      server_url: server.server_url,
      server_config: server.server_config || {}
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
    setEditingServer(null);
    setFormData({
      name: '',
      description: '',
      server_url: '',
      server_config: {}
    });
  };

  const handleDeleteServer = async (serverId: string) => {
    if (!window.confirm('Are you sure you want to delete this MCP server?')) {
      return;
    }
    
    setIsLoading(true);
    try {
      await axios.delete(`${API_BASE_URL}/mcp/servers/${serverId}`);
      await fetchServers();
    } catch (error) {
      console.error('Failed to delete MCP server:', error);
      alert('Failed to delete MCP server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async (serverData?: FormData): Promise<{ success: boolean; tools?: string[]; error?: string }> => {
    try {
      const testData = serverData || formData;
      const response = await axios.post(`${API_BASE_URL}/mcp/test-connection`, {
        server_url: testData.server_url,
        server_config: testData.server_config
      });
      
      return {
        success: true,
        tools: response.data.available_tools || []
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Connection test failed'
      };
    }
  };

  return {
    servers,
    isLoading,
    showCreateForm,
    editingServer,
    formData,
    setShowCreateForm,
    handleCreateServer,
    handleEditServer,
    handleInputChange,
    resetForm,
    handleDeleteServer,
    handleTestConnection
  };
};