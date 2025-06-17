import React from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import type { ActiveConversation, Agent } from '../types';

interface ConversationSidebarProps {
  agents: Agent[];
  conversations: ActiveConversation[];
  activeConversation: string | null;
  showNewConversationForm: boolean;
  selectedAgents: string[];
  initialMessage: string;
  maxTurns: number;
  isLoading: boolean;
  onShowNewConversationForm: (show: boolean) => void;
  onSelectAgent: (agentId: string, checked: boolean) => void;
  onInitialMessageChange: (message: string) => void;
  onMaxTurnsChange: (turns: number) => void;
  onStartConversation: () => void;
  onStopConversation: (conversationId: string) => void;
  onSelectConversation: (conversationId: string) => void;
}

const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  agents,
  conversations,
  activeConversation,
  showNewConversationForm,
  selectedAgents,
  initialMessage,
  maxTurns,
  isLoading,
  onShowNewConversationForm,
  onSelectAgent,
  onInitialMessageChange,
  onMaxTurnsChange,
  onStartConversation,
  onStopConversation,
  onSelectConversation,
}) => {
  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="w-80 bg-card border-r border-border flex flex-col shadow-sm">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <span className="text-lg">👥</span>
          </div>
          <h2 className="text-lg font-semibold text-foreground">Multi-Agent Chat</h2>
        </div>
        <Button
          onClick={() => onShowNewConversationForm(true)}
          disabled={agents.length < 2}
          className="w-full h-11 text-sm font-medium"
          variant={agents.length >= 2 ? "default" : "secondary"}
        >
          <span className="mr-2">+</span> Start New Conversation
        </Button>
        {agents.length < 2 && (
          <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-xs text-destructive font-medium">
              Create at least 2 agents first
            </p>
          </div>
        )}
      </div>

      {/* New Conversation Form */}
      {showNewConversationForm && (
        <div className="p-6 border-b border-border bg-muted/30">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-base font-semibold text-foreground">New Conversation</h3>
            <Button
              onClick={() => onShowNewConversationForm(false)}
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Button>
          </div>

          <div className="mb-6">
            <Label className="block mb-3 text-sm font-medium text-foreground">
              Select Agents (min 2):
            </Label>
            <div className="space-y-3">
              {agents.map(agent => (
                <div key={agent.agent_id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-accent/50 transition-colors">
                  <Checkbox
                    id={agent.agent_id}
                    checked={selectedAgents.includes(agent.agent_id)}
                    onCheckedChange={(checked) => onSelectAgent(agent.agent_id, checked as boolean)}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <Label htmlFor={agent.agent_id} className="text-sm font-medium text-foreground cursor-pointer flex-1">
                    {agent.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <Label className="block mb-3 text-sm font-medium text-foreground">
              Initial Message:
            </Label>
            <Textarea
              value={initialMessage}
              onChange={(e) => onInitialMessageChange(e.target.value)}
              placeholder="Start the conversation with a topic or question..."
              rows={3}
              className="resize-y bg-background border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            />
          </div>

          <div className="mb-6">
            <Label className="block mb-3 text-sm font-medium text-foreground">
              Max Turns: <span className="text-primary font-semibold">{maxTurns}</span>
            </Label>
            <Slider
              value={[maxTurns]}
              onValueChange={(value) => onMaxTurnsChange(value[0])}
              min={5}
              max={20}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>5</span>
              <span>20</span>
            </div>
          </div>

          <Button
            onClick={onStartConversation}
            disabled={selectedAgents.length < 2 || !initialMessage.trim() || isLoading}
            className="w-full h-11 text-sm font-medium"
            variant={(selectedAgents.length >= 2 && initialMessage.trim() && !isLoading) ? "default" : "secondary"}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Starting...
              </div>
            ) : (
              'Start Conversation'
            )}
          </Button>
        </div>
      )}

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto p-6">
        <h3 className="mb-4 text-sm font-semibold text-foreground uppercase tracking-wider">
          Conversations ({conversations.length})
        </h3>
        
        {conversations.length === 0 ? (
          <div className="text-center text-muted-foreground p-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
              <span className="text-2xl opacity-50">💬</span>
            </div>
            <p className="text-sm mb-2 font-medium">No conversations yet</p>
            <p className="text-xs opacity-75">Start your first multi-agent conversation!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer group ${
                  activeConversation === conv.id 
                    ? 'bg-primary/5 border-primary/20 shadow-sm' 
                    : 'bg-card border-border hover:bg-accent/30 hover:border-accent-foreground/20'
                }`}
              >
                <div 
                  onClick={() => onSelectConversation(conv.id)}
                >
                  <div className="font-semibold text-sm text-foreground mb-2 group-hover:text-primary transition-colors">
                    {conv.name}
                  </div>
                  <div className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40"></span>
                      {conv.messages.length} messages
                    </span>
                    {conv.isActive && (
                      <Badge variant="secondary" className="bg-green-500 text-white text-xs px-2 py-0.5 animate-pulse">
                        LIVE
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground/70">
                    {conv.messages.length > 0 
                      ? formatTime(conv.messages[conv.messages.length - 1].timestamp)
                      : 'No messages'
                    }
                  </div>
                </div>
                {conv.isActive && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        onStopConversation(conv.id);
                      }}
                      variant="outline"
                      size="sm"
                      className="w-full text-destructive border-destructive/30 hover:bg-destructive/10 hover:border-destructive/50 transition-colors"
                    >
                      Stop Conversation
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationSidebar;