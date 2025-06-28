import React, { useState, useEffect } from "react";
import { Plus, MessageSquare, Search } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { ScrollArea } from "../../../components/ui/scroll-area";
import axios from "axios";
import { API_BASE_URL } from "../../../config/api";
import { useNavigate } from "react-router-dom";

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

interface ProjectConversationsProps {
  projectId: string;
}

export const ProjectConversations: React.FC<ProjectConversationsProps> = ({ projectId }) => {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchConversations();
  }, [projectId]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_BASE_URL}/api/projects/${projectId}/conversations`
      );
      setConversations(response.data.conversations || []);
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = async () => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/projects/${projectId}/conversations`
      );
      
      // Navigate to the new conversation
      navigate(`/chat/${response.data.id}`);
    } catch (error) {
      console.error("Failed to create conversation:", error);
    }
  };


  const filteredConversations = conversations.filter((conv) =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">Conversations</h2>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleNewChat}
            className="h-7 w-7"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-7 h-8 text-xs"
          />
        </div>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {loading ? (
            <div className="text-center py-6">
              <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
              <p className="mt-2 text-xs text-muted-foreground">Loading...</p>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-8 px-4">
              <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">
                No conversations yet
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredConversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => navigate(`/chat/${conversation.id}`)}
                  className="w-full text-left p-3 rounded-lg hover:bg-accent/50 transition-colors group"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs font-medium truncate">
                      {conversation.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground pl-5">
                    <span>
                      {new Date(conversation.updated_at).toLocaleDateString()}
                    </span>
                    <span>·</span>
                    <span>
                      {conversation.message_count}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};