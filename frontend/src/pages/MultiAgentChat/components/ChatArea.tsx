import React, { useRef, useEffect, useState } from "react";
import type { ActiveConversation, Agent } from "../types";
import MessageBubble from "./MessageBubble";
import { Button } from "../../../components/ui/button";
import { ShareModal, Modal } from "../../../components/ui/modal";
import { ToastContainer } from "../../../components/ui/toast";
import { useToast } from "../../../hooks/useToast";
import { useTracking } from "../../../hooks/useTracking";
import { Textarea } from "../../../components/ui/textarea";
import { Label } from "../../../components/ui/label";
import { Badge } from "../../../components/ui/badge";
import {
  Mic,
  Download,
  Loader2,
  Send,
  Plus,
  X,
  Search,
} from "lucide-react";
import axios from "axios";
import Avatar from "boring-avatars";
import { useTranslation } from "react-i18next";

interface ChatAreaProps {
  activeConversation: ActiveConversation | undefined;
  agents: Agent[];
  getAgentName: (agentId: string) => string;
  getAgentColor: (agentId: string) => string;
  onConversationUpdated: () => Promise<void>;
  onStartNewConversation: (selectedAgents: string[], initialMessage: string, onError?: (error: string) => void) => Promise<void>;
  onSendMessage?: (conversationId: string, message: string, selectedAgents: string[]) => Promise<void>;
  isMobile?: boolean;
  showCreditsModal?: boolean;
  setShowCreditsModal?: (show: boolean) => void;
  creditsError?: { required: number; available: number } | null;
}

