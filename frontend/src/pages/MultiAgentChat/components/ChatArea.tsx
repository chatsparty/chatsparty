import React, { useRef, useEffect } from 'react';
import type { ActiveConversation, Agent } from '../types';
import MessageBubble from './MessageBubble';

interface ChatAreaProps {
  activeConversation: ActiveConversation | undefined;
  agents: Agent[];
  getAgentName: (agentId: string) => string;
  getAgentColor: (agentId: string) => string;
}

const ChatArea: React.FC<ChatAreaProps> = ({
  activeConversation,
  agents,
  getAgentName,
  getAgentColor,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [activeConversation?.messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (!activeConversation) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center p-10 text-center">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
          <span className="text-3xl">👥</span>
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-4">Multi-Agent Conversations</h2>
        <p className="text-muted-foreground text-base mb-8 max-w-lg leading-relaxed">
          Create engaging conversations between multiple AI agents. Each agent will respond according to their unique characteristics and prompts.
        </p>
        
        {agents.length < 2 ? (
          <div className="p-6 bg-yellow-500/10 border border-yellow-500/20 rounded-xl max-w-md">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-yellow-600 text-lg">⚠️</span>
              <strong className="text-yellow-800 dark:text-yellow-200 font-semibold">Getting Started</strong>
            </div>
            <p className="text-yellow-700 dark:text-yellow-300 text-sm">
              Create at least 2 agents in the Agent Manager tab before starting conversations.
            </p>
          </div>
        ) : (
          <div className="p-6 bg-green-500/10 border border-green-500/20 rounded-xl max-w-md">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-green-600 text-lg">✓</span>
              <strong className="text-green-800 dark:text-green-200 font-semibold">Ready to go!</strong>
            </div>
            <p className="text-green-700 dark:text-green-300 text-sm">
              You have {agents.length} agents available. Click "Start New Conversation" to begin.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Chat Header */}
      <div className="p-6 border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">
            {activeConversation.name}
          </h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            {activeConversation.messages.length} messages
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {activeConversation.agents.map(agentId => (
            <div
              key={agentId}
              className="px-4 py-2 rounded-full text-xs font-medium shadow-sm border transition-all hover:scale-105"
              style={{ 
                backgroundColor: `${getAgentColor(agentId)}15`,
                borderColor: `${getAgentColor(agentId)}30`,
                color: getAgentColor(agentId)
              }}
            >
              <span className="w-2 h-2 rounded-full mr-2 inline-block" style={{ backgroundColor: getAgentColor(agentId) }}></span>
              {getAgentName(agentId)}
            </div>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 bg-background/50">
        {activeConversation.messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl opacity-50">💬</span>
              </div>
              <p className="text-sm">Conversation starting...</p>
            </div>
          </div>
        ) : (
          activeConversation.messages.map((message, index) => (
            <MessageBubble
              key={index}
              message={message}
              getAgentColor={getAgentColor}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
    </>
  );
};

export default ChatArea;