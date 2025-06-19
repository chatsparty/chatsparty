import { useState, useEffect } from "react";
import axios from "axios";
import type {
  VoiceConnection,
  CreateVoiceConnectionRequest,
  UpdateVoiceConnectionRequest,
  VoiceConnectionTestResult,
} from "@/types/voice";

export const useVoiceConnections = () => {
  const [connections, setConnections] = useState<VoiceConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConnections = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log(
        "Fetching voice connections from /voice-connections at",
        new Date().toISOString()
      );
      const response = await axios.get("/voice-connections", {
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });
      console.log("Voice connections response:", response.data);
      setConnections(response.data);
    } catch (err) {
      setError("Failed to fetch voice connections");
      console.error("Error fetching voice connections:", err);
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as any;
        console.error("Response status:", axiosError.response?.status);
        console.error("Response data:", axiosError.response?.data);
      }
    } finally {
      setLoading(false);
    }
  };

  const createConnection = async (
    connectionData: CreateVoiceConnectionRequest
  ): Promise<VoiceConnection> => {
    try {
      const response = await axios.post("/voice-connections", connectionData);
      const newConnection = response.data;

      setConnections((prev) => [...prev, newConnection]);
      return newConnection;
    } catch (err) {
      throw new Error("Failed to create voice connection");
    }
  };

  const updateConnection = async (
    id: string,
    updates: UpdateVoiceConnectionRequest
  ): Promise<VoiceConnection> => {
    try {
      const response = await axios.put(`/voice-connections/${id}`, updates);
      const updatedConnection = response.data;

      setConnections((prev) =>
        prev.map((conn) => (conn.id === id ? updatedConnection : conn))
      );
      return updatedConnection;
    } catch (err) {
      throw new Error("Failed to update voice connection");
    }
  };

  const deleteConnection = async (id: string): Promise<void> => {
    try {
      console.log(`Deleting voice connection ${id}`);
      await axios.delete(`/voice-connections/${id}`);
      console.log(`Voice connection ${id} deleted successfully`);

      setConnections((prev) => prev.filter((conn) => conn.id !== id));
    } catch (err) {
      console.error("Error deleting voice connection:", err);
      throw new Error("Failed to delete voice connection");
    }
  };

  const testConnection = async (
    id: string
  ): Promise<VoiceConnectionTestResult> => {
    try {
      const response = await axios.post(`/voice-connections/${id}/test`);
      return response.data;
    } catch (err) {
      throw new Error("Failed to test voice connection");
    }
  };

  const getActiveConnections = () => {
    return connections.filter((conn) => conn.is_active);
  };

  const getTTSConnections = () => {
    return connections.filter(
      (conn) =>
        conn.is_active &&
        (conn.provider_type === "tts" || conn.provider_type === "both")
    );
  };

  const getSTTConnections = () => {
    return connections.filter(
      (conn) =>
        conn.is_active &&
        (conn.provider_type === "stt" || conn.provider_type === "both")
    );
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
    getTTSConnections,
    getSTTConnections,
  };
};
