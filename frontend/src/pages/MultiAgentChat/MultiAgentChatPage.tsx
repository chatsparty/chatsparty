import React, { useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../../config/api";
import { useMultiAgentChat } from "./hooks/useMultiAgentChat";
import ConversationSidebar from "./components/ConversationSidebar";
import ChatArea from "./components/ChatArea";
import FileAttachmentSidebar from "./components/FileAttachmentSidebar";
import type { AttachedFile } from "./types";

const MultiAgentChatPage: React.FC = () => {
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);

  const {
    agents,
    conversations,
    activeConversation,
    selectedAgents,
    initialMessage,
    maxTurns,
    isLoading,
    showNewConversationForm,
    setActiveConversation,
    setInitialMessage,
    setMaxTurns,
    setShowNewConversationForm,
    startConversation,
    stopConversation,
    deleteConversation,
    getAgentName,
    getAgentColor,
    handleSelectAgent,
    loadConversations,
    sendUserMessage, // New function from the hook
  } = useMultiAgentChat(attachedFiles);
  const [isExtractingContent, setIsExtractingContent] = useState(false);

  const handleFilesAttached = (files: AttachedFile[]) => {
    setAttachedFiles(files);
  };

  const handleFileRemoved = (fileId: string) => {
    setAttachedFiles((prev) => prev.filter((file) => file.id !== fileId));
  };

  const handleExtractContent = async (fileId: string): Promise<string> => {
    setIsExtractingContent(true);

    try {
      const file = attachedFiles.find((f) => f.id === fileId);
      if (!file) throw new Error("File not found");

      setAttachedFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, isExtracting: true } : f))
      );

      const formData = new FormData();
      formData.append("file", file.file);

      const response = await axios.post(
        `${API_BASE_URL}/files/extract-content`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      return response.data.content || "";
    } catch (error) {
      console.error("Error extracting content:", error);
      throw error;
    } finally {
      setIsExtractingContent(false);
    }
  };

  const activeConv = conversations.find((c) => c.id === activeConversation);

  return (
    <div className="flex h-full bg-background">
      <ConversationSidebar
        agents={agents}
        conversations={conversations}
        activeConversation={activeConversation}
        showNewConversationForm={showNewConversationForm}
        selectedAgents={selectedAgents}
        initialMessage={initialMessage}
        maxTurns={maxTurns}
        isLoading={isLoading}
        onShowNewConversationForm={setShowNewConversationForm}
        onSelectAgent={handleSelectAgent}
        onInitialMessageChange={setInitialMessage}
        onMaxTurnsChange={setMaxTurns}
        onStartConversation={startConversation}
        onStopConversation={stopConversation}
        onSelectConversation={setActiveConversation}
        onDeleteConversation={deleteConversation}
      />

      <div className="flex-1 flex flex-col bg-background">
        <ChatArea
          activeConversation={activeConv}
          agents={agents}
          getAgentName={getAgentName}
          getAgentColor={getAgentColor}
          onConversationUpdated={loadConversations}
           onSendMessage={sendUserMessage} // Pass the new function
        />
      </div>

      <FileAttachmentSidebar
        attachedFiles={attachedFiles}
        onFilesAttached={handleFilesAttached}
        onFileRemoved={handleFileRemoved}
        onExtractContent={handleExtractContent}
        isExtractingContent={isExtractingContent}
      />
    </div>
  );
};

export default MultiAgentChatPage;
