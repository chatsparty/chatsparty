import React, { useRef, useEffect, useState } from "react";
import type { ActiveConversation, Agent } from "../types";
import MessageBubble from "./MessageBubble";
import { Button } from "../../../components/ui/button";
import { ShareModal } from "../../../components/ui/modal";
import { ToastContainer } from "../../../components/ui/toast";
import { useToast } from "../../../hooks/useToast";
import { useTracking } from "../../../hooks/useTracking";
import {
  Users,
  AlertTriangle,
  CheckCircle,
  Mic,
  Download,
  Loader2,
} from "lucide-react";
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

  // Podcast generation state
  const [isGeneratingPodcast, setIsGeneratingPodcast] = useState(false);
  const [podcastJobId, setPodcastJobId] = useState<string | null>(null);
  const [podcastStatus, setPodcastStatus] = useState<
    "idle" | "generating" | "completed" | "failed"
  >("idle");
  const [podcastProgress, setPodcastProgress] = useState<number>(0);
  const [podcastDownloadUrl, setPodcastDownloadUrl] = useState<string | null>(
    null
  );

  const { toasts, showToast, removeToast } = useToast();
  const {
    trackConversationShared,
    trackConversationUnshared,
    trackShareLinkCopied,
    trackError,
  } = useTracking();

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

        trackConversationShared({
          conversation_id: activeConversation.id,
          action: "share",
          message_count: activeConversation.messages.length,
        });
      } else {
        setShareUrl(null);
        console.log("Clearing share URL");

        trackConversationUnshared({
          conversation_id: activeConversation.id,
          action: "unshare",
          message_count: activeConversation.messages.length,
        });
      }

      setLastUpdatedConversationId(activeConversation.id);

      setTimeout(async () => {
        await onConversationUpdated();
      }, 500);
    } catch (error) {
      console.error("Error sharing conversation:", error);
      trackError(
        "conversation_share_error",
        error instanceof Error ? error.message : "Unknown error",
        "multi_agent_chat"
      );
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyLink = async () => {
    if (shareUrl && activeConversation) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        showToast("Link copied to clipboard!", "success");

        trackShareLinkCopied({
          conversation_id: activeConversation.id,
          action: "copy_link",
          message_count: activeConversation.messages.length,
        });
      } catch (error) {
        console.error("Failed to copy link:", error);
        showToast("Failed to copy link", "error");
        trackError(
          "clipboard_error",
          error instanceof Error ? error.message : "Unknown error",
          "share_link_copy"
        );
      }
    }
  };

  // Podcast generation functions
  const handleGeneratePodcast = async () => {
    console.log(
      "Starting podcast generation for conversation:",
      activeConversation?.id
    );

    if (!activeConversation || activeConversation.messages.length === 0) {
      showToast("No messages to generate podcast from", "error");
      return;
    }

    // Check if agents have voice configuration
    const agentMessagesCount = activeConversation.messages.filter(
      (msg) => msg.agent_id && msg.agent_id.trim() !== ""
    ).length;
    console.log("Debug - Total messages:", activeConversation.messages.length);
    console.log("Debug - Agent messages count:", agentMessagesCount);
    console.log(
      "Debug - Sample messages:",
      activeConversation.messages.slice(0, 3)
    );

    if (agentMessagesCount === 0) {
      showToast("No agent messages found for podcast generation", "error");
      return;
    }

    try {
      setIsGeneratingPodcast(true);
      setPodcastStatus("generating");
      setPodcastProgress(0);

      const response = await axios.post("/podcast/generate", {
        conversation_id: activeConversation.id,
        include_intro: true,
        include_outro: true,
        background_music: false,
        export_format: "mp3",
      });

      if (response.data.success) {
        setPodcastJobId(response.data.job_id);
        showToast(
          "Podcast generation started! This may take a few minutes.",
          "success"
        );

        // Start polling for status
        pollPodcastStatus(response.data.job_id);
      } else {
        throw new Error(
          response.data.message || "Failed to start podcast generation"
        );
      }
    } catch (error) {
      console.error("Failed to generate podcast:", error);

      let errorMessage = "Failed to start podcast generation";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as any;
        if (axiosError.response?.data?.detail) {
          errorMessage = axiosError.response.data.detail;
        } else if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message;
        } else {
          errorMessage = `Server error: ${
            axiosError.response?.status || "Unknown"
          }`;
        }
      }

      showToast(errorMessage, "error");
      setPodcastStatus("failed");
      setIsGeneratingPodcast(false);
    }
  };

  const pollPodcastStatus = async (jobId: string) => {
    try {
      const response = await axios.get(`/podcast/status/${jobId}`);
      const status = response.data;

      console.log(`Podcast status for job ${jobId}:`, status);
      setPodcastProgress(status.progress || 0);

      if (status.status === "completed") {
        setPodcastStatus("completed");
        setPodcastDownloadUrl(status.audio_url);
        setIsGeneratingPodcast(false);
        showToast(
          "Podcast generation completed! Click download to get your file.",
          "success"
        );
      } else if (status.status === "failed") {
        setPodcastStatus("failed");
        setIsGeneratingPodcast(false);
        showToast(
          `Podcast generation failed: ${status.error_message}`,
          "error"
        );
      } else if (status.status === "processing" || status.status === "queued") {
        // Continue polling
        setTimeout(() => pollPodcastStatus(jobId), 2000);
      }
    } catch (error) {
      console.error("Failed to check podcast status:", error);
      setPodcastStatus("failed");
      setIsGeneratingPodcast(false);

      let errorMessage = "Failed to check podcast status";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as any;
        if (axiosError.response?.data?.detail) {
          errorMessage = axiosError.response.data.detail;
        }
      }

      showToast(errorMessage, "error");
    }
  };

  const handleDownloadPodcast = async () => {
    if (!podcastJobId) return;

    try {
      const response = await axios.get(`/podcast/download/${podcastJobId}`, {
        responseType: "blob",
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `podcast_${activeConversation?.id?.slice(0, 8)}.mp3`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      showToast("Podcast downloaded successfully!", "success");
    } catch (error) {
      console.error("Failed to download podcast:", error);

      let errorMessage = "Failed to download podcast";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as any;
        if (axiosError.response?.data?.detail) {
          errorMessage = axiosError.response.data.detail;
        }
      }

      showToast(errorMessage, "error");
    }
  };

  // Reset podcast state when conversation changes
  useEffect(() => {
    if (activeConversation?.id !== lastUpdatedConversationId) {
      setPodcastStatus("idle");
      setPodcastJobId(null);
      setPodcastProgress(0);
      setPodcastDownloadUrl(null);
      setIsGeneratingPodcast(false);
    }
  }, [activeConversation?.id, lastUpdatedConversationId]);

  if (!activeConversation) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center p-10 text-center">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
          <Users className="w-10 h-10 text-primary" />
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
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
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
              <CheckCircle className="w-5 h-5 text-green-600" />
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

            {/* Podcast Generation Button */}
            {activeConversation.messages.length > 0 && (
              <>
                {podcastStatus === "idle" && (
                  <Button
                    onClick={handleGeneratePodcast}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                    disabled={isGeneratingPodcast}
                  >
                    <Mic className="w-4 h-4" />
                    Generate Podcast
                  </Button>
                )}

                {podcastStatus === "generating" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                    disabled
                  >
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {Math.round(podcastProgress * 100)}% Complete
                  </Button>
                )}

                {podcastStatus === "completed" && (
                  <Button
                    onClick={handleDownloadPodcast}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 text-green-600 border-green-200 hover:bg-green-50"
                  >
                    <Download className="w-4 h-4" />
                    Download Podcast
                  </Button>
                )}

                {podcastStatus === "failed" && (
                  <Button
                    onClick={handleGeneratePodcast}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <Mic className="w-4 h-4" />
                    Retry Podcast
                  </Button>
                )}
              </>
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
