import React from 'react';
import { useAgentManager } from './hooks/useAgentManager';
import AgentSidebar from './components/AgentSidebar';
import AgentForm from './components/AgentForm';
import PresetTemplates from './components/PresetTemplates';

const AgentManagerPage: React.FC = () => {
  const {
    agents,
    isLoading,
    showCreateForm,
    editingAgent,
    formData,
    presetAgents,
    setShowCreateForm,
    handleCreateAgent,
    handleEditAgent,
    handleInputChange,
    resetForm,
    createPresetAgent,
    handleDeleteAgent
  } = useAgentManager();

  return (
    <div className="flex h-full w-full bg-background">
      <AgentSidebar
        agents={agents}
        onCreateAgent={() => setShowCreateForm(true)}
        onEditAgent={handleEditAgent}
        onDeleteAgent={handleDeleteAgent}
      />

      <div className="flex-1 flex flex-col min-h-0">
        {showCreateForm ? (
          <AgentForm
            formData={formData}
            editingAgent={editingAgent}
            isLoading={isLoading}
            onInputChange={handleInputChange}
            onSubmit={handleCreateAgent}
            onCancel={resetForm}
          />
        ) : (
          <PresetTemplates
            presetAgents={presetAgents}
            onSelectPreset={createPresetAgent}
          />
        )}
      </div>
    </div>
  );
};

export default AgentManagerPage;