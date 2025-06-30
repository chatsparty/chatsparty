import React from "react";
import ReactMarkdown from "react-markdown";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Avatar from "boring-avatars";
import type { ConversationMessage } from "../types";
import { useTranslation } from "react-i18next";

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
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  
  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // Check if this is a credit error message
  const creditErrorRegex = /I'm sorry, but you don't have enough credits.*Required: (\d+), Available: (\d+)/;
  const creditErrorMatch = message.message.match(creditErrorRegex);
  const isCreditError = !!creditErrorMatch;

  // Detect text direction based on content
  const detectTextDirection = (text: string) => {
    // Check for RTL characters (Arabic, Hebrew, etc.)
    const rtlRegex = /[\u0591-\u07FF\u200F\u202B\u202E\uFB1D-\uFDFD\uFE70-\uFEFC]/;
    return rtlRegex.test(text) ? 'rtl' : 'ltr';
  };

  const textDirection = detectTextDirection(message.message);

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
          // In RTL mode, swap the alignment
          isRTL
            ? (message.speaker === "user" ? "justify-start" : "justify-end")
            : (message.speaker === "user" ? "justify-end" : "justify-start")
        } group`}
      >
        {message.speaker !== "user" && !isRTL && (
          <div className="flex items-end me-2 mb-1">
            <div className="w-8 h-8 rounded-full overflow-hidden shadow-sm">
              <Avatar
                size={32}
                name={message.speaker || message.agent_id || "Agent"}
                variant="beam"
                colors={[
                  getAgentColor(message.agent_id || "default"),
                  "#92A1C6",
                  "#146A7C",
                  "#F0AB3D",
                  "#C271B4"
                ]}
              />
            </div>
          </div>
        )}
        <div className="flex flex-col max-w-[70%]">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-muted-foreground mb-1 px-3">
            <span className="font-medium">
              {message.speaker === "user" ? "You" : message.speaker}
            </span>
            <span className="ms-2">{formatTime(message.timestamp)}</span>
          </div>
          <div
            className={`px-3 py-2 rounded-2xl relative ${
              message.speaker === "user"
                ? isRTL
                  ? "bg-blue-500 text-white rounded-es-md"
                  : "bg-blue-500 text-white rounded-ee-md"
                : isCreditError
                ? isRTL
                  ? "bg-yellow-50 border border-yellow-200 text-gray-900 rounded-ee-md"
                  : "bg-yellow-50 border border-yellow-200 text-gray-900 rounded-es-md"
                : isRTL
                  ? "bg-gray-100 text-gray-900 rounded-ee-md"
                  : "bg-gray-100 text-gray-900 rounded-es-md"
            }`}
            style={{
              backgroundColor:
                message.speaker === "user"
                  ? "#0084ff"
                  : isCreditError
                  ? undefined
                  : message.agent_id
                  ? `${getAgentColor(message.agent_id)}15`
                  : "#f1f3f4",
              direction: textDirection,
              textAlign: textDirection === 'rtl' ? 'right' : 'left',
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
          ) : isCreditError ? (
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 mb-1">
                  Insufficient Credits
                </p>
                <p className="text-sm text-gray-600 mb-3">
                  You don't have enough credits to continue this conversation.
                </p>
                {creditErrorMatch && (
                  <div className="bg-gray-50 rounded-lg p-3 mb-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Required credits:</span>
                      <span className="font-medium text-gray-900">{creditErrorMatch[1]}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-600">Available credits:</span>
                      <span className="font-medium text-gray-900">{creditErrorMatch[2]}</span>
                    </div>
                  </div>
                )}
                <Button
                  onClick={() => navigate("/settings/credits")}
                  size="sm"
                  className="w-full"
                >
                  Get More Credits
                </Button>
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
                    <ul className="list-disc ps-4 space-y-1">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal ps-4 space-y-1">{children}</ol>
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
                    <blockquote className="border-s-4 border-gray-300 dark:border-gray-600 ps-4 italic">
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
        {message.speaker !== "user" && isRTL && (
          <div className="flex items-end ms-2 mb-1">
            <div className="w-8 h-8 rounded-full overflow-hidden shadow-sm">
              <Avatar
                size={32}
                name={message.speaker || message.agent_id || "Agent"}
                variant="beam"
                colors={[
                  getAgentColor(message.agent_id || "default"),
                  "#92A1C6",
                  "#146A7C",
                  "#F0AB3D",
                  "#C271B4"
                ]}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default MessageBubble;
