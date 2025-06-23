import { useEffect, useState, useCallback, useContext, createContext } from 'react';
import { socketIOService, MessageType, type MessageHandler, type SocketIOMessage } from './SocketIOService';
import { useAuth } from '../../contexts/AuthContext';

interface SocketIOContextValue {
  isConnected: boolean;
  subscribe: (channel: string) => void;
  unsubscribe: (channel: string) => void;
  onMessage: (type: MessageType, handler: MessageHandler) => void;
  offMessage: (type: MessageType, handler: MessageHandler) => void;
  send: (message: SocketIOMessage) => void;
}

const SocketIOContext = createContext<SocketIOContextValue | null>(null);

export const SocketIOProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const { token } = useAuth();

  useEffect(() => {
    if (!token) return;

    const connect = async () => {
      try {
        await socketIOService.connect(token);
        setIsConnected(true);
      } catch (error) {
        console.error('[SOCKETIO] Failed to connect:', error);
        setIsConnected(false);
      }
    };

    connect();

    // Monitor connection status
    const checkConnection = () => {
      setIsConnected(socketIOService.isConnected);
    };

    const interval = setInterval(checkConnection, 1000);

    return () => {
      clearInterval(interval);
      socketIOService.disconnect();
      setIsConnected(false);
    };
  }, [token]);

  const subscribe = useCallback((channel: string) => {
    socketIOService.subscribe(channel);
  }, []);

  const unsubscribe = useCallback((channel: string) => {
    socketIOService.unsubscribe(channel);
  }, []);

  const onMessage = useCallback((type: MessageType, handler: MessageHandler) => {
    socketIOService.onMessage(type, handler);
  }, []);

  const offMessage = useCallback((type: MessageType, handler: MessageHandler) => {
    socketIOService.offMessage(type, handler);
  }, []);

  const send = useCallback((message: SocketIOMessage) => {
    socketIOService.send(message);
  }, []);

  const value = {
    isConnected,
    subscribe,
    unsubscribe,
    onMessage,
    offMessage,
    send
  };

  return (
    <SocketIOContext.Provider value={value}>
      {children}
    </SocketIOContext.Provider>
  );
};

export const useSocketIO = () => {
  const context = useContext(SocketIOContext);
  if (!context) {
    throw new Error('useSocketIO must be used within a SocketIOProvider');
  }
  return context;
};