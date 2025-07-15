import React from "react";
import { useTranslation } from "react-i18next";
import Avatar from "boring-avatars";
import { Button } from "../../../components/ui/button";
import { Textarea } from "../../../components/ui/textarea";
import { Label } from "../../../components/ui/label";
import { Badge } from "../../../components/ui/badge";
import { Loader2, Send, Plus, X, Search } from "lucide-react";
import { Modal } from "../../../components/ui/modal";
import type { Agent } from "../types";

interface NewConversationViewProps {
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
}

export const NewConversationView: React.FC<NewConversationViewProps> = ({
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
}) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === "rtl";

  return (
    <div className="flex-1 flex flex-col">
      <div
        className={`border-b border-border bg-card/50 backdrop-blur-sm ${
          isMobile ? "p-3" : "p-4"
        }`}
      >
        <div className={`${isMobile ? "" : "max-w-4xl mx-auto"}`}>
          <div className="flex items-center gap-3">
            <Label
              className={`${
                isMobile ? "text-xs" : "text-sm"
              } font-medium text-foreground`}
            >
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
                className={`h-7 px-2 text-xs ${isMobile ? "" : "ms-auto"}`}
              >
                <Plus className="w-3 h-3 me-1" /> {t("chat.selectAgents")}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div
        className={`flex-1 flex flex-col justify-center items-center ${
          isMobile ? "p-6" : "p-10"
        }`}
      >
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
            <p
              className={`text-foreground/90 font-medium ${
                isMobile ? "text-sm" : "text-base"
              } mb-1`}
            >
              {t("chat.multiAgentChat")}
            </p>
            <p
              className={`text-muted-foreground/80 ${
                isMobile ? "text-xs" : "text-sm"
              }`}
            >
              {(agents || []).length < 2
                ? t("chat.addAgentsToStart")
                : t("chat.selectAgentsAndType")}
            </p>
          </div>
        </div>
      </div>

      <div
        className={`border-t border-border/50 bg-background/50 backdrop-blur-sm ${
          isMobile ? "px-6 py-3 pb-safe sticky bottom-0" : "px-8 py-4"
        }`}
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
                  : t("chat.selectAgentsToStart")
              }
              rows={1}
              disabled={selectedAgentsForMessage.length < 2 || isSendingMessage}
              className="w-full resize-none border border-border bg-background rounded-full px-4 py-3 pe-12 focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder:text-muted-foreground shadow-sm"
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
        size="md"
        actions={
          <>
            <Button variant="outline" onClick={() => setShowAgentModal(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => setShowAgentModal(false)}
              disabled={selectedAgentsForMessage.length < 2}
            >
              {t("chat.doneSelected", {
                count: selectedAgentsForMessage.length,
              })}
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
              <Label className="text-xs font-medium text-muted-foreground w-full mb-2">
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
            </div>
          )}

          <div className="max-h-96 overflow-y-auto space-y-2 pe-2">
            {(agents || [])
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
                  className={`flex items-start space-x-3 p-3 rounded-lg border transition-all cursor-pointer ${
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
                    className="w-4 h-4 mt-0.5 text-primary bg-background border-gray-300 rounded focus:ring-primary flex-shrink-0"
                  />
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <Avatar
                      size={32}
                      name={agent.name}
                      variant="beam"
                      colors={[
                        getAgentColor(agent.id),
                        "#92A1C6",
                        "#146A7C",
                        "#F0AB3D",
                        "#C271B4",
                      ]}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium cursor-pointer">
                          {agent.name}
                        </Label>
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: getAgentColor(agent.id) }}
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
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">
                  {t("chat.noAgentsFound", { query: agentSearchQuery })}
                </p>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};
