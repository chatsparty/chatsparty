import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

interface ConversationData {
  sid: string;
  agentIds: string[];
  userId: string;
  isActive: boolean;
  databaseId?: string | null;
}

interface SocketData {
  userId?: string;
}

type SocketServer = SocketIOServer<any, any, any, SocketData>;

export class WebSocketService {
  private io: SocketServer | null = null;
  private activeConversations: Map<string, ConversationData> = new Map();
  private userSessions: Map<string, string> = new Map();

  constructor() {}

  initializeSocketIO(server: HTTPServer): SocketServer {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: '*',
        credentials: true,
      },
      path: '/socket.io',
    });

    this.setupEventHandlers();
    return this.io;
  }

  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', socket => {
      const auth = socket.handshake.auth;
      if (auth && auth.token) {
        socket.data.userId = auth.userId || socket.id;
        if (socket.data.userId) {
          this.userSessions.set(socket.id, socket.data.userId);
        }
      }

      socket.on('disconnect', async () => {
        for (const [convId, convData] of this.activeConversations.entries()) {
          if (convData.sid === socket.id) {
            await this.stopConversation(convId);
          }
        }

        this.userSessions.delete(socket.id);
      });

      socket.on('join_conversation', (data: { conversation_id: string }) => {
        const { conversation_id } = data;
        if (conversation_id) {
          socket.join(conversation_id);
          socket.emit('joined_conversation', {
            conversation_id,
            status: 'joined',
          });
        }
      });

      socket.on('leave_conversation', (data: { conversation_id: string }) => {
        const { conversation_id } = data;
        if (conversation_id) {
          socket.leave(conversation_id);
          socket.emit('left_conversation', {
            conversation_id,
            status: 'left',
          });
        }
      });

      socket.on(
        'start_conversation',
        async (data: {
          conversation_id: string;
          agent_ids: string[];
          initial_message: string;
          max_turns?: number;
          user_id?: string;
          file_attachments?: any;
          project_id?: string;
        }) => {
          try {
            const { conversation_id, agent_ids, user_id } = data;

            const userId =
              user_id || socket.data.userId || this.userSessions.get(socket.id);

            this.activeConversations.set(conversation_id, {
              sid: socket.id,
              agentIds: agent_ids,
              userId: userId || socket.id,
              isActive: true,
            });

            socket.join(conversation_id);

            this.io?.to(conversation_id).emit('conversation_started', {
              conversation_id,
              agent_ids,
              status: 'started',
            });
          } catch (error) {
            socket.emit('conversation_error', {
              conversation_id: data.conversation_id,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
      );

      socket.on(
        'stop_conversation',
        async (data: { conversation_id: string }) => {
          await this.stopConversation(data.conversation_id);
        }
      );
    });
  }

  async stopConversation(conversationId: string): Promise<void> {
    const conversation = this.activeConversations.get(conversationId);
    if (conversation) {
      conversation.isActive = false;

      this.io?.to(conversationId).emit('conversation_stopped', {
        conversation_id: conversationId,
        status: 'stopped',
      });

      this.activeConversations.delete(conversationId);
    }
  }

  async emitTypingIndicator(
    conversationId: string,
    agentId: string,
    agentName: string
  ): Promise<void> {
    this.io?.to(conversationId).emit('agent_typing', {
      type: 'typing',
      conversation_id: conversationId,
      agent_id: agentId,
      speaker: agentName,
      message: '...',
    });
  }

  async emitAgentMessage(
    conversationId: string,
    agentId: string,
    agentName: string,
    message: string,
    timestamp: number
  ): Promise<void> {
    this.io?.to(conversationId).emit('agent_message', {
      type: 'message',
      conversation_id: conversationId,
      agent_id: agentId,
      speaker: agentName,
      message,
      timestamp,
    });
  }

  async emitConversationComplete(conversationId: string): Promise<void> {
    this.io?.to(conversationId).emit('conversation_complete', {
      type: 'complete',
      conversation_id: conversationId,
      status: 'completed',
    });

    const conversation = this.activeConversations.get(conversationId);
    if (conversation) {
      conversation.isActive = false;
    }
  }

  async emitError(conversationId: string, errorMessage: string): Promise<void> {
    this.io?.to(conversationId).emit('conversation_error', {
      type: 'error',
      conversation_id: conversationId,
      error: errorMessage,
    });
  }

  getSocketServer(): SocketServer | null {
    return this.io;
  }

  getActiveConversations(): Map<string, ConversationData> {
    return this.activeConversations;
  }

  isConversationActive(conversationId: string): boolean {
    const conversation = this.activeConversations.get(conversationId);
    return conversation?.isActive || false;
  }

  async close(): Promise<void> {
    if (this.io) {
      const sockets = await this.io.fetchSockets();
      for (const socket of sockets) {
        socket.disconnect(true);
      }

      this.io.close();
      this.io = null;

      this.activeConversations.clear();
      this.userSessions.clear();
    }
  }
}

export const websocketService = new WebSocketService();
