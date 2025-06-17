import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import type { ConversationMessage } from '../MultiAgentChat/types';
import MessageBubble from '../MultiAgentChat/components/MessageBubble';
import axios from 'axios';
import { API_BASE_URL } from '../../config/api';

interface SharedConversation {
  id: string;
  participants: string[];
  messages: ConversationMessage[];
  created_at: string;
  updated_at: string;
  isActive: boolean;
}

const SharedConversationPage: React.FC = () => {
  const location = useLocation();
  // Extract conversation ID from pathname manually
  const conversationId = location.pathname.split('/').pop();
  const [conversation, setConversation] = useState<SharedConversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSharedConversation = async () => {
      console.log('SharedConversationPage mounted, conversationId:', conversationId);
      
      if (!conversationId) {
        console.error('No conversation ID provided');
        setError('Invalid conversation ID');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        console.log('Fetching shared conversation:', `${API_BASE_URL}/chat/shared/conversations/${conversationId}`);
        const response = await axios.get(`${API_BASE_URL}/chat/shared/conversations/${conversationId}`);
        console.log('Shared conversation response:', response.data);
        setConversation(response.data);
      } catch (error: any) {
        console.error('Error fetching shared conversation:', error);
        console.error('Error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message
        });
        
        if (error.response?.status === 404) {
          setError('Conversation not found or not shared');
        } else if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
          setError('Cannot connect to server. Please check if the backend is running.');
        } else {
          setError(`Failed to load conversation: ${error.message}`);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSharedConversation();
  }, [conversationId]);

  const getAgentColor = (agentId: string | undefined): string => {
    if (!agentId) return '#6b7280';
    
    const colors = [
      '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
      '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
      '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
      '#ec4899', '#f43f5e'
    ];
    
    let hash = 0;
    for (let i = 0; i < agentId.length; i++) {
      hash = agentId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading shared conversation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-2xl bg-red-500/10 flex items-center justify-center mb-6 mx-auto">
            <span className="text-3xl">❌</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-4">Conversation Not Found</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <a 
            href="/" 
            className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Go to Home
          </a>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return null;
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Minimal Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm flex-shrink-0">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-foreground">
              ChatsParty
            </h1>
            <button
              onClick={() => window.location.href = '/'}
              className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors cursor-pointer"
            >
              Create Your Own
            </button>
          </div>
        </div>
      </div>

      {/* Messages - Scrollable Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="max-w-4xl mx-auto p-4 sm:p-6">
          <div className="flex flex-col gap-4 sm:gap-6 min-h-full">
            {conversation.messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-20">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl opacity-50">💬</span>
                </div>
                <p className="text-sm">No messages in this conversation</p>
              </div>
            ) : (
              conversation.messages.map((message, index) => (
                <MessageBubble
                  key={index}
                  message={message}
                  getAgentColor={getAgentColor}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SharedConversationPage;