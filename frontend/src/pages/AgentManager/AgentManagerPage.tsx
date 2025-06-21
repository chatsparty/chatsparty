import React from "react";
import AgentForm from "./components/AgentForm";
import AgentTable from "./components/AgentTable";
import { useAgentManager } from "./hooks/useAgentManager";

const AgentManagerPage: React.FC = () => {
  const {
    agents,
    isLoading,
    showCreateForm,
    editingAgent,
    formData,
    setShowCreateForm,
    handleCreateAgent,
    handleEditAgent,
    handleInputChange,
    resetForm,
    handleDeleteAgent,
  } = useAgentManager();

  return (
    <div className="min-h-screen bg-background p-6 overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-6">
        {showCreateForm ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-foreground">
                {editingAgent ? "Edit Agent" : "Create New Agent"}
              </h1>
              <button
                onClick={resetForm}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back to Agents
              </button>
            </div>
            <AgentForm
              formData={formData}
              editingAgent={editingAgent}
              isLoading={isLoading}
              onInputChange={handleInputChange}
              onSubmit={handleCreateAgent}
              onCancel={resetForm}
            />
          </div>
        ) : (
          <AgentTable
            agents={agents}
            isLoading={isLoading}
            onCreateAgent={() => setShowCreateForm(true)}
            onEditAgent={handleEditAgent}
            onDeleteAgent={handleDeleteAgent}
          />
        )}
      </div>
    </div>
  );
};

export default AgentManagerPage;
