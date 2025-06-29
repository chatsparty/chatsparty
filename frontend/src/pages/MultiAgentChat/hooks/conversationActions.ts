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
  attachedFiles?: Array<{id: string, name: string, extractedContent?: string, file: File}>
) => {
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
  const { getAgentName } = createAgentHelpers(agents);
  const { handleStreamMessage } = createStreamMessageHandlers(setConversations);
  const { trackConversationStarted, trackMessageSent, trackError } = useTracking();
  
  const { startSocketConversation, stopSocketConversation, sendSocketMessage } = useSocketConversation({
    setConversations,
    onError: (error) => {
      trackError('socket_error', error, 'multi_agent_chat');
    }
  });

  const startConversation = useCallback(async (
    agentsToUse?: string[], 
    messageToUse?: string
  ): Promise<void> => {
    const finalAgents = agentsToUse || selectedAgents;
    const finalMessage = messageToUse || initialMessage;
    
    if (finalAgents.length < 2 || !finalMessage.trim()) return;

    setIsLoading(true);
    const conversationId = `conv_${Date.now()}`;
    const abortController = new AbortController();
    abortControllersRef.current.set(conversationId, abortController);
    
    try {
      const newConversation: ActiveConversation = {
        id: conversationId,
        name: finalAgents.map(id => getAgentName(id)).join(' & '),
        agents: finalAgents,
        messages: [{
          speaker: 'user',
          message: finalMessage,
          timestamp: Date.now() / 1000
        }],
        isActive: true
      };

      setConversations(prev => [...prev, newConversation]);
      setActiveConversation(conversationId);
      
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

      await startSocketConversation(
        conversationId,
        finalAgents,
        finalMessage,
        maxTurns,
        fileAttachments,
        undefined
      );
      
    } catch (error) {
      console.error('Failed to start conversation:', error instanceof Error ? error.message : String(error));
      trackError('conversation_start_error', error instanceof Error ? error.message : 'Unknown error', 'multi_agent_chat');
      alert('Failed to start conversation. Make sure all selected agents exist.');
      setConversations(prev => prev.filter(conv => conv.id !== conversationId));
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
    trackError
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
    if (!message.trim() || agentIds.length < 2) return;

    try {
      trackMessageSent({
        message_length: message.length,
        conversation_type: 'multi_agent',
        agent_count: agentIds.length,
        conversation_id: conversationId
      });

      await sendSocketMessage(conversationId, message, agentIds);
    } catch (error) {
      console.error('Failed to send message:', error);
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