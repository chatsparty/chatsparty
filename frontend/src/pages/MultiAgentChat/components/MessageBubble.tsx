import React from "react";
import ReactMarkdown from "react-markdown";
import type { ConversationMessage } from "../types";

interface MessageBubbleProps {
  message: ConversationMessage;
  getAgentColor: (agentId: string) => string;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  getAgentColor,
}) => {
  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const isUser = message.speaker === "user" || message.type === "user_message";
  const isError = message.type === "error";
  const isInfo = message.type === "info";
  // Typing indicator should not apply if the message itself is an error or info
  const isTyping = message.message === "..." && !isError && !isInfo;


  // Base classes
  let containerClasses = `flex flex-col message-bubble ${isUser ? "items-end" : "items-start"}`;
  let bubbleClasses = `max-w-[85%] px-5 py-4 rounded-2xl shadow-sm whitespace-pre-wrap leading-relaxed relative transition-all hover:shadow-md`;
  let bubbleStyle = {};
  let speakerName = isUser ? "You" : message.speaker;
  let speakerColor = isUser ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))"; // Default speaker color
  let avatarChar = message.speaker ? message.speaker.charAt(0).toUpperCase() : "S"; // Default for System/Agent
  let avatarBgColor = "#6b7280"; // Default avatar BG

  if (isUser) {
    bubbleClasses += " bg-primary text-primary-foreground ml-8";
    // speakerColor already set for user if needed, but usually not shown or handled by bubble style
  } else if (isError) {
    bubbleClasses += " bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300";
    speakerName = message.speaker || "System Error";
    speakerColor = "hsl(var(--destructive))";
    avatarChar = "!";
    avatarBgColor = "hsl(var(--destructive))";
  } else if (isInfo) {
    bubbleClasses += " bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300";
    speakerName = message.speaker || "System Info";
    speakerColor = "hsl(var(--primary))"; // Or a specific info color
    avatarChar = "i";
    avatarBgColor = "hsl(var(--primary))"; // Or a specific info color
  } else if (message.agent_id) { // Agent message
    bubbleClasses += " bg-card border text-card-foreground"; // Base for agent, specific tint below
    bubbleStyle = {
      backgroundColor: `${getAgentColor(message.agent_id)}10`, // Light tint for agent bubble
      borderColor: `${getAgentColor(message.agent_id)}30`,
    };
    speakerColor = getAgentColor(message.agent_id);
    avatarBgColor = getAgentColor(message.agent_id);
    avatarChar = message.speaker ? message.speaker.charAt(0).toUpperCase() : message.agent_id.charAt(0).toUpperCase();
  } else { // Default non-user, non-agent, non-system (e.g. if speaker is just 'system' without type)
    bubbleClasses += " bg-card border border-border text-card-foreground";
  }

  if (isTyping) {
    // If it's a typing indicator, we might want less padding or specific styling
    // For now, it will use the determined bubbleClasses but show typing content.
    // Typing indicator usually has a more muted background.
    if (!isUser && !isError && !isInfo && !message.agent_id) { // Generic typing indicator
        bubbleClasses = `max-w-[85%] px-5 py-3 rounded-2xl shadow-sm bg-muted text-muted-foreground`;
    } else if (message.agent_id && !isError && !isInfo) { // Agent typing
        bubbleStyle = {
            backgroundColor: `${getAgentColor(message.agent_id)}10`,
            borderColor: `${getAgentColor(message.agent_id)}30`,
        };
         bubbleClasses = `max-w-[85%] px-5 py-3 rounded-2xl shadow-sm border text-card-foreground`;
    }
  }


  return (
    <>
      <style>{`
        /* Keyframes are fine */
        @keyframes typing {0%, 60%, 100% {transform: scale(0.8); opacity: 0.5;} 30% {transform: scale(1); opacity: 1;}}
        @keyframes messageSlide {from {opacity: 0; transform: translateY(10px);} to {opacity: 1; transform: translateY(0);}}
        .message-bubble {animation: messageSlide 0.3s ease-out;}
      `}</style>
      <div className={containerClasses}>
        <div className="flex items-center gap-3 mb-2">
          {!isUser && ( /* Avatar for non-user messages */
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm"
              style={{ backgroundColor: avatarBgColor }}
            >
              {avatarChar}
            </div>
          )}
          <div className="flex flex-col">
            <span
              className="text-xs font-semibold"
              style={{ color: speakerColor }}
            >
              {speakerName}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatTime(message.timestamp)}
            </span>
          </div>
        </div>
        <div
          className={bubbleClasses}
          style={bubbleStyle}
        >
          {isTyping ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="text-sm">typing</span>
              <div className="flex gap-1">
                <div
                  className="w-1.5 h-1.5 rounded-full bg-current opacity-60"
                  style={{
                    animation: "typing 1.4s infinite ease-in-out",
                    animationDelay: "0s",
                  }}
                />
                <div
                  className="w-1.5 h-1.5 rounded-full bg-current opacity-60"
                  style={{
                    animation: "typing 1.4s infinite ease-in-out",
                    animationDelay: "0.2s",
                  }}
                />
                <div
                  className="w-1.5 h-1.5 rounded-full bg-current opacity-60"
                  style={{
                    animation: "typing 1.4s infinite ease-in-out",
                    animationDelay: "0.4s",
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="text-sm prose prose-sm max-w-none dark:prose-invert">
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
    </>
  );
};

export default MessageBubble;
