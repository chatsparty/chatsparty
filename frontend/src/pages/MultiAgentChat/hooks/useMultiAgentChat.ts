import { useState, useEffect } from 'react';
import axios from 'axios';
import type { Agent, ActiveConversation, ConversationMessage } from '../types';

export const useMultiAgentChat = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [conversations, setConversations] = useState<ActiveConversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [initialMessage, setInitialMessage] = useState('');
  const [maxTurns, setMaxTurns] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [showNewConversationForm, setShowNewConversationForm] = useState(false);
  const [abortControllers, setAbortControllers] = useState<Map<string, AbortController>>(new Map());

  const fetchAgents = async () => {
    try {
      const response = await axios.get('http://localhost:8000/chat/agents');
      setAgents(response.data);
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const startConversation = async () => {
    if (selectedAgents.length < 2 || !initialMessage.trim()) return;

    setIsLoading(true);
    const conversationId = `conv_${Date.now()}`;
    const abortController = new AbortController();
    
    // Store abort controller for this conversation
    setAbortControllers(prev => new Map(prev.set(conversationId, abortController)));
    
    try {
      // Create new conversation
      const newConversation: ActiveConversation = {
        id: conversationId,
        name: `${selectedAgents.map(id => agents.find(a => a.agent_id === id)?.name || id).join(' & ')}`,
        agents: selectedAgents,
        messages: [],
        isActive: true
      };

      setConversations(prev => [...prev, newConversation]);
      setActiveConversation(conversationId);
      setShowNewConversationForm(false);
      setSelectedAgents([]);
      setInitialMessage('');

      // Send the conversation request via POST and stream the response
      fetch('http://localhost:8000/chat/agents/conversation/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversation_id: conversationId,
          agent_ids: selectedAgents,
          initial_message: initialMessage,
          max_turns: maxTurns
        }),
        signal: abortController.signal
      }).then(response => {
        if (!response.ok) {
          throw new Error('Failed to start streaming conversation');
        }
        
        const reader = response.body?.getReader();
        if (!reader) return;

        const decoder = new TextDecoder();
        let buffer = '';

        const readStream = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  if (data.trim() === '') continue;

                  try {
                    const message = JSON.parse(data);
                    
                    if (message.type === 'complete') {
                      setConversations(prev => 
                        prev.map(conv => 
                          conv.id === conversationId 
                            ? { ...conv, isActive: false }
                            : conv
                        )
                      );
                      // Clean up abort controller
                      setAbortControllers(prev => {
                        const newMap = new Map(prev);
                        newMap.delete(conversationId);
                        return newMap;
                      });
                      break;
                    }
                    
                    if (message.type === 'typing') {
                      setConversations(prev => 
                        prev.map(conv => {
                          if (conv.id === conversationId) {
                            const typingMessage: ConversationMessage = {
                              speaker: message.speaker,
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
                    }
                    
                    if (message.type === 'message') {
                      setConversations(prev => 
                        prev.map(conv => {
                          if (conv.id === conversationId) {
                            const filteredMessages = conv.messages.filter(msg => msg.message !== '...');
                            const newMessage: ConversationMessage = {
                              speaker: message.speaker,
                              agent_id: message.agent_id,
                              message: message.message,
                              timestamp: message.timestamp
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
                  } catch (e) {
                    console.error('Error parsing message:', e);
                  }
                }
              }
            }
          } catch (error) {
            console.error('Stream reading error:', error);
          }
        };

        readStream();
      }).catch(error => {
        console.error('Failed to start conversation:', error);
        if (error.name !== 'AbortError') {
          alert('Failed to start conversation. Make sure all selected agents exist.');
        }
        setConversations(prev => prev.filter(conv => conv.id !== conversationId));
        // Clean up abort controller
        setAbortControllers(prev => {
          const newMap = new Map(prev);
          newMap.delete(conversationId);
          return newMap;
        });
      });

    } catch (error) {
      console.error('Failed to start conversation:', error);
      alert('Failed to start conversation. Make sure all selected agents exist.');
      // Clean up abort controller
      setAbortControllers(prev => {
        const newMap = new Map(prev);
        newMap.delete(conversationId);
        return newMap;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const stopConversation = (conversationId: string) => {
    const abortController = abortControllers.get(conversationId);
    if (abortController) {
      abortController.abort();
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, isActive: false }
            : conv
        )
      );
      // Clean up abort controller
      setAbortControllers(prev => {
        const newMap = new Map(prev);
        newMap.delete(conversationId);
        return newMap;
      });
    }
  };

  const getAgentName = (agentId: string) => {
    return agents.find(a => a.agent_id === agentId)?.name || agentId;
  };

  const getAgentColor = (agentId: string) => {
    const colors = [
      '#007bff', '#28a745', '#dc3545', '#ffc107', 
      '#17a2b8', '#6f42c1', '#e83e8c', '#fd7e14'
    ];
    const index = agents.findIndex(a => a.agent_id === agentId);
    return colors[index % colors.length] || '#6c757d';
  };

  const handleSelectAgent = (agentId: string, checked: boolean) => {
    if (checked) {
      setSelectedAgents(prev => [...prev, agentId]);
    } else {
      setSelectedAgents(prev => prev.filter(id => id !== agentId));
    }
  };

  return {
    agents,
    conversations,
    activeConversation,
    selectedAgents,
    initialMessage,
    maxTurns,
    isLoading,
    showNewConversationForm,
    setActiveConversation,
    setInitialMessage,
    setMaxTurns,
    setShowNewConversationForm,
    startConversation,
    stopConversation,
    getAgentName,
    getAgentColor,
    handleSelectAgent,
  };
};