import { MessageSquare, Send } from "lucide-react";
import React from "react";
import { Button } from "../../../components/ui/button";
import { Textarea } from "../../../components/ui/textarea";

interface ChatMessage {
  id: string;
  content: string;
  sender: "user" | "assistant";
}

interface ChatPanelProps {
  chatMessages: ChatMessage[];
  chatInput: string;
  onChatInputChange: (value: string) => void;
  onSendMessage: () => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  chatMessages,
  chatInput,
  onChatInputChange,
  onSendMessage,
}) => {
  return (
    <div className="flex flex-col h-full">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {chatMessages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <p>Start a conversation about your project</p>
          </div>
        ) : (
          chatMessages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-lg ${
                  message.sender === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <p className="text-sm">{message.content}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Chat Input */}
      <div className="p-3 border-t border-border flex-shrink-0">
        <div className="flex gap-2 items-stretch">
          <Textarea
            value={chatInput}
            onChange={(e) => onChatInputChange(e.target.value)}
            placeholder="Ask about your project, request help, or discuss implementation..."
            className="flex-1 min-h-[60px] max-h-[120px] resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSendMessage();
              }
            }}
          />
          <Button
            onClick={onSendMessage}
            disabled={!chatInput.trim()}
            size="sm"
            className="px-3 self-stretch"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};