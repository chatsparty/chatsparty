import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useConnections } from "@/hooks/useConnections";
import type { AgentVoiceConfig } from "@/types/voice";
import { Bot, Edit, Plus, Trash2, User } from "lucide-react";
import React from "react";

interface ChatStyle {
  friendliness: "friendly" | "neutral" | "formal";
  response_length: "short" | "medium" | "long";
  personality: "enthusiastic" | "balanced" | "reserved";
  humor: "none" | "light" | "witty";
  expertise_level: "beginner" | "intermediate" | "expert";
}

interface Agent {
  agent_id: string;
  name: string;
  prompt: string;
  characteristics: string;
  connection_id?: string;
  chat_style?: ChatStyle;
  voice_config?: AgentVoiceConfig;
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
  const { connections } = useConnections();

  const handleDeleteClick = (e: React.MouseEvent, agentId: string) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this agent?")) {
      onDeleteAgent(agentId);
    }
  };

  const getModelInfo = (connectionId?: string) => {
    if (!connectionId) return null;
    const connection = connections.find((conn) => conn.id === connectionId);
    return connection;
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center space-x-2">
          <Bot className="h-5 w-5 text-primary" />
          <CardTitle className="text-xl font-semibold">Agent Manager</CardTitle>
          <Badge variant="secondary" className="ml-2">
            {agents.length} {agents.length === 1 ? "Agent" : "Agents"}
          </Badge>
        </div>
        <Button onClick={onCreateAgent} className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Create Agent</span>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2 text-muted-foreground">
              Loading agents...
            </span>
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center py-12">
            <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              No agents created yet
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first agent to get started with AI-powered
              conversations
            </p>
            <Button onClick={onCreateAgent} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Agent
            </Button>
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto scrollbar-hide">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Name</TableHead>
                  <TableHead>Characteristics</TableHead>
                  <TableHead className="w-[150px]">Model</TableHead>
                  <TableHead className="w-[100px]">ID</TableHead>
                  <TableHead className="w-[120px] text-right">
                    Actions
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
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                            <User className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <span>{agent.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-muted-foreground line-clamp-2 max-w-md">
                          {agent.characteristics}
                        </p>
                      </TableCell>
                      <TableCell>
                        {modelInfo ? (
                          <Badge variant="outline" className="text-xs">
                            {modelInfo.provider}: {modelInfo.model_name}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Not configured
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="text-xs font-mono"
                          title={`Full ID: ${agent.agent_id}`}
                        >
                          {agent.agent_id.slice(0, 8)}...
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditAgent(agent);
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) =>
                              handleDeleteClick(e, agent.agent_id)
                            }
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
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
      </CardContent>
    </Card>
  );
};

export default AgentTable;
