import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Users, Plus } from 'lucide-react';
import type { ActiveConversation, Agent } from '../types';
import Avatar from 'boring-avatars';
import { useTranslation } from 'react-i18next';

interface ConversationSidebarProps {
  agents: Agent[];
  conversations: ActiveConversation[];
  activeConversation: string | null;
  onStopConversation: (conversationId: string) => void;
  onSelectConversation: (conversationId: string) => void;
  onDeleteConversation: (conversationId: string) => void;
  onCreateNewConversation?: () => void;
  isMobile?: boolean;
}

const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  conversations,
  activeConversation,
  onStopConversation,
  onSelectConversation,
  onDeleteConversation,
  onCreateNewConversation,
  isMobile = false,
}) => {
  const { t } = useTranslation();
  
  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className={`${isMobile ? 'w-full' : 'w-72'} bg-card backdrop-blur-sm ${!isMobile ? 'border-e border-border' : ''} flex flex-col shadow-lg`}>
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center">
            <Users className="w-4 h-4 text-primary" />
          </div>
          <h2 className="text-sm font-semibold text-foreground">{t('conversations.title')}</h2>
          <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full ms-auto">{conversations.length}</span>
        </div>
        
        {/* Create New Conversation Button */}
        {onCreateNewConversation && (
          <Button
            onClick={onCreateNewConversation}
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs border-dashed border-primary/30 text-primary hover:bg-primary/5"
          >
            <Plus className="w-3 h-3 me-1" />
            {t('conversations.newChat')}
          </Button>
        )}
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        
        {conversations.length === 0 ? (
          <div className="text-center text-muted-foreground p-6">
            <div className="flex -space-x-2 justify-center mb-3">
              <Avatar
                size={32}
                name="Empty-1"
                variant="beam"
                colors={["#000000", "#6B46C1", "#EC4899", "#F97316", "#FCD34D"]}
              />
              <Avatar
                size={32}
                name="Empty-2"
                variant="beam"
                colors={["#000000", "#6B46C1", "#EC4899", "#F97316", "#FCD34D"]}
              />
              <Avatar
                size={32}
                name="Empty-3"
                variant="beam"
                colors={["#000000", "#6B46C1", "#EC4899", "#F97316", "#FCD34D"]}
              />
            </div>
            <p className="text-sm font-medium">{t('conversations.noConversations')}</p>
            <p className="text-xs text-muted-foreground/80 mt-1">{t('conversations.createFirstChat')}</p>
          </div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              className={`p-3 rounded-lg transition-all duration-200 cursor-pointer group relative border ${
                activeConversation === conv.id 
                  ? 'bg-primary/10 border-primary/30 shadow-sm' 
                  : 'border-transparent hover:bg-muted/50 hover:border-border/50'
              }`}
              onClick={() => onSelectConversation(conv.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-foreground mb-1 truncate group-hover:text-primary transition-colors">
                    {conv.name}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium">{t('conversations.messagesCount', { count: conv.messages.length })}</span>
                    {conv.isActive && (
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                    )}
                    <span>
                      {conv.messages.length > 0 
                        ? formatTime(conv.messages[conv.messages.length - 1].timestamp)
                        : t('conversations.empty')
                      }
                    </span>
                  </div>
                </div>
                <div className="flex-shrink-0 ms-2">
                  {conv.isActive ? (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        onStopConversation(conv.id);
                      }}
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                      title={t('conversations.stopConversation')}
                    >
                      <div className="w-2.5 h-2.5 bg-current rounded-sm"></div>
                    </Button>
                  ) : (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(t('conversations.deleteConfirm'))) {
                          onDeleteConversation(conv.id);
                        }
                      }}
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                      title={t('conversations.deleteConversation')}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ConversationSidebar;