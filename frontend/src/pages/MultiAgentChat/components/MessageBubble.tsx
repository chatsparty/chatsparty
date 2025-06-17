import React from 'react';
import type { ConversationMessage } from '../types';

interface MessageBubbleProps {
  message: ConversationMessage;
  getAgentColor: (agentId: string) => string;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, getAgentColor }) => {
  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <>
      <style>{`
        @keyframes typing {
          0%, 60%, 100% {
            transform: scale(0.8);
            opacity: 0.5;
          }
          30% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
      <div className={`flex flex-col ${message.speaker === 'user' ? 'items-end' : 'items-start'}`}>
        <div className="flex items-center gap-2 mb-1">
          <span 
            className="text-xs font-semibold"
            style={{ color: message.agent_id ? getAgentColor(message.agent_id) : '#333' }}
          >
            {message.speaker === 'user' ? 'You' : message.speaker}
          </span>
          <span className="text-xs text-gray-500">
            {formatTime(message.timestamp)}
          </span>
        </div>
        <div
          className={`max-w-[80%] px-4 py-3 rounded-2xl shadow-sm whitespace-pre-wrap leading-relaxed relative ${
            message.speaker === 'user' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-50 text-gray-700 border'
          }`}
          style={{
            backgroundColor: message.speaker === 'user' 
              ? '#007bff'
              : message.agent_id
              ? `${getAgentColor(message.agent_id)}15`
              : '#f8f9fa',
            borderColor: message.agent_id ? `${getAgentColor(message.agent_id)}30` : '#e0e0e0'
          }}
        >
          {message.message === '...' ? (
            <div className="flex items-center gap-1 text-gray-600">
              <span>typing</span>
              <div className="flex gap-0.5">
                <div 
                  className="w-1 h-1 rounded-full bg-gray-600"
                  style={{ 
                    animation: 'typing 1.4s infinite ease-in-out',
                    animationDelay: '0s'
                  }} 
                />
                <div 
                  className="w-1 h-1 rounded-full bg-gray-600"
                  style={{ 
                    animation: 'typing 1.4s infinite ease-in-out',
                    animationDelay: '0.2s'
                  }} 
                />
                <div 
                  className="w-1 h-1 rounded-full bg-gray-600"
                  style={{ 
                    animation: 'typing 1.4s infinite ease-in-out',
                    animationDelay: '0.4s'
                  }} 
                />
              </div>
            </div>
          ) : (
            message.message
          )}
        </div>
      </div>
    </>
  );
};

export default MessageBubble;