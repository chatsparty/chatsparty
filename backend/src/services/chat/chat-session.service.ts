import { ChatSession, ServiceResponse } from './chat.types';

export class ChatSessionService {
  private activeSessions: Map<string, ChatSession>;

  constructor() {
    this.activeSessions = new Map();
  }

  /**
   * Start a new chat session.
   */
  startSession(userId: string, conversationId: string): ChatSession {
    const session: ChatSession = {
      sessionId: conversationId,
      userId,
      startTime: new Date(),
    };
    this.activeSessions.set(conversationId, session);
    return session;
  }

  /**
   * Get active chat sessions for a user.
   */
  getActiveSessions(userId: string): ServiceResponse<ChatSession[]> {
    try {
      const sessions: ChatSession[] = [];
      for (const [_sessionId, session] of this.activeSessions) {
        if (session.userId === userId) {
          sessions.push(session);
        }
      }
      return {
        success: true,
        data: sessions,
      };
    } catch (error) {
      console.error('Error getting active sessions:', error);
      return {
        success: false,
        error: 'Failed to get active sessions',
      };
    }
  }

  /**
   * End a chat session.
   */
  endSession(userId: string, conversationId: string): ServiceResponse<void> {
    try {
      const session = this.activeSessions.get(conversationId);

      if (!session || session.userId !== userId) {
        return {
          success: false,
          error: 'Session not found',
        };
      }

      this.activeSessions.delete(conversationId);

      return { success: true };
    } catch (error) {
      console.error('Error ending session:', error);
      return {
        success: false,
        error: 'Failed to end session',
      };
    }
  }
}