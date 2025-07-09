import { useCallback, useEffect, useRef } from 'react';
import { socketService } from '../../../services/socketService';
import type { SocketMessage } from '../../../services/socketService';
import type { ActiveConversation, ConversationMessage } from '../types';

interface UseSocketConversationParams {
  setConversations: React.Dispatch<React.SetStateAction<ActiveConversation[]>>;
  onError?: (error: string, conversationId?: string) => void;
}

export const useSocketConversation = ({ 
  setConversations, 
  onError 
}: UseSocketConversationParams) => {
  const isConnectedRef = useRef(false);

  useEffect(() => {
    const connectSocket = async () => {
      try {
        await socketService.connect();
        isConnectedRef.current = true;
      } catch (error) {
        console.error('Failed to connect to Socket.IO:', error);
        onError?.('Failed to connect to server');
      }
    };

    if (!socketService.isConnected()) {
      connectSocket();
    } else {
      isConnectedRef.current = true;
    }

    return () => {
    };
  }, [onError]);

  useEffect(() => {
    const handleConversationStarted = (data: any) => {
      console.log('Conversation started:', data);
    };

    const handleConversationResumed = (data: any) => {
      console.log('Conversation resumed:', data);
      const conversationId = data.conversation_id;
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, isActive: true }
            : conv
        )
      );
    };

    const handleConversationComplete = (data: any) => {
      const conversationId = data.conversation_id;
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, isActive: false }
            : conv
        )
      );
    };

    const handleConversationError = (data: any) => {
      console.error('Conversation error:', data);
      onError?.(data.error || 'Conversation error occurred', data.conversation_id);
      
      if (data.conversation_id) {
        setConversations(prev => 
          prev.map(conv => 
            conv.id === data.conversation_id 
              ? { ...conv, isActive: false }
              : conv
          )
        );
      }
    };

    const handleAgentTyping = (data: SocketMessage) => {
      if (!data.conversation_id) return;
      
      setConversations(prev => 
        prev.map(conv => {
          if (conv.id === data.conversation_id) {
            const typingMessage: ConversationMessage = {
              speaker: data.speaker || 'typing',
              agent_id: data.agent_id,
              message: '...',
              timestamp: Date.now() / 1000
            };
            
            const filteredMessages = conv.messages.filter(msg => msg.message !== '...');
            return {
              ...conv,
              messages: [...filteredMessages, typingMessage]
            };
          }
          return conv;
        })
      );
    };

    const handleAgentMessage = (data: SocketMessage) => {
      if (!data.conversation_id) return;
      
      setConversations(prev => 
        prev.map(conv => {
          if (conv.id === data.conversation_id) {
            const filteredMessages = conv.messages.filter(msg => msg.message !== '...');
            const newMessage: ConversationMessage = {
              speaker: data.speaker || 'unknown',
              agent_id: data.agent_id,
              message: data.message || '',
              timestamp: data.timestamp || Date.now() / 1000
            };
            return {
              ...conv,
              messages: [...filteredMessages, newMessage]
            };
          }
          return conv;
        })
      );
    };

    socketService.on('conversation_started', handleConversationStarted);
    socketService.on('conversation_resumed', handleConversationResumed);
    socketService.on('conversation_complete', handleConversationComplete);
    socketService.on('conversation_error', handleConversationError);
    socketService.on('agent_typing', handleAgentTyping);
    socketService.on('agent_message', handleAgentMessage);

    return () => {
      socketService.off('conversation_started', handleConversationStarted);
      socketService.off('conversation_resumed', handleConversationResumed);
      socketService.off('conversation_complete', handleConversationComplete);
      socketService.off('conversation_error', handleConversationError);
      socketService.off('agent_typing', handleAgentTyping);
      socketService.off('agent_message', handleAgentMessage);
    };
  }, [setConversations, onError]);

  const startSocketConversation = useCallback(async (
    conversationId: string,
    agentIds: string[],
    initialMessage: string,
    maxTurns: number,
    fileAttachments?: Array<{filename: string, content: string, file_type: string}>
  ) => {
    if (!socketService.isConnected()) {
      try {
        await socketService.connect();
      } catch (error) {
        console.error('Failed to connect before starting conversation:', error);
        throw new Error('Failed to connect to server');
      }
    }

    socketService.startConversation({
      conversation_id: conversationId,
      agent_ids: agentIds,
      initial_message: initialMessage,
      max_turns: maxTurns,
      file_attachments: fileAttachments
    });
  }, []);

  const stopSocketConversation = useCallback((conversationId: string) => {
    socketService.stopConversation(conversationId);
  }, []);

  const sendSocketMessage = useCallback(async (
    conversationId: string,
    message: string,
    agentIds: string[]
  ) => {
    if (!socketService.isConnected()) {
      try {
        await socketService.connect();
      } catch (error) {
        console.error('Failed to connect before sending message:', error);
        throw new Error('Failed to connect to server');
      }
    }

    socketService.sendMessage(conversationId, message, agentIds);
  }, []);

  return {
    startSocketConversation,
    stopSocketConversation,
    sendSocketMessage,
    isConnected: () => socketService.isConnected()
  };
};