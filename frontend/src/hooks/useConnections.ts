import { useState, useEffect } from 'react';
import axios from 'axios';
import type { ModelConnection, CreateConnectionRequest, UpdateConnectionRequest, ConnectionTestResult } from '@/types/connection';

export const useConnections = () => {
  const [connections, setConnections] = useState<ModelConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConnections = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/connections');
      setConnections(response.data);
    } catch (err) {
      setError('Failed to fetch connections');
      console.error('Error fetching connections:', err);
    } finally {
      setLoading(false);
    }
  };

  const createConnection = async (connectionData: CreateConnectionRequest): Promise<ModelConnection> => {
    try {
      const response = await axios.post('/connections', connectionData);
      const newConnection = response.data;
      setConnections(prev => [...prev, newConnection]);
      return newConnection;
    } catch (err) {
      throw new Error('Failed to create connection');
    }
  };

  const updateConnection = async (id: string, updates: UpdateConnectionRequest): Promise<ModelConnection> => {
    try {
      const response = await axios.put(`/connections/${id}`, updates);
      const updatedConnection = response.data;
      setConnections(prev => prev.map(conn => 
        conn.id === id ? updatedConnection : conn
      ));
      return updatedConnection;
    } catch (err) {
      throw new Error('Failed to update connection');
    }
  };

  const deleteConnection = async (id: string): Promise<void> => {
    try {
      await axios.delete(`/connections/${id}`);
      setConnections(prev => prev.filter(conn => conn.id !== id));
    } catch (err) {
      throw new Error('Failed to delete connection');
    }
  };

  const testConnection = async (id: string): Promise<ConnectionTestResult> => {
    try {
      const response = await axios.post(`/connections/${id}/test`);
      return response.data;
    } catch (err) {
      throw new Error('Failed to test connection');
    }
  };

  const getActiveConnections = () => {
    return connections.filter(conn => conn.is_active);
  };

  useEffect(() => {
    fetchConnections();
  }, []);

  return {
    connections,
    loading,
    error,
    fetchConnections,
    createConnection,
    updateConnection,
    deleteConnection,
    testConnection,
    getActiveConnections
  };
};