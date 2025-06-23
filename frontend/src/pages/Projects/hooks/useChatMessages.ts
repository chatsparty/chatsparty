import { useState, useCallback } from "react";

export interface ChatMessage {
  id: string;
  content: string;
  sender: "user" | "assistant";
}

export const useChatMessages = () => {
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const handleSendMessage = useCallback(() => {
    if (!chatInput.trim()) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      content: chatInput,
      sender: "user",
    };

    setChatMessages((prev) => [...prev, newMessage]);
    setChatInput("");

    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content:
          "I received your message about the project. How can I help you with this?",
        sender: "assistant",
      };
      setChatMessages((prev) => [...prev, aiResponse]);
    }, 1000);
  }, [chatInput]);

  const addMessage = useCallback((message: Omit<ChatMessage, "id">) => {
    const newMessage: ChatMessage = {
      ...message,
      id: Date.now().toString(),
    };
    setChatMessages((prev) => [...prev, newMessage]);
  }, []);

  const clearMessages = useCallback(() => {
    setChatMessages([]);
  }, []);

  return {
    chatInput,
    chatMessages,
    setChatInput,
    handleSendMessage,
    addMessage,
    clearMessages,
  };
};