const ChatArea: React.FC<ChatAreaProps> = ({
  activeConversation,
  agents,
  getAgentColor,
  onConversationUpdated,
  onStartNewConversation,
  onSendMessage,
  isMobile = false,
  showCreditsModal = false,
  creditsError = null,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const [isSharing, setIsSharing] = useState(false);
  const [isShared, setIsShared] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [lastUpdatedConversationId, setLastUpdatedConversationId] = useState<
    string | null
  >(null);

  const [isGeneratingPodcast, setIsGeneratingPodcast] = useState(false);
  const [podcastJobId, setPodcastJobId] = useState<string | null>(null);
  const [podcastStatus, setPodcastStatus] = useState<
    "idle" | "generating" | "completed" | "failed"
  >("idle");
  const [podcastProgress, setPodcastProgress] = useState<number>(0);
  
  const [messageInput, setMessageInput] = useState("");
  const [selectedAgentsForMessage, setSelectedAgentsForMessage] = useState<string[]>([]);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [agentSearchQuery, setAgentSearchQuery] = useState("");
  
  useEffect(() => {
    console.log('Credits modal state changed (from props):', { showCreditsModal, creditsError });
  }, [showCreditsModal, creditsError]);

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
        showToast(t("toast.linkCopied"), "success");

        trackShareLinkCopied({
          conversation_id: activeConversation.id,
          action: "copy_link",
          message_count: activeConversation.messages.length,
        });
      } catch (error) {
        console.error("Failed to copy link:", error);
        showToast(t("toast.linkCopyFailed"), "error");
        trackError(
          "clipboard_error",
          error instanceof Error ? error.message : "Unknown error",
          "share_link_copy"
        );
      }
    }
  };

  const handleGeneratePodcast = async () => {
    console.log(
      "Starting podcast generation for conversation:",
      activeConversation?.id
    );

    if (!activeConversation || activeConversation.messages.length === 0) {
      showToast(t("toast.noMessagesPodcast"), "error");
      return;
    }

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
      showToast(t("toast.noAgentMessagesPodcast"), "error");
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
          t("toast.podcastStarted"),
          "success"
        );

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
        setIsGeneratingPodcast(false);
        showToast(
          t("toast.podcastCompleted"),
          "success"
        );
      } else if (status.status === "failed") {
        setPodcastStatus("failed");
        setIsGeneratingPodcast(false);
        showToast(
          t("toast.podcastFailed", { error: status.error_message }),
          "error"
        );
      } else if (status.status === "processing" || status.status === "queued") {
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

      showToast(t("toast.podcastDownloaded"), "success");
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

  useEffect(() => {
    if (activeConversation?.id !== lastUpdatedConversationId) {
      setPodcastStatus("idle");
      setPodcastJobId(null);
      setPodcastProgress(0);
      setIsGeneratingPodcast(false);
    }
  }, [activeConversation?.id, lastUpdatedConversationId]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || selectedAgentsForMessage.length < 2) return;

    if (!activeConversation) {
      setIsSendingMessage(true);
      
      let errorHandled = false;
      
      try {
        await onStartNewConversation(selectedAgentsForMessage, messageInput, (error: string) => {
          errorHandled = true;
          console.error("Socket error during conversation start:", error);
          
          if (!error.startsWith('insufficient_credits:')) {
            showToast(t("toast.conversationStartFailed"), "error");
          }
          
          setIsSendingMessage(false);
        });
        
        setMessageInput("");
        setIsSendingMessage(false);
      } catch (error) {
        console.error("Failed to start conversation:", error);
        if (!errorHandled) {
          showToast("Failed to start conversation. Please try again.", "error");
          setIsSendingMessage(false);
        }
      }
    } else if (onSendMessage) {
      setIsSendingMessage(true);
      try {
        await onSendMessage(activeConversation.id, messageInput, selectedAgentsForMessage);
        setMessageInput("");
      } catch (error) {
        console.error("Failed to send message:", error);
        showToast(t("toast.messageSendFailed"), "error");
      } finally {
        setIsSendingMessage(false);
      }
    }
  };

  const toggleAgentSelection = (agentId: string) => {
    setSelectedAgentsForMessage(prev => {
      if (prev.includes(agentId)) {
        return prev.filter(id => id !== agentId);
      }
      return [...prev, agentId];
    });
  };

  useEffect(() => {
    if (activeConversation) {
      setSelectedAgentsForMessage(activeConversation.agents);
    } else {
      setSelectedAgentsForMessage(agents.slice(0, 2).map(a => a.agent_id));
    }
  }, [activeConversation, agents]);

  if (!activeConversation) {
    return (
      <div className="flex-1 flex flex-col">
        <div className={`border-b border-border bg-card/50 backdrop-blur-sm ${isMobile ? 'p-3' : 'p-4'}`}>
          <div className={`${isMobile ? '' : 'max-w-4xl mx-auto'}`}>
            <div className="flex items-center gap-3">
              <Label className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-foreground`}>{t("chat.to")}</Label>
            <div className="flex-1 flex flex-wrap items-center gap-2">
              {selectedAgentsForMessage.map(agentId => {
                const agent = agents.find(a => a.agent_id === agentId);
                if (!agent) return null;
                return (
                  <Badge
                    key={agentId}
                    variant="secondary"
                    className="px-2 py-1 text-xs font-medium cursor-pointer hover:bg-destructive/10 flex items-center gap-2"
                    style={{
                      backgroundColor: `${getAgentColor(agentId)}15`,
                      borderColor: `${getAgentColor(agentId)}30`,
                      color: getAgentColor(agentId),
                    }}
                    onClick={() => toggleAgentSelection(agentId)}
                  >
                    {agent.name}
                    <X className="w-3 h-3 ms-1" />
                  </Badge>
                );
              })}
              {selectedAgentsForMessage.length < 2 && (
                <span className="text-xs text-muted-foreground">
                  {t("chat.selectAtLeast2Agents")}
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAgentModal(true)}
                className={`h-7 px-2 text-xs ${isMobile ? '' : 'ms-auto'}`}
              >
                <Plus className="w-3 h-3 me-1" /> {t("chat.selectAgents")}
              </Button>
            </div>
          </div>
        </div>
        </div>
        
        <div className={`flex-1 flex flex-col justify-center items-center ${isMobile ? 'p-6' : 'p-10'}`}>
          <div className="mb-6 text-center">
            <div className="flex -space-x-3 mb-4 justify-center items-center">
              <Avatar
                size={40}
                name="Agent-1"
                variant="beam"
                colors={["#000000", "#6B46C1", "#EC4899", "#F97316", "#FCD34D"]}
              />
              <Avatar
                size={40}
                name="Agent-2"
                variant="beam"
                colors={["#000000", "#6B46C1", "#EC4899", "#F97316", "#FCD34D"]}
              />
              <div className="w-10 h-10 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                <Plus className="w-5 h-5 text-muted-foreground" />
              </div>
            </div>
            <div>
              <p className={`text-foreground/90 font-medium ${isMobile ? 'text-sm' : 'text-base'} mb-1`}>
                {t("chat.multiAgentChat")}
              </p>
              <p className={`text-muted-foreground/80 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                {agents.length < 2 ? t("chat.addAgentsToStart") : t("chat.selectAgentsAndType")}
              </p>
            </div>
          </div>
        </div>
        
        <div className={`border-t border-border/50 bg-background/50 backdrop-blur-sm ${isMobile ? 'px-6 py-3' : 'px-8 py-4'}`}>
          <div className={`${isMobile ? '' : 'max-w-4xl mx-auto'} relative`}>
            <div className="relative">
              <Textarea
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={selectedAgentsForMessage.length >= 2 
                  ? t("chat.messagePlaceholder")
                  : t("chat.selectAgentsToStart")
                }
                rows={1}
                disabled={selectedAgentsForMessage.length < 2 || isSendingMessage}
                className="w-full resize-none border border-border bg-background rounded-full px-4 py-3 pe-12 focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder:text-muted-foreground shadow-sm"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!messageInput.trim() || selectedAgentsForMessage.length < 2 || isSendingMessage}
                size="sm"
                className="absolute end-1.5 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full p-0 bg-primary hover:bg-primary/90 text-primary-foreground border-0 disabled:opacity-50 shadow-sm"
                variant="ghost"
              >
                {isSendingMessage ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className={`w-4 h-4 ${isRTL ? 'rtl-flip' : ''}`} />
                )}
              </Button>
            </div>
          </div>
        </div>
        
        <Modal
          isOpen={showAgentModal}
          onClose={() => {
          setShowAgentModal(false);
          setAgentSearchQuery("");
        }}
          title={t("chat.selectAgentsTitle")}
          size="md"
          actions={
            <>
              <Button
                variant="outline"
                onClick={() => setShowAgentModal(false)}
              >
                {t("common.cancel")}
              </Button>
              <Button
                onClick={() => setShowAgentModal(false)}
                disabled={selectedAgentsForMessage.length < 2}
              >
                {t("chat.doneSelected", { count: selectedAgentsForMessage.length })}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("chat.selectAtLeast2AgentsDescription")}
            </p>
            
            <div className="relative">
              <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <input
                type="text"
                placeholder={t("chat.searchAgentsPlaceholder")}
                value={agentSearchQuery}
                onChange={(e) => setAgentSearchQuery(e.target.value)}
                className="w-full ps-10 pe-4 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            
            {selectedAgentsForMessage.length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-lg">
                <Label className="text-xs font-medium text-muted-foreground w-full mb-2">{t("chat.selectedAgents", { count: selectedAgentsForMessage.length })}:</Label>
                {selectedAgentsForMessage.map(agentId => {
                  const agent = agents.find(a => a.agent_id === agentId);
                  if (!agent) return null;
                  return (
                    <Badge
                      key={agentId}
                      variant="secondary"
                      className="px-2 py-1 text-xs font-medium cursor-pointer hover:bg-destructive/10 flex items-center gap-2"
                      style={{
                        backgroundColor: `${getAgentColor(agentId)}15`,
                        borderColor: `${getAgentColor(agentId)}30`,
                        color: getAgentColor(agentId),
                      }}
                      onClick={() => toggleAgentSelection(agentId)}
                    >
                      <Avatar
                        size={16}
                        name={agent.name}
                        variant="beam"
                        colors={[
                          getAgentColor(agentId),
                          "#92A1C6",
                          "#146A7C",
                          "#F0AB3D",
                          "#C271B4"
                        ]}
                      />
                      {agent.name}
                      <X className="w-3 h-3 ms-1" />
                    </Badge>
                  );
                })}
              </div>
            )}
            
            <div className="max-h-96 overflow-y-auto space-y-2 pe-2">
              {agents
                .filter(agent => 
                  agent.name.toLowerCase().includes(agentSearchQuery.toLowerCase()) ||
                  (agent.prompt && agent.prompt.toLowerCase().includes(agentSearchQuery.toLowerCase()))
                )
                .map(agent => (
                  <div
                    key={agent.agent_id}
                    className={`flex items-start space-x-3 p-3 rounded-lg border transition-all cursor-pointer ${
                      selectedAgentsForMessage.includes(agent.agent_id)
                        ? 'bg-primary/10 border-primary/30 shadow-sm'
                        : 'bg-background border-border hover:bg-accent/30 hover:border-accent-foreground/20'
                    }`}
                    onClick={() => toggleAgentSelection(agent.agent_id)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedAgentsForMessage.includes(agent.agent_id)}
                      onChange={() => {}}
                      className="w-4 h-4 mt-0.5 text-primary bg-background border-gray-300 rounded focus:ring-primary flex-shrink-0"
                    />
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <Avatar
                        size={32}
                        name={agent.name}
                        variant="beam"
                        colors={[
                          getAgentColor(agent.agent_id),
                          "#92A1C6",
                          "#146A7C",
                          "#F0AB3D",
                          "#C271B4"
                        ]}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Label className="text-sm font-medium cursor-pointer">
                            {agent.name}
                          </Label>
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: getAgentColor(agent.agent_id) }}
                          />
                        </div>
                        {agent.prompt && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {agent.prompt}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              }
              {agents.filter(agent => 
                agent.name.toLowerCase().includes(agentSearchQuery.toLowerCase()) ||
                (agent.prompt && agent.prompt.toLowerCase().includes(agentSearchQuery.toLowerCase()))
              ).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">{t("chat.noAgentsFound", { query: agentSearchQuery })}</p>
                </div>
              )}
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  return (
    <>
      <div className={`border-b border-border bg-card/50 backdrop-blur-sm ${isMobile ? 'p-3' : 'p-4'}`}>
        <div className={`${isMobile ? '' : 'max-w-4xl mx-auto'}`}>
          <div className={`${isMobile ? 'mb-2' : 'mb-4'}`}>
            <div className="flex items-center gap-3">
              <Label className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-foreground`}>{t("chat.to")}</Label>
            <div className="flex-1 flex flex-wrap items-center gap-2">
              {selectedAgentsForMessage.map(agentId => {
                const agent = agents.find(a => a.agent_id === agentId);
                if (!agent) return null;
                return (
                  <Badge
                    key={agentId}
                    variant="secondary"
                    className="px-2 py-1 text-xs font-medium cursor-pointer hover:bg-destructive/10 flex items-center gap-2"
                    style={{
                      backgroundColor: `${getAgentColor(agentId)}15`,
                      borderColor: `${getAgentColor(agentId)}30`,
                      color: getAgentColor(agentId),
                    }}
                    onClick={() => toggleAgentSelection(agentId)}
                  >
                    <Avatar
                      size={16}
                      name={agent.name}
                      variant="beam"
                      colors={[
                        getAgentColor(agentId),
                        "#92A1C6",
                        "#146A7C",
                        "#F0AB3D",
                        "#C271B4"
                      ]}
                    />
                    {agent.name}
                    <X className="w-3 h-3 ms-1" />
                  </Badge>
                );
              })}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAgentModal(true)}
                className="h-7 px-2 text-xs"
              >
                <Plus className="w-3 h-3 me-1" /> {t("chat.addAgents")}
              </Button>
            </div>
          </div>
        </div>

        <div className={`flex items-center ${isMobile ? 'flex-col gap-2' : 'justify-between'}`}>
          <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold text-foreground`}>
            {activeConversation.name}
          </h3>
          <div className={`flex items-center ${isMobile ? 'flex-wrap gap-2 justify-center' : 'gap-4'}`}>
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
                {t("common.share")}
              </Button>
            )}

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
                    {t("chat.generatePodcast")}
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
                    {t("chat.podcastProgress", { percent: Math.round(podcastProgress * 100) })}
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
                    {t("chat.downloadPodcast")}
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
                    {t("chat.retryPodcast")}
                  </Button>
                )}
              </>
            )}

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              {activeConversation.messages.length} {t("agents.messages")}
            </div>
          </div>
        </div>
        </div>
      </div>

      <div className={`flex-1 overflow-y-auto ${isMobile ? 'px-6 py-3' : 'px-8 py-4'} flex flex-col ${isMobile ? 'gap-3' : 'gap-4'} bg-background/50`}>
        <div className={`${isMobile ? '' : 'max-w-4xl mx-auto w-full'} flex flex-col ${isMobile ? 'gap-3' : 'gap-4'}`}>
        {activeConversation.messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <p className="text-xs text-muted-foreground/80">{t("chat.startingConversation")}</p>
            </div>
          </div>
        ) : (
          activeConversation.messages.map((message, index) => (
            <MessageBubble
              key={index}
              message={message}
              getAgentColor={getAgentColor}
              isMobile={isMobile}
            />
          ))
        )}
        <div ref={messagesEndRef} />
        </div>
      </div>

      <div className={`border-t border-border/50 bg-background/50 backdrop-blur-sm ${isMobile ? 'px-6 py-3' : 'px-8 py-4'}`}>
        <div className={`${isMobile ? '' : 'max-w-4xl mx-auto'} relative`}>
          <div className="relative">
            <Textarea
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={selectedAgentsForMessage.length >= 2 
                ? t("chat.messagePlaceholder")
                : t("chat.selectAgentsToContinue")
              }
              rows={1}
              disabled={selectedAgentsForMessage.length < 2 || isSendingMessage}
              className="w-full resize-none border border-border bg-background rounded-full px-4 py-3 pr-12 focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder:text-muted-foreground shadow-sm"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!messageInput.trim() || selectedAgentsForMessage.length < 2 || isSendingMessage}
              size="sm"
              className="absolute end-1.5 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full p-0 bg-primary hover:bg-primary/90 text-primary-foreground border-0 disabled:opacity-50 shadow-sm"
              variant="ghost"
            >
              {isSendingMessage ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className={`w-4 h-4 ${isRTL ? 'rtl-flip' : ''}`} />
              )}
            </Button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showAgentModal}
        onClose={() => {
          setShowAgentModal(false);
          setAgentSearchQuery("");
        }}
        title={t("chat.selectAgentsTitle")}
        size="lg"
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setShowAgentModal(false);
                setAgentSearchQuery("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setShowAgentModal(false);
                setAgentSearchQuery("");
              }}
              disabled={selectedAgentsForMessage.length < 2}
            >
              {t("chat.doneSelected", { count: selectedAgentsForMessage.length })}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Select at least 2 agents to participate in the conversation.
          </p>
          
          <div className="relative">
            <Search className="absolute start-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
            <input
              type="text"
              placeholder={t("chat.searchAgentsPlaceholder")}
              value={agentSearchQuery}
              onChange={(e) => setAgentSearchQuery(e.target.value)}
              className="w-full ps-8 pe-3 py-1.5 bg-background border border-input rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent"
            />
          </div>
          
          {selectedAgentsForMessage.length > 0 && (
            <div className="flex flex-wrap gap-1.5 p-2 bg-muted/30 rounded-md">
              <Label className="text-xs font-medium text-muted-foreground w-full mb-1">{t("chat.selectedAgents", { count: selectedAgentsForMessage.length })}:</Label>
              {selectedAgentsForMessage.map(agentId => {
                const agent = agents.find(a => a.agent_id === agentId);
                if (!agent) return null;
                return (
                  <Badge
                    key={agentId}
                    variant="secondary"
                    className="px-2 py-0.5 text-xs font-medium cursor-pointer hover:bg-destructive/10"
                    style={{
                      backgroundColor: `${getAgentColor(agentId)}15`,
                      borderColor: `${getAgentColor(agentId)}30`,
                      color: getAgentColor(agentId),
                    }}
                    onClick={() => toggleAgentSelection(agentId)}
                  >
                    {agent.name}
                    <X className="w-2.5 h-2.5 ms-1" />
                  </Badge>
                );
              })}
            </div>
          )}
          
          <div className="max-h-80 overflow-y-auto space-y-1 pe-1">
            {agents
              .filter(agent => 
                agent.name.toLowerCase().includes(agentSearchQuery.toLowerCase()) ||
                (agent.prompt && agent.prompt.toLowerCase().includes(agentSearchQuery.toLowerCase()))
              )
              .map(agent => (
                <div
                  key={agent.agent_id}
                  className={`flex items-start space-x-2 p-2 rounded-md border transition-all cursor-pointer ${
                    selectedAgentsForMessage.includes(agent.agent_id)
                      ? 'bg-primary/10 border-primary/30 shadow-sm'
                      : 'bg-background border-border hover:bg-accent/30 hover:border-accent-foreground/20'
                  }`}
                  onClick={() => toggleAgentSelection(agent.agent_id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedAgentsForMessage.includes(agent.agent_id)}
                    onChange={() => {}}
                    className="w-3.5 h-3.5 mt-0.5 text-primary bg-background border-gray-300 rounded focus:ring-primary flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Label className="text-xs font-medium cursor-pointer">
                        {agent.name}
                      </Label>
                      <div
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: getAgentColor(agent.agent_id) }}
                      />
                    </div>
                    {agent.prompt && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 leading-4">
                        {agent.prompt}
                      </p>
                    )}
                  </div>
                </div>
              ))
            }
            {agents.filter(agent => 
              agent.name.toLowerCase().includes(agentSearchQuery.toLowerCase()) ||
              (agent.prompt && agent.prompt.toLowerCase().includes(agentSearchQuery.toLowerCase()))
            ).length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <p className="text-xs">{t("chat.noAgentsFound", { query: agentSearchQuery })}</p>
              </div>
            )}
          </div>
        </div>
      </Modal>

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
