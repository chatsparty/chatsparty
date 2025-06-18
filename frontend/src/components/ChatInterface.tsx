import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config/api";
import { useTracking } from "../hooks/useTracking";

interface Message {
  id: string;
  type: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "system",
      content:
        "Welcome! I'm your AI assistant powered by Gemma 3. I can help you with various questions and tasks.",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { trackMessageSent, trackMessageReceived, trackError } = useTracking();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const processUserMessage = async (message: string) => {
    const startTime = Date.now();

    try {
      const response = await axios.post(`${API_BASE_URL}/chat`, {
        message: message,
      });

      const aiResponse = response.data;
      const responseTime = Date.now() - startTime;

      const aiMessage: Message = {
        id: Date.now().toString(),
        type: "assistant",
        content: aiResponse.response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);

      trackMessageReceived(responseTime, "single_agent");
    } catch (error) {
      console.error("Error communicating with AI:", error);

      trackError(
        "chat_api_error",
        error instanceof Error ? error.message : "Unknown error",
        "single_agent_chat"
      );

      const errorMessage: Message = {
        id: Date.now().toString(),
        type: "assistant",
        content: `I'm having trouble connecting to the AI service. Please check if the backend is running.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    const messageToProcess = inputValue;

    trackMessageSent({
      message_length: messageToProcess.length,
      conversation_type: "single_agent",
    });

    setInputValue("");

    try {
      await processUserMessage(messageToProcess);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        backgroundColor: "#f5f5f5",
        borderRight: "1px solid #e0e0e0",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px",
          backgroundColor: "#fff",
          borderBottom: "1px solid #e0e0e0",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      >
        <h3 style={{ margin: 0, color: "#333" }}>AI Chat</h3>
        <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#666" }}>
          Chat with your AI assistant
        </p>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {messages.map((message) => (
          <div
            key={message.id}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: message.type === "user" ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                maxWidth: "80%",
                padding: "12px 16px",
                borderRadius: "18px",
                backgroundColor:
                  message.type === "user"
                    ? "#007bff"
                    : message.type === "system"
                    ? "#e3f2fd"
                    : "#f8f9fa",
                color: message.type === "user" ? "#fff" : "#333",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                whiteSpace: "pre-wrap",
              }}
            >
              {message.content}
            </div>
            <span
              style={{
                fontSize: "11px",
                color: "#999",
                marginTop: "4px",
                marginLeft: message.type === "user" ? "auto" : "0",
                marginRight: message.type === "user" ? "0" : "auto",
              }}
            >
              {formatTime(message.timestamp)}
            </span>
          </div>
        ))}
        {isLoading && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "#007bff",
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
            <span style={{ color: "#666", fontSize: "14px" }}>
              Processing...
            </span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div
        style={{
          padding: "16px",
          backgroundColor: "#fff",
          borderTop: "1px solid #e0e0e0",
        }}
      >
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type a message..."
            disabled={isLoading}
            style={{
              flex: 1,
              padding: "12px 16px",
              border: "1px solid #e0e0e0",
              borderRadius: "24px",
              outline: "none",
              fontSize: "14px",
            }}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            style={{
              padding: "12px 24px",
              backgroundColor: "#007bff",
              color: "#fff",
              border: "none",
              borderRadius: "24px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              opacity: !inputValue.trim() || isLoading ? 0.5 : 1,
            }}
          >
            Send
          </button>
        </div>
      </div>

      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
        `}
      </style>
    </div>
  );
};

export default ChatInterface;
