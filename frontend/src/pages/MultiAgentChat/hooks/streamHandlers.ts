import type { ActiveConversation, ConversationMessage } from '../types';
import type { StreamMessage } from './types';
import { API_BASE_URL } from './constants';

export const handleStreamConversation = async (
  conversationId: string,
  agentIds: string[],
  message: string,
  maxTurns: number,
  abortController: AbortController,
  onMessage: (conversationId: string, message: StreamMessage) => void
): Promise<void> => {
  try {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${API_BASE_URL}/chat/agents/conversation/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: JSON.stringify({
        conversation_id: conversationId,
        agent_ids: agentIds,
        initial_message: message,
        max_turns: maxTurns
      }),
      signal: abortController.signal
    });

    if (!response.ok) {
      throw new Error('Failed to start streaming conversation');
    }
    
    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = '';

    const processStream = async (): Promise<void> => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            
            const data = line.slice(6);
            if (data.trim() === '') continue;

            try {
              const message = JSON.parse(data);
              onMessage(conversationId, message);
            } catch (e) {
              console.error('Error parsing message:', e);
            }
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Stream reading error:', error);
        }
      }
    };

    await processStream();
  } catch (error) {
    if (error instanceof Error && error.name !== 'AbortError') {
      console.error('Failed to start conversation:', error);
      throw error;
    }
  }
};

export const createStreamMessageHandlers = (
  setConversations: React.Dispatch<React.SetStateAction<ActiveConversation[]>>
) => {
  const handleStreamMessage = (conversationId: string, message: StreamMessage): void => {
    if (message.type === 'complete') {
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, isActive: false }
            : conv
        )
      );
      return;
    }
    
    if (message.type === 'typing') {
      setConversations(prev => 
        prev.map(conv => {
          if (conv.id === conversationId) {
            const typingMessage: ConversationMessage = {
              speaker: message.speaker || 'typing',
              agent_id: message.agent_id,
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
      return;
    }
    
    if (message.type === 'message') {
      setConversations(prev => 
        prev.map(conv => {
          if (conv.id === conversationId) {
            const filteredMessages = conv.messages.filter(msg => msg.message !== '...');
            const newMessage: ConversationMessage = {
              speaker: message.speaker || 'unknown',
              agent_id: message.agent_id,
              message: message.message || '',
              timestamp: message.timestamp || Date.now() / 1000
            };
            return {
              ...conv,
              messages: [...filteredMessages, newMessage]
            };
          }
          return conv;
        })
      );
    }
  };

  return { handleStreamMessage };
};