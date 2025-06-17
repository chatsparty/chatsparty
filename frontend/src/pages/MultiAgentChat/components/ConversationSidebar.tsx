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
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-5 border-b border-gray-200">
        <h2 className="mb-4 text-gray-700">👥 Multi-Agent Chat</h2>
        <Button
          onClick={() => onShowNewConversationForm(true)}
          disabled={agents.length < 2}
          className="w-full"
          variant={agents.length >= 2 ? "default" : "secondary"}
        >
          + Start New Conversation
        </Button>
        {agents.length < 2 && (
          <p className="mt-2 text-xs text-red-600">
            Create at least 2 agents first
          </p>
        )}
      </div>

      {/* New Conversation Form */}
      {showNewConversationForm && (
        <div className="p-5 border-b border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base text-gray-700">New Conversation</h3>
            <Button
              onClick={() => onShowNewConversationForm(false)}
              variant="outline"
              size="sm"
            >
              Cancel
            </Button>
          </div>

          <div className="mb-4">
            <Label className="block mb-2 text-sm font-medium">
              Select Agents (min 2):
            </Label>
            <div className="space-y-2">
              {agents.map(agent => (
                <div key={agent.agent_id} className="flex items-center space-x-2">
                  <Checkbox
                    id={agent.agent_id}
                    checked={selectedAgents.includes(agent.agent_id)}
                    onCheckedChange={(checked) => onSelectAgent(agent.agent_id, checked as boolean)}
                  />
                  <Label htmlFor={agent.agent_id} className="text-sm text-gray-700">
                    {agent.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <Label className="block mb-2 text-sm font-medium">
              Initial Message:
            </Label>
            <Textarea
              value={initialMessage}
              onChange={(e) => onInitialMessageChange(e.target.value)}
              placeholder="Start the conversation with a topic or question..."
              rows={3}
              className="resize-y"
            />
          </div>

          <div className="mb-4">
            <Label className="block mb-2 text-sm font-medium">
              Max Turns: {maxTurns}
            </Label>
            <Slider
              value={[maxTurns]}
              onValueChange={(value) => onMaxTurnsChange(value[0])}
              min={5}
              max={20}
              step={1}
              className="w-full"
            />
          </div>

          <Button
            onClick={onStartConversation}
            disabled={selectedAgents.length < 2 || !initialMessage.trim() || isLoading}
            className="w-full"
            variant={(selectedAgents.length >= 2 && initialMessage.trim() && !isLoading) ? "default" : "secondary"}
          >
            {isLoading ? 'Starting...' : 'Start Conversation'}
          </Button>
        </div>
      )}

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="mb-4 text-base text-gray-600">
          Conversations ({conversations.length})
        </h3>
        
        {conversations.length === 0 ? (
          <div className="text-center text-gray-500 p-5 text-sm">
            No conversations yet.<br />
            Start your first multi-agent conversation!
          </div>
        ) : (
          <div className="space-y-3">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                  activeConversation === conv.id 
                    ? 'bg-blue-50 border-blue-200' 
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <div className="font-semibold text-sm text-gray-700 mb-2">
                  {conv.name}
                </div>
                <div className="text-xs text-gray-600 mb-2 flex items-center gap-2">
                  {conv.messages.length} messages
                  {conv.isActive && (
                    <Badge variant="secondary" className="bg-green-500 text-white text-xs px-2 py-0.5">
                      LIVE
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-gray-500 italic">
                  {conv.messages.length > 0 
                    ? formatTime(conv.messages[conv.messages.length - 1].timestamp)
                    : 'No messages'
                  }
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationSidebar;