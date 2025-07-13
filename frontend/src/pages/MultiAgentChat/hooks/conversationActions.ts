import { useCallback, useRef } from 'react';
import type { ActiveConversation, Agent } from '../types';
import { createStreamMessageHandlers } from './streamHandlers';
import { createAgentHelpers } from './helpers';
import { useTracking } from '../../../hooks/useTracking';
import { useSocketConversation } from './useSocketConversation';

export const useConversationActions = (
  agents: Agent[],
  selectedAgents: string[],
  initialMessage: string,
  maxTurns: number,
  setConversations: React.Dispatch<React.SetStateAction<ActiveConversation[]>>,
  setActiveConversation: (id: string | null) => void,
  setShowNewConversationForm: (show: boolean) => void,
  setSelectedAgents: React.Dispatch<React.SetStateAction<string[]>>,
  setInitialMessage: (message: string) => void,
  setIsLoading: (loading: boolean) => void,
  attachedFiles?: Array<{id: string, name: string, extractedContent?: string, file: File}>,
  navigate?: (path: string, options?: { replace?: boolean }) => void
) => {
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
  const conversationErrorCallbackRef = useRef<((error: string) => void) | null>(null);
  const { getAgentName } = createAgentHelpers(agents);
  const { handleStreamMessage } = createStreamMessageHandlers(setConversations);
  const { trackConversationStarted, trackMessageSent, trackError } = useTracking();
  
  const activeConversationIdRef = useRef<string | null>(null);
  
  const { startSocketConversation, stopSocketConversation, sendSocketMessage } = useSocketConversation({
    setConversations,
    onError: (error, conversationId) => {
      trackError('socket_error', error, 'multi_agent_chat');
      
      // Clean up the failed conversation
      if (conversationId || activeConversationIdRef.current) {
        const convId = conversationId || activeConversationIdRef.current;
        setConversations(prev => prev.filter(conv => conv.id !== convId));
        activeConversationIdRef.current = null;
      }
      
      // Check if it's an insufficient credits error
      if (error.includes('Insufficient credits')) {
        // Parse the error to extract the numbers
        const match = error.match(/Required: (\d+), Available: (\d+)/);
        if (match) {
          const required = match[1];
          const available = match[2];
          // Call the error callback if it exists
          if (conversationErrorCallbackRef.current) {
            conversationErrorCallbackRef.current(`insufficient_credits:${required}:${available}`);
          }
        }
      } else if (conversationErrorCallbackRef.current) {
        conversationErrorCallbackRef.current(error);
      }
    }
  });

  const startConversation = useCallback(async (
    agentsToUse?: string[], 
    messageToUse?: string,
    onError?: (error: string) => void
  ): Promise<void> => {
    console.log('🔵 conversationActions.startConversation called', {
      agentsToUse,
      messageToUse,
      selectedAgents,
      initialMessage,
      hasOnError: !!onError
    });

    // Set the error callback for socket errors
    conversationErrorCallbackRef.current = onError || null;
    const finalAgents = agentsToUse || selectedAgents;
    const finalMessage = messageToUse || initialMessage;
    
    console.log('🟡 Final conversation parameters', {
      finalAgents,
      finalMessage,
      agentCount: finalAgents.length,
      messageLength: finalMessage.trim().length
    });
    
    if (finalAgents.length < 2 || !finalMessage.trim()) {
      console.log('🔴 startConversation: Early return - invalid parameters', {
        agentCount: finalAgents.length,
        hasMessage: !!finalMessage.trim()
      });
      return;
    }

    setIsLoading(true);
    const conversationId = `conv_${Date.now()}`;
    const abortController = new AbortController();
    abortControllersRef.current.set(conversationId, abortController);
    
    console.log('🟡 Creating new conversation', {
      conversationId,
      finalAgents,
      agentNames: finalAgents.map(id => getAgentName(id))
    });
    
    try {
      const newConversation: ActiveConversation = {
        id: conversationId,
        name: finalAgents.map(id => getAgentName(id)).join(' & '),
        agents: finalAgents,
        messages: [],
        isActive: true
      };

      console.log('🟡 Setting conversation state', newConversation);
      setConversations(prev => [...prev, newConversation]);
      setActiveConversation(conversationId);
      activeConversationIdRef.current = conversationId;
      
      // Navigate to the conversation URL
      if (navigate) {
        navigate(`/chat/${conversationId}`);
      }
      
      trackConversationStarted({
        conversation_id: conversationId,
        agent_count: finalAgents.length,
        agent_names: finalAgents.map(id => getAgentName(id)).join(', ')
      });
      
      trackMessageSent({
        message_length: finalMessage.length,
        conversation_type: 'multi_agent',
        agent_count: finalAgents.length,
        conversation_id: conversationId
      });
      
      setShowNewConversationForm(false);
      setSelectedAgents([]);
      setInitialMessage('');

      const fileAttachments = attachedFiles
        ?.filter(file => file.extractedContent)
        .map(file => ({
          filename: file.name,
          content: file.extractedContent!,
          file_type: file.file.type || 'application/octet-stream'
        }));

      console.log('🟡 Starting socket conversation', {
        conversationId,
        finalAgents,
        finalMessage,
        maxTurns,
        fileAttachments: fileAttachments?.length || 0
      });

      await startSocketConversation(
        conversationId,
        finalAgents,
        finalMessage,
        maxTurns,
        fileAttachments
      );
      
      console.log('🟢 Socket conversation started successfully');
      
    } catch (error) {
      console.error('Failed to start conversation:', error instanceof Error ? error.message : String(error));
      trackError('conversation_start_error', error instanceof Error ? error.message : 'Unknown error', 'multi_agent_chat');
      // Don't remove conversation here - let socket error handler handle it
      // Re-throw the error to be handled by the UI
      throw error;
    } finally {
      abortControllersRef.current.delete(conversationId);
      setIsLoading(false);
    }
  }, [
    selectedAgents,
    initialMessage,
    maxTurns,
    getAgentName,
    handleStreamMessage,
    setConversations,
    setActiveConversation,
    setShowNewConversationForm,
    setSelectedAgents,
    setInitialMessage,
    setIsLoading,
    attachedFiles,
    trackConversationStarted,
    trackMessageSent,
    trackError,
    startSocketConversation
  ]);

  const stopConversation = useCallback((conversationId: string): void => {
    stopSocketConversation(conversationId);
    
    const abortController = abortControllersRef.current.get(conversationId);
    if (abortController) {
      abortController.abort();
      abortControllersRef.current.delete(conversationId);
    }
    
    setConversations(prev => 
      prev.map(conv => 
        conv.id === conversationId 
          ? { ...conv, isActive: false }
          : conv
      )
    );
  }, [setConversations, stopSocketConversation]);

  const handleSelectAgent = useCallback((agentId: string, checked: boolean): void => {
    if (checked) {
      setSelectedAgents(prev => [...prev, agentId]);
    } else {
      setSelectedAgents(prev => prev.filter(id => id !== agentId));
    }
  }, [setSelectedAgents]);

  const sendMessage = useCallback(async (
    conversationId: string,
    message: string,
    agentIds: string[]
  ): Promise<void> => {
    console.log('🔵 conversationActions.sendMessage called', {
      conversationId,
      message,
      agentIds,
      messageLength: message.trim().length,
      agentCount: agentIds.length
    });

    if (!message.trim() || agentIds.length < 2) {
      console.log('🔴 sendMessage: Early return - invalid parameters', {
        hasMessage: !!message.trim(),
        agentCount: agentIds.length
      });
      return;
    }

    try {
      trackMessageSent({
        message_length: message.length,
        conversation_type: 'multi_agent',
        agent_count: agentIds.length,
        conversation_id: conversationId
      });

      console.log('🟡 Calling sendSocketMessage');
      await sendSocketMessage(conversationId, message, agentIds);
      console.log('🟢 Socket message sent successfully');
    } catch (error) {
      console.error('🔴 Failed to send message:', error);
      trackError('message_send_error', error instanceof Error ? error.message : 'Unknown error', 'multi_agent_chat');
      throw error;
    }
  }, [sendSocketMessage, trackMessageSent, trackError]);

  const cleanup = useCallback(() => {
    abortControllersRef.current.forEach(controller => controller.abort());
    abortControllersRef.current.clear();
  }, []);

  return {
    startConversation,
    stopConversation,
    sendMessage,
    handleSelectAgent,
    cleanup
  };
};