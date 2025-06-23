import { useEffect, useContext, createContext, useState } from "react";
import type { ReactNode } from "react";
import { webSocketService, MessageType } from "./WebSocketService";
import type { MessageHandler } from "./WebSocketService";
import { useAuth } from "../../contexts/AuthContext";

interface WebSocketContextType {
  isConnected: boolean;
  subscribe: (channel: string) => void;
  unsubscribe: (channel: string) => void;
  onMessage: (type: MessageType, handler: MessageHandler) => void;
  offMessage: (type: MessageType, handler: MessageHandler) => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const WebSocketProvider = ({ children }: { children: ReactNode }) => {
  const [isConnected, setIsConnected] = useState(false);
  const { token, loading } = useAuth();
  
  useEffect(() => {
    if (!loading) {
      if (token) {
        webSocketService.connect(token)
          .then(() => setIsConnected(true))
          .catch(error => {
            console.error("WebSocket connection failed:", error);
            setIsConnected(false);
            
            // If it's an authentication error, the token might be expired
            // The AuthContext should handle token refresh automatically
          });
      } else {
        webSocketService.disconnect();
        setIsConnected(false);
      }
    }
    
    return () => {
      webSocketService.disconnect();
      setIsConnected(false);
    };
  }, [token, loading]);
  
  const subscribe = (channel: string) => {
    webSocketService.subscribe(channel);
  };
  
  const unsubscribe = (channel: string) => {
    webSocketService.unsubscribe(channel);
  };
  
  const onMessage = (type: MessageType, handler: MessageHandler) => {
    webSocketService.onMessage(type, handler);
  };
  
  const offMessage = (type: MessageType, handler: MessageHandler) => {
    webSocketService.offMessage(type, handler);
  };
  
  return (
    <WebSocketContext.Provider value={{
      isConnected,
      subscribe,
      unsubscribe, 
      onMessage,
      offMessage
    }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocket must be used within a WebSocketProvider");
  }
  return context;
};