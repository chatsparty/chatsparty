import React, { useEffect } from "react";
import AgentModal from "./components/AgentModal";
import AgentTable from "./components/AgentTable";
import { useAgentManager } from "./hooks/useAgentManager";

const AgentManagerPage: React.FC = () => {
  const {
    agents,
    isLoading,
    showCreateForm,
    editingAgent,
    formData,
    deleteModalOpen,
    agentToDelete,
    setShowCreateForm,
    handleCreateAgent,
    handleEditAgent,
    handleInputChange,
    resetForm,
    handleDeleteAgent,
    confirmDeleteAgent,
    cancelDeleteAgent,
  } = useAgentManager();

  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && deleteModalOpen) {
        cancelDeleteAgent();
      }
    };

    if (deleteModalOpen) {
      document.addEventListener("keydown", handleEscapeKey);
    }

    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [deleteModalOpen, cancelDeleteAgent]);

  return (
    <div className="min-h-screen bg-background p-4 overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-4">
        <AgentTable
          agents={agents}
          isLoading={isLoading}
          onCreateAgent={() => setShowCreateForm(true)}
          onEditAgent={handleEditAgent}
          onDeleteAgent={handleDeleteAgent}
        />
        
        {/* Agent Create/Edit Modal */}
        <AgentModal
          open={showCreateForm}
          onOpenChange={(open) => {
            if (!open) resetForm();
          }}
          formData={formData}
          editingAgent={editingAgent}
          isLoading={isLoading}
          onInputChange={handleInputChange}
          onSubmit={handleCreateAgent}
        />
        
        {/* Delete Confirmation Modal */}
        {deleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={cancelDeleteAgent}
            />
            <div className="relative bg-card border border-border rounded-lg shadow-lg max-w-sm w-full mx-4">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="text-base font-medium text-foreground">Delete Agent</h2>
                <button
                  onClick={cancelDeleteAgent}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-4">
                <p className="text-sm text-muted-foreground">
                  Delete "{agentToDelete?.name}"? This cannot be undone.
                </p>
              </div>
              <div className="flex justify-end gap-2 p-4 pt-0">
                <button
                  className="px-3 py-1 text-sm border border-border rounded hover:bg-muted transition-colors"
                  onClick={cancelDeleteAgent}
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  className="px-3 py-1 text-sm bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 transition-colors"
                  onClick={confirmDeleteAgent}
                  disabled={isLoading}
                >
                  {isLoading ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentManagerPage;
