import React from 'react';
import { useMultiAgentChat } from './hooks/useMultiAgentChat';
import ConversationSidebar from './components/ConversationSidebar';
import ChatArea from './components/ChatArea';

const MultiAgentChatPage: React.FC = () => {
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
    getAgentName,
    getAgentColor,
    handleSelectAgent,
  } = useMultiAgentChat();

  const activeConv = conversations.find(c => c.id === activeConversation);

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
      />

      <div className="flex-1 flex flex-col bg-card">
        <ChatArea
          activeConversation={activeConv}
          agents={agents}
          getAgentName={getAgentName}
          getAgentColor={getAgentColor}
        />
      </div>
    </div>
  );
};

export default MultiAgentChatPage;