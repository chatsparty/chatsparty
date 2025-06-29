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
  
  const { startSocketConversation, stopSocketConversation } = useSocketConversation({
    setConversations,
    onError: (error) => {
      trackError('socket_error', error, 'multi_agent_chat');
    }
  });

  const startConversation = useCallback(async (): Promise<void> => {
    if (selectedAgents.length < 2 || !initialMessage.trim()) return;

    setIsLoading(true);
    const conversationId = `conv_${Date.now()}`;
    const abortController = new AbortController();
    abortControllersRef.current.set(conversationId, abortController);
    
    try {
      const newConversation: ActiveConversation = {
        id: conversationId,
        name: selectedAgents.map(id => getAgentName(id)).join(' & '),
        agents: selectedAgents,
        messages: [{
          speaker: 'user',
          message: initialMessage,
          timestamp: Date.now() / 1000
        }],
        isActive: true
      };

      setConversations(prev => [...prev, newConversation]);
      setActiveConversation(conversationId);
      
      trackConversationStarted({
        conversation_id: conversationId,
        agent_count: selectedAgents.length,
        agent_names: selectedAgents.map(id => getAgentName(id)).join(', ')
      });
      
      trackMessageSent({
        message_length: initialMessage.length,
        conversation_type: 'multi_agent',
        agent_count: selectedAgents.length,
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
        selectedAgents,
        initialMessage,
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

  const cleanup = useCallback(() => {
    abortControllersRef.current.forEach(controller => controller.abort());
    abortControllersRef.current.clear();
  }, []);

  return {
    startConversation,
    stopConversation,
    handleSelectAgent,
    cleanup
  };
};