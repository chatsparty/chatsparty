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
        <div className="text-5xl mb-5">👥</div>
        <h2 className="text-gray-700 mb-4">Multi-Agent Conversations</h2>
        <p className="text-gray-600 text-base mb-8 max-w-md">
          Create engaging conversations between multiple AI agents. Each agent will respond according to their unique characteristics and prompts.
        </p>
        
        {agents.length < 2 ? (
          <div className="p-5 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
            <strong>Getting Started:</strong> Create at least 2 agents in the Agent Manager tab before starting conversations.
          </div>
        ) : (
          <div className="p-5 bg-green-50 border border-green-200 rounded-lg text-green-800">
            <strong>Ready to go!</strong> You have {agents.length} agents available. Click "Start New Conversation" to begin.
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Chat Header */}
      <div className="p-5 border-b border-gray-200 bg-gray-50">
        <h3 className="mb-2 text-gray-700">
          {activeConversation.name}
        </h3>
        <div className="flex gap-2 flex-wrap">
          {activeConversation.agents.map(agentId => (
            <span
              key={agentId}
              className="px-3 py-1 text-white rounded-full text-xs font-medium"
              style={{ backgroundColor: getAgentColor(agentId) }}
            >
              {getAgentName(agentId)}
            </span>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
        {activeConversation.messages.map((message, index) => (
          <MessageBubble
            key={index}
            message={message}
            getAgentColor={getAgentColor}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
    </>
  );
};

export default ChatArea;