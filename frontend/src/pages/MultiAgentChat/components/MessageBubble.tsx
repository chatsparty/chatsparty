import React from "react";
import ReactMarkdown from "react-markdown";
import type { ConversationMessage } from "../types";

interface MessageBubbleProps {
  message: ConversationMessage;
  getAgentColor: (agentId: string) => string;
  isMobile?: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  getAgentColor,
  isMobile = false,
}) => {
  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
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
      <div
        className={`flex items-end message-bubble ${
          message.speaker === "user" ? "justify-end" : "justify-start"
        } group`}
      >
        {message.speaker !== "user" && (
          <div className="flex items-end mr-2 mb-1">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm"
              style={{
                backgroundColor: message.agent_id
                  ? getAgentColor(message.agent_id)
                  : "#6b7280",
              }}
            >
              {message.speaker ? message.speaker.charAt(0).toUpperCase() : "A"}
            </div>
          </div>
        )}
        <div className="flex flex-col max-w-[70%]">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-muted-foreground mb-1 px-3">
            <span className="font-medium">
              {message.speaker === "user" ? "You" : message.speaker}
            </span>
            <span className="ml-2">{formatTime(message.timestamp)}</span>
          </div>
          <div
            className={`px-3 py-2 rounded-2xl relative ${
              message.speaker === "user"
                ? "bg-blue-500 text-white rounded-br-md"
                : "bg-gray-100 text-gray-900 rounded-bl-md"
            }`}
            style={{
              backgroundColor:
                message.speaker === "user"
                  ? "#0084ff"
                  : message.agent_id
                  ? `${getAgentColor(message.agent_id)}15`
                  : "#f1f3f4",
            }}
          >
          {message.message === "..." ? (
            <div className="flex items-center gap-2">
              <span className="text-sm opacity-70">typing</span>
              <div className="flex gap-1">
                <div
                  className="w-1.5 h-1.5 rounded-full opacity-60"
                  style={{
                    backgroundColor: message.speaker === "user" ? "#ffffff" : "#666666",
                    animation: "typing 1.4s infinite ease-in-out",
                    animationDelay: "0s",
                  }}
                />
                <div
                  className="w-1.5 h-1.5 rounded-full opacity-60"
                  style={{
                    backgroundColor: message.speaker === "user" ? "#ffffff" : "#666666",
                    animation: "typing 1.4s infinite ease-in-out",
                    animationDelay: "0.2s",
                  }}
                />
                <div
                  className="w-1.5 h-1.5 rounded-full opacity-60"
                  style={{
                    backgroundColor: message.speaker === "user" ? "#ffffff" : "#666666",
                    animation: "typing 1.4s infinite ease-in-out",
                    animationDelay: "0.4s",
                  }}
                />
              </div>
            </div>
          ) : (
            <div className={`${isMobile ? 'text-sm' : 'text-sm'} leading-relaxed`}>
              <ReactMarkdown
                components={{
                  p: ({ children }) => (
                    <p className="mb-2 last:mb-0">{children}</p>
                  ),
                  code: function CodeComponent({
                    inline,
                    children,
                    ...props
                  }: any) {
                    return (
                      <code
                        {...props}
                        style={{
                          background: inline ? "none" : "#f5f5f5",
                          padding: inline ? 0 : "0.2em 0.4em",
                          borderRadius: 4,
                        }}
                      >
                        {children}
                      </code>
                    );
                  },
                  ul: ({ children }) => (
                    <ul className="list-disc pl-4 space-y-1">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal pl-4 space-y-1">{children}</ol>
                  ),
                  li: ({ children }) => <li className="text-sm">{children}</li>,
                  h1: ({ children }) => (
                    <h1 className="text-lg font-bold mb-2">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-base font-bold mb-2">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-sm font-bold mb-1">{children}</h3>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic">
                      {children}
                    </blockquote>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold">{children}</strong>
                  ),
                  em: ({ children }) => <em className="italic">{children}</em>,
                }}
              >
                {message.message}
              </ReactMarkdown>
            </div>
          )}
          </div>
        </div>
      </div>
    </>
  );
};

export default MessageBubble;
