import React, { useRef, useEffect, useState } from "react";
import type { ActiveConversation, Agent } from "../types";
import MessageBubble from "./MessageBubble";
import { Button } from "../../../components/ui/button";
import { ShareModal } from "../../../components/ui/modal";
import { ToastContainer } from "../../../components/ui/toast";
import { useToast } from "../../../hooks/useToast";
import axios from "axios";

interface ChatAreaProps {
  activeConversation: ActiveConversation | undefined;
  agents: Agent[];
  getAgentName: (agentId: string) => string;
  getAgentColor: (agentId: string) => string;
  onConversationUpdated: () => Promise<void>;
}

const ChatArea: React.FC<ChatAreaProps> = ({
  activeConversation,
  agents,
  getAgentName,
  getAgentColor,
  onConversationUpdated,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [isShared, setIsShared] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [lastUpdatedConversationId, setLastUpdatedConversationId] = useState<
    string | null
  >(null);
  const { toasts, showToast, removeToast } = useToast();

  useEffect(() => {
    if (activeConversation) {
      const currentSharedStatus = activeConversation.is_shared || false;
      console.log(
        "Active conversation changed. ID:",
        activeConversation.id,
        "is_shared:",
        currentSharedStatus
      );

      if (lastUpdatedConversationId !== activeConversation.id) {
        setIsShared(currentSharedStatus);
        if (currentSharedStatus) {
          setShareUrl(
            `${window.location.origin}/shared/conversation/${activeConversation.id}`
          );
        } else {
          setShareUrl(null);
        }
      } else {
        setTimeout(() => {
          setLastUpdatedConversationId(null);
        }, 1000);
      }
    }
  }, [activeConversation, lastUpdatedConversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [activeConversation?.messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleOpenShareModal = () => {
    setShowShareModal(true);
  };

  const handleToggleShare = async () => {
    if (!activeConversation) return;

    const targetSharedStatus = !isShared;
    console.log(
      "Attempting to change sharing status from",
      isShared,
      "to",
      targetSharedStatus
    );

    setIsSharing(true);
    try {
      const response = await axios.put(
        `/chat/conversations/${activeConversation.id}/share`,
        {
          is_shared: targetSharedStatus,
        }
      );

      console.log("Share response:", response.data);

      const newIsShared =
        response.data.is_shared ?? response.data.shared ?? targetSharedStatus;
      console.log("New shared status:", newIsShared);

      setIsShared(newIsShared);

      if (newIsShared) {
        const shareUrlFromResponse =
          response.data.share_url ||
          `/shared/conversation/${activeConversation.id}`;
        const fullUrl = `${window.location.origin}${shareUrlFromResponse}`;
        setShareUrl(fullUrl);
        console.log("Setting share URL:", fullUrl);
      } else {
        setShareUrl(null);
        console.log("Clearing share URL");
      }

      setLastUpdatedConversationId(activeConversation.id);

      setTimeout(async () => {
        await onConversationUpdated();
      }, 500);
    } catch (error) {
      console.error("Error sharing conversation:", error);
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyLink = async () => {
    if (shareUrl) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        showToast("Link copied to clipboard!", "success");
      } catch (error) {
        console.error("Failed to copy link:", error);
        showToast("Failed to copy link", "error");
      }
    }
  };

  if (!activeConversation) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center p-10 text-center">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
          <span className="text-3xl">👥</span>
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-4">
          Multi-Agent Conversations
        </h2>
        <p className="text-muted-foreground text-base mb-8 max-w-lg leading-relaxed">
          Create engaging conversations between multiple AI agents. Each agent
          will respond according to their unique characteristics and prompts.
        </p>

        {agents.length < 2 ? (
          <div className="p-6 bg-yellow-500/10 border border-yellow-500/20 rounded-xl max-w-md">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-yellow-600 text-lg">⚠️</span>
              <strong className="text-yellow-800 dark:text-yellow-200 font-semibold">
                Getting Started
              </strong>
            </div>
            <p className="text-yellow-700 dark:text-yellow-300 text-sm">
              Create at least 2 agents in the Agent Manager tab before starting
              conversations.
            </p>
          </div>
        ) : (
          <div className="p-6 bg-green-500/10 border border-green-500/20 rounded-xl max-w-md">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-green-600 text-lg">✓</span>
              <strong className="text-green-800 dark:text-green-200 font-semibold">
                Ready to go!
              </strong>
            </div>
            <p className="text-green-700 dark:text-green-300 text-sm">
              You have {agents.length} agents available. Click "Start New
              Conversation" to begin.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="p-6 border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">
            {activeConversation.name}
          </h3>
          <div className="flex items-center gap-4">
            {activeConversation.messages.length > 0 && (
              <Button
                onClick={handleOpenShareModal}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
                  />
                </svg>
                Share
              </Button>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              {activeConversation.messages.length} messages
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {activeConversation.agents.map((agentId) => (
            <div
              key={agentId}
              className="px-4 py-2 rounded-full text-xs font-medium shadow-sm border transition-all hover:scale-105"
              style={{
                backgroundColor: `${getAgentColor(agentId)}15`,
                borderColor: `${getAgentColor(agentId)}30`,
                color: getAgentColor(agentId),
              }}
            >
              <span
                className="w-2 h-2 rounded-full mr-2 inline-block"
                style={{ backgroundColor: getAgentColor(agentId) }}
              ></span>
              {getAgentName(agentId)}
            </div>
          ))}
        </div>
      </div>

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

      <ShareModal
        isOpen={showShareModal}
        onClose={() => {
          console.log(
            "Closing modal. Current state - isShared:",
            isShared,
            "shareUrl:",
            shareUrl
          );
          setShowShareModal(false);
        }}
        isShared={isShared}
        shareUrl={shareUrl || undefined}
        onCopyLink={handleCopyLink}
        onToggleShare={handleToggleShare}
        isLoading={isSharing}
      />

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
};

export default ChatArea;
