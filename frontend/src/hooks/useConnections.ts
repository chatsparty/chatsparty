import { useState, useEffect } from "react";
import axios from "axios";
import type {
  ModelConnection,
  CreateConnectionRequest,
  UpdateConnectionRequest,
  ConnectionTestResult,
} from "@/types/connection";

export const useConnections = () => {
  const [connections, setConnections] = useState<ModelConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConnections = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch user connections and default connection in parallel
      const [userConnectionsResponse, defaultConnectionResponse] =
        await Promise.all([
          axios.get("/connections"),
          axios
            .get("/system-default-connection")
            .catch(() => ({ data: { enabled: false, connection: null } })),
        ]);

      // Handle user connections
      const userData =
        userConnectionsResponse.data?.data || userConnectionsResponse.data;
      const userConnections = Array.isArray(userData) ? userData : [];

      // Handle default connection
      const defaultData = defaultConnectionResponse.data;
      const allConnections = [...userConnections];

      // Add default connection if enabled and available
      if (defaultData.enabled && defaultData.connection) {
        const defaultConnection: ModelConnection = {
          id: defaultData.connection.id,
          name: `${defaultData.connection.name} (ChatsParty Default)`,
          description:
            defaultData.connection.description ||
            "System-provided default connection",
          provider: defaultData.connection.provider,
          model_name: defaultData.connection.modelName,
          api_key: undefined, // Never expose API keys
          base_url: defaultData.connection.baseUrl,
          is_active: defaultData.connection.isActive,
          is_default: true,
          created_at: defaultData.connection.createdAt,
          updated_at: defaultData.connection.updatedAt,
          is_system_default: true, // Add flag to identify system defaults
        };
        allConnections.unshift(defaultConnection); // Add at the beginning
      }

      setConnections(allConnections);
    } catch (err) {
      setError("Failed to fetch connections");
      setConnections([]); // Ensure connections is always an array
      console.error("Error fetching connections:", err);
    } finally {
      setLoading(false);
    }
  };

  const createConnection = async (
    connectionData: CreateConnectionRequest
  ): Promise<ModelConnection> => {
    try {
      const response = await axios.post("/connections", connectionData);
      const newConnection = response.data;
      setConnections((prev) => [...prev, newConnection]);
      return newConnection;
    } catch (err) {
      throw new Error("Failed to create connection");
    }
  };

  const updateConnection = async (
    id: string,
    updates: UpdateConnectionRequest
  ): Promise<ModelConnection> => {
    try {
      // Check if this is a system default connection
      const connection = connections.find((conn) => conn.id === id);
      if (connection?.is_system_default) {
        throw new Error("Cannot update system default connection");
      }

      const response = await axios.put(`/connections/${id}`, updates);
      const updatedConnection = response.data;
      setConnections((prev) =>
        prev.map((conn) => (conn.id === id ? updatedConnection : conn))
      );
      return updatedConnection;
    } catch (err) {
      throw new Error("Failed to update connection");
    }
  };

  const deleteConnection = async (id: string): Promise<void> => {
    try {
      // Check if this is a system default connection
      const connection = connections.find((conn) => conn.id === id);
      if (connection?.is_system_default) {
        throw new Error("Cannot delete system default connection");
      }

      await axios.delete(`/connections/${id}`);
      setConnections((prev) => prev.filter((conn) => conn.id !== id));
    } catch (err) {
      throw new Error("Failed to delete connection");
    }
  };

  const testConnection = async (id: string): Promise<ConnectionTestResult> => {
    try {
      // Check if this is a system default connection
      const connection = connections.find((conn) => conn.id === id);
      if (connection?.is_system_default) {
        // Use the default connection test endpoint
        const response = await axios.post(
          "/system-default-connection/test"
        );
        return {
          success: response.data.success,
          message:
            response.data.message || "System default connection test completed",
        };
      }

      const response = await axios.post(`/connections/${id}/test`);
      return response.data;
    } catch (err) {
      throw new Error("Failed to test connection");
    }
  };

  const getActiveConnections = () => {
    return Array.isArray(connections)
      ? connections.filter((conn) => conn.is_active)
      : [];
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
    getActiveConnections,
  };
};
