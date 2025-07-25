import { useEffect, useCallback } from "react";
import { useConnections } from "../../../hooks/useConnections";
import { useAgentValidation, type FormData } from "./useAgentValidation";
import { useAgentForm } from "./useAgentForm";
import { useAgentApi } from "./useAgentApi";
import { useDeleteConfirmation } from "./useDeleteConfirmation";

export const useAgentManager = () => {
  const { connections } = useConnections();
  const {
    agents,
    isLoading,
    fetchAgents,
    createAgent,
    updateAgent,
    deleteAgent,
  } = useAgentApi();
  const {
    formData,
    editingAgent,
    isModalOpen,
    handleInputChange,
    openCreateModal,
    openEditModal,
    closeModal,
    isEditing,
  } = useAgentForm(connections);
  const { errors, validateForm, validateFieldRealtime, clearErrors } =
    useAgentValidation(connections);
  const {
    isOpen: deleteModalOpen,
    agentToDelete,
    openConfirmation: openDeleteConfirmation,
    closeConfirmation: closeDeleteConfirmation,
    confirmDelete,
  } = useDeleteConfirmation();

  useEffect(() => {
    fetchAgents();
  }, []);

  const handleInputChangeWithValidation = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any) => {
      const { name, value } = e.target;
      handleInputChange(e);

      validateFieldRealtime(name as keyof FormData, value);
    },
    [handleInputChange, validateFieldRealtime]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validateForm(formData)) {
        return;
      }

      const success = isEditing
        ? await updateAgent(editingAgent!.id, formData)
        : await createAgent(formData);

      if (success) {
        closeModal();
        clearErrors();
      }
    },
    [
      validateForm,
      formData,
      isEditing,
      updateAgent,
      editingAgent,
      createAgent,
      closeModal,
      clearErrors,
    ]
  );

  const handleDeleteByAgentId = useCallback(
    (agentId: string) => {
      const agent = agents.find((a) => a.id === agentId);
      if (agent) {
        openDeleteConfirmation(agent);
      }
    },
    [agents, openDeleteConfirmation]
  );

  const handleDeleteConfirm = useCallback(() => {
    return confirmDelete(deleteAgent);
  }, [confirmDelete, deleteAgent]);

  const handleModalClose = useCallback(
    (open: boolean) => {
      if (!open) {
        closeModal();
        clearErrors();
      }
    },
    [closeModal, clearErrors]
  );

  return {
    agents,
    isLoading,
    formData,
    formErrors: errors,
    editingAgent,

    showCreateForm: isModalOpen,
    deleteModalOpen,
    agentToDelete,

    setShowCreateForm: (open: boolean) => {
      if (open) {
        clearErrors();
        openCreateModal();
      } else {
        closeModal();
      }
    },
    handleCreateAgent: handleSubmit,
    handleEditAgent: (agent: any) => {
      clearErrors();
      openEditModal(agent);
    },
    handleInputChange: handleInputChangeWithValidation,
    resetForm: () => {
      closeModal();
      clearErrors();
    },
    handleDeleteAgent: handleDeleteByAgentId,
    confirmDeleteAgent: handleDeleteConfirm,
    cancelDeleteAgent: closeDeleteConfirmation,

    onModalOpenChange: handleModalClose,
  };
};
