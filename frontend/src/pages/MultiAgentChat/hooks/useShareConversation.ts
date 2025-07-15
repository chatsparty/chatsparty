import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useToast } from "../../../hooks/useToast";
import { useTracking } from "../../../hooks/useTracking";
import type { ActiveConversation } from "../types";

export const useShareConversation = (
  activeConversation: ActiveConversation | undefined,
  onConversationUpdated: () => Promise<void>
) => {
  const { showToast } = useToast();
  const {
    trackConversationShared,
    trackConversationUnshared,
    trackShareLinkCopied,
    trackError,
  } = useTracking();

  const [isSharing, setIsSharing] = useState(false);
  const [isShared, setIsShared] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [lastUpdatedConversationId, setLastUpdatedConversationId] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (activeConversation) {
      const currentSharedStatus = activeConversation.is_shared || false;
      if (lastUpdatedConversationId !== activeConversation.id) {
        setIsShared(currentSharedStatus);
        if (currentSharedStatus) {
          setShareUrl(
            `${window.location.origin}/shared/conversation/${activeConversation.id}`
          );
        } else {
          setShareUrl(null);
        }
      } else {
        setTimeout(() => {
          setLastUpdatedConversationId(null);
        }, 1000);
      }
    }
  }, [activeConversation, lastUpdatedConversationId]);

  const handleOpenShareModal = () => {
    setShowShareModal(true);
  };

  const handleToggleShare = useCallback(async () => {
    if (!activeConversation) return;

    const targetSharedStatus = !isShared;
    setIsSharing(true);
    try {
      const response = await axios.put(
        `/api/conversations/${activeConversation.id}/share`,
        {
          is_shared: targetSharedStatus,
        }
      );

      const newIsShared =
        response.data.is_shared ?? response.data.shared ?? targetSharedStatus;
      setIsShared(newIsShared);

      if (newIsShared) {
        const shareUrlFromResponse =
          response.data.share_url ||
          `/shared/conversation/${activeConversation.id}`;
        const fullUrl = `${window.location.origin}${shareUrlFromResponse}`;
        setShareUrl(fullUrl);
        trackConversationShared({
          conversation_id: activeConversation.id,
          action: "share",
          message_count: activeConversation.messages.length,
        });
      } else {
        setShareUrl(null);
        trackConversationUnshared({
          conversation_id: activeConversation.id,
          action: "unshare",
          message_count: activeConversation.messages.length,
        });
      }

      setLastUpdatedConversationId(activeConversation.id);

      setTimeout(async () => {
        await onConversationUpdated();
      }, 500);
    } catch (error) {
      console.error("Error sharing conversation:", error);
      trackError(
        "conversation_share_error",
        error instanceof Error ? error.message : "Unknown error",
        "multi_agent_chat"
      );
    } finally {
      setIsSharing(false);
    }
  }, [
    activeConversation,
    isShared,
    onConversationUpdated,
    trackConversationShared,
    trackConversationUnshared,
    trackError,
  ]);

  const handleCopyLink = useCallback(async () => {
    if (shareUrl && activeConversation) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        showToast("Link copied to clipboard", "success");
        trackShareLinkCopied({
          conversation_id: activeConversation.id,
          action: "copy_link",
          message_count: activeConversation.messages.length,
        });
      } catch (error) {
        console.error("Failed to copy link:", error);
        showToast("Failed to copy link", "error");
        trackError(
          "clipboard_error",
          error instanceof Error ? error.message : "Unknown error",
          "share_link_copy"
        );
      }
    }
  }, [
    shareUrl,
    activeConversation,
    showToast,
    trackShareLinkCopied,
    trackError,
  ]);

  return {
    isSharing,
    isShared,
    showShareModal,
    shareUrl,
    handleOpenShareModal,
    handleToggleShare,
    handleCopyLink,
    setShowShareModal,
  };
};
