import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Users, MessageCircle } from 'lucide-react';
import type { ActiveConversation, Agent } from '../types';

interface ConversationSidebarProps {
  agents: Agent[];
  conversations: ActiveConversation[];
  activeConversation: string | null;
  onStopConversation: (conversationId: string) => void;
  onSelectConversation: (conversationId: string) => void;
  onDeleteConversation: (conversationId: string) => void;
}

const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  agents,
  conversations,
  activeConversation,
  onStopConversation,
  onSelectConversation,
  onDeleteConversation,
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
            <Users className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Conversations</h2>
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto p-6">
        <h3 className="mb-4 text-sm font-semibold text-foreground uppercase tracking-wider">
          Conversations ({conversations.length})
        </h3>
        
        {conversations.length === 0 ? (
          <div className="text-center text-muted-foreground p-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
              <MessageCircle className="w-8 h-8 opacity-50" />
            </div>
            <p className="text-sm mb-2 font-medium">No conversations yet</p>
            <p className="text-xs opacity-75">Start your first multi-agent conversation!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer group relative ${
                  activeConversation === conv.id 
                    ? 'bg-primary/5 border-primary/20 shadow-sm' 
                    : 'bg-card border-border hover:bg-accent/30 hover:border-accent-foreground/20'
                }`}
              >
                <div 
                  onClick={() => onSelectConversation(conv.id)}
                  className="pr-8"
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
                
                {/* Action buttons positioned in top-right */}
                <div className="absolute top-3 right-3 flex gap-1">
                  {conv.isActive ? (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        onStopConversation(conv.id);
                      }}
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Stop conversation"
                    >
                      <div className="w-3 h-3 bg-current rounded-sm"></div>
                    </Button>
                  ) : (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
                          onDeleteConversation(conv.id);
                        }
                      }}
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                      title="Delete conversation"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
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