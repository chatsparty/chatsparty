import React, { useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Avatar from "boring-avatars";
import { Button } from "../../../components/ui/button";
import { Textarea } from "../../../components/ui/textarea";
import { Label } from "../../../components/ui/label";
import { Badge } from "../../../components/ui/badge";
import { Loader2, Send, Plus, X, Search } from "lucide-react";
import { Modal } from "../../../components/ui/modal";
import { ShareModal } from "../../../components/ui/modal";
import { ToastContainer } from "../../../components/ui/toast";
import MessageBubble from "./MessageBubble";
import type { ActiveConversation, Agent } from "../types";

interface ActiveConversationViewProps {
  activeConversation: ActiveConversation;
  agents: Agent[];
  getAgentColor: (agentId: string) => string;
  isMobile?: boolean;
  messageInput: string;
  setMessageInput: (value: string) => void;
  selectedAgentsForMessage: string[];
  showAgentModal: boolean;
  setShowAgentModal: (show: boolean) => void;
  isSendingMessage: boolean;
  agentSearchQuery: string;
  setAgentSearchQuery: (query: string) => void;
  handleSendMessage: () => void;
  toggleAgentSelection: (agentId: string) => void;
  isSharing: boolean;
  isShared: boolean;
  showShareModal: boolean;
  shareUrl: string | null;
  handleOpenShareModal: () => void;
  handleToggleShare: () => Promise<void>;
  handleCopyLink: () => Promise<void>;
  setShowShareModal: (show: boolean) => void;
  toasts: any[];
  removeToast: (id: string) => void;
}

export const ActiveConversationView: React.FC<ActiveConversationViewProps> = ({
  activeConversation,
  agents,
  getAgentColor,
  isMobile,
  messageInput,
  setMessageInput,
  selectedAgentsForMessage,
  showAgentModal,
  setShowAgentModal,
  isSendingMessage,
  agentSearchQuery,
  setAgentSearchQuery,
  handleSendMessage,
  toggleAgentSelection,
  isSharing,
  isShared,
  showShareModal,
  shareUrl,
  handleOpenShareModal,
  handleToggleShare,
  handleCopyLink,
  setShowShareModal,
  toasts,
  removeToast,
}) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === "rtl";
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [activeConversation?.messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      {isMobile ? (
        // Mobile: Minimal header with just agents
        <div className="border-b border-border/30 bg-background/80 backdrop-blur-sm px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">
              {t("chat.to")}:
            </span>
            <div className="flex flex-wrap items-center gap-1.5 flex-1">
              {selectedAgentsForMessage.map((agentId) => {
                const agent = (agents || []).find((a) => a.id === agentId);
                if (!agent) return null;
                return (
                  <div
                    key={agentId}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-muted/50"
                    style={{
                      backgroundColor: `${getAgentColor(agentId)}10`,
                      color: getAgentColor(agentId),
                    }}
                  >
                    <Avatar
                      size={14}
                      name={agent.name}
                      variant="beam"
                      colors={[
                        getAgentColor(agentId),
                        "#92A1C6",
                        "#146A7C",
                        "#F0AB3D",
                        "#C271B4",
                      ]}
                    />
                    {agent.name}
                  </div>
                );
              })}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAgentModal(true)}
                className="h-6 w-6 p-0 rounded-full hover:bg-muted/50"
                title={t("chat.addAgents")}
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        // Desktop: Full header with all features
        <div className="border-b border-border bg-card/50 backdrop-blur-sm p-4">
          <div className="max-w-4xl mx-auto">
            <div className="mb-4">
              <div className="flex items-center gap-3">
                <Label className="text-sm font-medium text-foreground">
                  {t("chat.to")}
                </Label>
                <div className="flex-1 flex flex-wrap items-center gap-2">
                  {selectedAgentsForMessage.map((agentId) => {
                    const agent = (agents || []).find((a) => a.id === agentId);
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
                            "#C271B4",
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

            <div className="flex items-center justify-between">
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
                    {t("common.share")}
                  </Button>
                )}

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  {activeConversation.messages.length} {t("agents.messages")}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        className={`flex-1 overflow-y-auto ${
          isMobile ? "px-6 py-3" : "px-8 py-4"
        } flex flex-col ${isMobile ? "gap-3" : "gap-4"} bg-background/50`}
      >
        <div
          className={`${
            isMobile ? "" : "max-w-4xl mx-auto w-full"
          } flex flex-col ${isMobile ? "gap-3" : "gap-4"}`}
        >
          {activeConversation.messages.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-pulse"></div>
                  <div
                    className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-pulse"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-pulse"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
                <p className="text-xs text-muted-foreground/80">
                  {t("chat.startingConversation")}
                </p>
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

      <div
        className={`border-t border-border/50 bg-background/50 backdrop-blur-sm ${
          isMobile ? "px-6 py-3 pb-safe" : "px-8 py-4"
        } ${isMobile ? "sticky bottom-0" : ""}`}
      >
        <div className={`${isMobile ? "" : "max-w-4xl mx-auto"} relative`}>
          <div className="relative">
            <Textarea
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={
                selectedAgentsForMessage.length >= 2
                  ? t("chat.messagePlaceholder")
                  : t("chat.selectAgentsToContinue")
              }
              rows={1}
              disabled={selectedAgentsForMessage.length < 2 || isSendingMessage}
              className="w-full resize-none border border-border bg-background rounded-full px-4 py-3 pr-12 focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder:text-muted-foreground shadow-sm"
            />
            <Button
              onClick={handleSendMessage}
              disabled={
                !messageInput.trim() ||
                selectedAgentsForMessage.length < 2 ||
                isSendingMessage
              }
              size="sm"
              className="absolute end-1.5 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full p-0 bg-primary hover:bg-primary/90 text-primary-foreground border-0 disabled:opacity-50 shadow-sm"
              variant="ghost"
            >
              {isSendingMessage ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className={`w-4 h-4 ${isRTL ? "rtl-flip" : ""}`} />
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
              {t("chat.doneSelected", {
                count: selectedAgentsForMessage.length,
              })}
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
              <Label className="text-xs font-medium text-muted-foreground w-full mb-1">
                {t("chat.selectedAgents", {
                  count: selectedAgentsForMessage.length,
                })}
                :
              </Label>
              {selectedAgentsForMessage.map((agentId) => {
                const agent = (agents || []).find((a) => a.id === agentId);
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
              .filter(
                (agent) =>
                  agent.name
                    .toLowerCase()
                    .includes(agentSearchQuery.toLowerCase()) ||
                  (agent.prompt &&
                    agent.prompt
                      .toLowerCase()
                      .includes(agentSearchQuery.toLowerCase()))
              )
              .map((agent) => (
                <div
                  key={agent.id}
                  className={`flex items-start space-x-2 p-2 rounded-md border transition-all cursor-pointer ${
                    selectedAgentsForMessage.includes(agent.id)
                      ? "bg-primary/10 border-primary/30 shadow-sm"
                      : "bg-background border-border hover:bg-accent/30 hover:border-accent-foreground/20"
                  }`}
                  onClick={() => toggleAgentSelection(agent.id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedAgentsForMessage.includes(agent.id)}
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
                        style={{
                          backgroundColor: getAgentColor(agent.id),
                        }}
                      />
                    </div>
                    {agent.prompt && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 leading-4">
                        {agent.prompt}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            {(agents || []).filter(
              (agent) =>
                agent.name
                  .toLowerCase()
                  .includes(agentSearchQuery.toLowerCase()) ||
                (agent.prompt &&
                  agent.prompt
                    .toLowerCase()
                    .includes(agentSearchQuery.toLowerCase()))
            ).length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <p className="text-xs">
                  {t("chat.noAgentsFound", { query: agentSearchQuery })}
                </p>
              </div>
            )}
          </div>
        </div>
      </Modal>

      <ShareModal
        isOpen={showShareModal}
        onClose={() => {
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
