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
      console.log('🟢 Socket Event: Conversation started:', data);
    };

    const handleConversationCreated = (data: any) => {
      console.log('🟢 Socket Event: Conversation created:', data);
      // Update the conversation ID from client ID to database ID
      if (data.client_conversation_id && data.database_conversation_id) {
        setConversations(prev => 
          prev.map(conv => 
            conv.id === data.client_conversation_id 
              ? { ...conv, id: data.database_conversation_id, name: data.title || conv.name }
              : conv
          )
        );
        
        // Update the URL if we're on the conversation page
        if (window.location.pathname.includes(`/chat/${data.client_conversation_id}`)) {
          window.history.replaceState(null, '', `/chat/${data.database_conversation_id}`);
        }
      }
    };

    const handleConversationResumed = (data: any) => {
      console.log('🟢 Socket Event: Conversation resumed:', data);
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
      console.log('🟢 Socket Event: Conversation complete:', data);
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
      console.error('🔴 Socket Event: Conversation error:', data);
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
      console.log('🟡 Socket Event: Agent typing:', data);
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
      console.log('🟢 Socket Event: Agent message:', data);
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
    socketService.on('conversation_created', handleConversationCreated);
    socketService.on('conversation_resumed', handleConversationResumed);
    socketService.on('conversation_complete', handleConversationComplete);
    socketService.on('conversation_error', handleConversationError);
    socketService.on('agent_typing', handleAgentTyping);
    socketService.on('agent_message', handleAgentMessage);

    return () => {
      socketService.off('conversation_started', handleConversationStarted);
      socketService.off('conversation_created', handleConversationCreated);
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
    console.log('🔵 useSocketConversation.startSocketConversation called', {
      conversationId,
      agentIds,
      initialMessage,
      maxTurns,
      fileAttachments: fileAttachments?.length || 0,
      socketConnected: socketService.isConnected()
    });

    if (!socketService.isConnected()) {
      console.log('🟡 Socket not connected, connecting...');
      try {
        await socketService.connect();
        console.log('🟢 Socket connected successfully');
      } catch (error) {
        console.error('🔴 Failed to connect before starting conversation:', error);
        throw new Error('Failed to connect to server');
      }
    }

    const conversationData = {
      conversation_id: conversationId,
      agent_ids: agentIds,
      initial_message: initialMessage,
      max_turns: maxTurns,
      file_attachments: fileAttachments
    };

    console.log('🟡 Calling socketService.startConversation with:', conversationData);
    socketService.startConversation(conversationData);
  }, []);

  const stopSocketConversation = useCallback((conversationId: string) => {
    socketService.stopConversation(conversationId);
  }, []);

  const sendSocketMessage = useCallback(async (
    conversationId: string,
    message: string,
    agentIds: string[]
  ) => {
    console.log('🔵 useSocketConversation.sendSocketMessage called', {
      conversationId,
      message,
      agentIds,
      socketConnected: socketService.isConnected()
    });

    if (!socketService.isConnected()) {
      console.log('🟡 Socket not connected, connecting...');
      try {
        await socketService.connect();
        console.log('🟢 Socket connected successfully');
      } catch (error) {
        console.error('🔴 Failed to connect before sending message:', error);
        throw new Error('Failed to connect to server');
      }
    }

    console.log('🟡 Calling socketService.sendMessage');
    socketService.sendMessage(conversationId, message, agentIds);
  }, []);

  return {
    startSocketConversation,
    stopSocketConversation,
    sendSocketMessage,
    isConnected: () => socketService.isConnected()
  };
};