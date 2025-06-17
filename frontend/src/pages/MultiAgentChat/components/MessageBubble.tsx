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
        @keyframes messageSlide {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .message-bubble {
          animation: messageSlide 0.3s ease-out;
        }
      `}</style>
      <div className={`flex flex-col message-bubble ${
        message.speaker === 'user' ? 'items-end' : 'items-start'
      }`}>
        <div className="flex items-center gap-3 mb-2">
          {message.speaker !== 'user' && (
            <div 
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm"
              style={{ backgroundColor: message.agent_id ? getAgentColor(message.agent_id) : '#6b7280' }}
            >
              {message.speaker ? message.speaker.charAt(0).toUpperCase() : 'A'}
            </div>
          )}
          <div className="flex flex-col">
            <span 
              className="text-xs font-semibold"
              style={{ color: message.agent_id ? getAgentColor(message.agent_id) : 'hsl(var(--foreground))' }}
            >
              {message.speaker === 'user' ? 'You' : message.speaker}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatTime(message.timestamp)}
            </span>
          </div>
        </div>
        <div
          className={`max-w-[85%] px-5 py-4 rounded-2xl shadow-sm whitespace-pre-wrap leading-relaxed relative transition-all hover:shadow-md ${
            message.speaker === 'user' 
              ? 'bg-primary text-primary-foreground ml-8' 
              : 'bg-card border border-border text-card-foreground'
          }`}
          style={{
            backgroundColor: message.speaker === 'user' 
              ? undefined
              : message.agent_id
              ? `${getAgentColor(message.agent_id)}08`
              : undefined,
            borderColor: message.agent_id ? `${getAgentColor(message.agent_id)}20` : undefined
          }}
        >
          {message.message === '...' ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="text-sm">typing</span>
              <div className="flex gap-1">
                <div 
                  className="w-1.5 h-1.5 rounded-full bg-current opacity-60"
                  style={{ 
                    animation: 'typing 1.4s infinite ease-in-out',
                    animationDelay: '0s'
                  }} 
                />
                <div 
                  className="w-1.5 h-1.5 rounded-full bg-current opacity-60"
                  style={{ 
                    animation: 'typing 1.4s infinite ease-in-out',
                    animationDelay: '0.2s'
                  }} 
                />
                <div 
                  className="w-1.5 h-1.5 rounded-full bg-current opacity-60"
                  style={{ 
                    animation: 'typing 1.4s infinite ease-in-out',
                    animationDelay: '0.4s'
                  }} 
                />
              </div>
            </div>
          ) : (
            <div className="text-sm">{message.message}</div>
          )}
        </div>
      </div>
    </>
  );
};

export default MessageBubble;