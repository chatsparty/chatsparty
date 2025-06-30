import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useConnections } from "@/hooks/useConnections";
import { Bot, Edit, Plus, Trash2 } from "lucide-react";
import React from "react";
import Avatar from "boring-avatars";
import { useTranslation } from "react-i18next";

interface Agent {
  agent_id: string;
  name: string;
  characteristics?: string;
  connection_id?: string;
}

interface AgentTableProps {
  agents: Agent[];
  onCreateAgent: () => void;
  onEditAgent: (agent: Agent) => void;
  onDeleteAgent: (agentId: string) => void;
  isLoading?: boolean;
}

const AgentTable: React.FC<AgentTableProps> = ({
  agents,
  onCreateAgent,
  onEditAgent,
  onDeleteAgent,
  isLoading = false,
}) => {
  const { t } = useTranslation();
  const { connections } = useConnections();
  const avatarColors = ["#000000", "#6B46C1", "#EC4899", "#F97316", "#FCD34D"];

  const handleDeleteClick = (e: React.MouseEvent, agentId: string) => {
    e.stopPropagation();
    onDeleteAgent(agentId);
  };

  const getModelInfo = (connectionId?: string) => {
    if (!connectionId) return null;
    const connection = connections.find((conn) => conn.id === connectionId);
    return connection;
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-foreground">
            {t("agents.title")}
          </h1>
          <Badge variant="secondary" className="text-sm">
            {t("agents.agentCount", { count: agents.length })}
          </Badge>
        </div>
        <Button onClick={onCreateAgent} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          <span>{t("agents.createAgent")}</span>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ms-3 text-muted-foreground">{t("agents.loading")}</span>
        </div>
      ) : agents.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-lg">
          <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground mb-2">
            {t("agents.noAgents")}
          </h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            {t("agents.noAgentsDescription")}
          </p>
          <Button onClick={onCreateAgent} variant="outline">
            <Plus className="h-4 w-4 me-2" />
            {t("agents.createFirstAgent")}
          </Button>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[200px] font-medium">{t("agents.name")}</TableHead>
                <TableHead className="font-medium">{t("agents.characteristics")}</TableHead>
                <TableHead className="w-[150px] font-medium">{t("agents.model")}</TableHead>
                <TableHead className="w-[100px] font-medium">{t("agents.id")}</TableHead>
                <TableHead className="w-[120px] text-end font-medium">
                  {t("agents.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents.map((agent) => {
                const modelInfo = getModelInfo(agent.connection_id);
                return (
                  <TableRow
                    key={agent.agent_id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => onEditAgent(agent)}
                  >
                    <TableCell className="font-medium py-3">
                      <div className="flex items-center gap-3">
                        <Avatar
                          size={32}
                          name={agent.name || agent.agent_id}
                          variant="beam"
                          colors={avatarColors}
                        />
                        <span>{agent.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <p className="text-sm text-muted-foreground line-clamp-2 max-w-md">
                        {agent.characteristics}
                      </p>
                    </TableCell>
                    <TableCell className="py-3">
                      {modelInfo ? (
                        <Badge variant="outline" className="text-xs">
                          {modelInfo.provider}: {modelInfo.model_name}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {t("agents.notConfigured")}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge
                        variant="secondary"
                        className="text-xs font-mono"
                        title={`Full ID: ${agent.agent_id}`}
                      >
                        {agent.agent_id.slice(0, 8)}...
                      </Badge>
                    </TableCell>
                    <TableCell className="text-end py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditAgent(agent);
                          }}
                          className="h-8 w-8 p-0 hover:bg-muted"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleDeleteClick(e, agent.agent_id)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default AgentTable;
