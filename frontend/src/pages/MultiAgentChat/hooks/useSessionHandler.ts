import { useEffect } from "react";

type StartConversationHandler = (
  selectedAgents: string[],
  initialMessage: string,
  onError?: (error: string) => void
) => Promise<void>;

export const useSessionHandler = (
  conversationId: string | undefined,
  handleStartConversation: StartConversationHandler
) => {
  useEffect(() => {
    const handleSession = (
      sessionName: "brainstormSession" | "useCaseSession"
    ) => {
      const sessionData = localStorage.getItem(sessionName);
      if (sessionData) {
        try {
          const session = JSON.parse(sessionData);
          const sessionAge = Date.now() - session.timestamp;

          if (sessionAge < 5 * 60 * 1000) {
            if (
              session.agents &&
              session.agents.length >= 2 &&
              session.initialMessage
            ) {
              handleStartConversation(
                session.agents,
                session.initialMessage,
                (error: string) => {
                  console.error(`${sessionName} error:`, error);
                }
              );
            }
          }
        } catch (error) {
          console.error("Failed to parse session data:", error);
        } finally {
          localStorage.removeItem(sessionName);
        }
      }
    };

    if (!conversationId) {
      handleSession("brainstormSession");
      handleSession("useCaseSession");
    }
  }, [conversationId, handleStartConversation]);
};
