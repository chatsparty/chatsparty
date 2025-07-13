import { Server as SocketIOServer } from 'socket.io';
import { FastifyInstance } from 'fastify';
import { Server as HTTPServer } from 'http';
import type { DefaultEventsMap } from 'socket.io/dist/typed-events';

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

type SocketServer = SocketIOServer<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, SocketData>;

export class WebSocketService {
  private io: SocketServer | null = null;
  private activeConversations: Map<string, ConversationData> = new Map();
  private userSessions: Map<string, string> = new Map(); // sessionId -> userId

  constructor() {}

  initializeSocketIO(server: HTTPServer): SocketServer {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: '*',
        credentials: true
      },
      path: '/socket.io'
    });

    this.setupEventHandlers();
    return this.io;
  }

  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket) => {
      console.log(`Socket connected: ${socket.id}`);

      // Extract authentication from handshake
      const auth = socket.handshake.auth;
      if (auth && auth.token) {
        // Here you would validate the token
        socket.data.userId = auth.userId || socket.id;
        this.userSessions.set(socket.id, socket.data.userId);
      }

      // Handle disconnect
      socket.on('disconnect', async () => {
        console.log(`Socket disconnected: ${socket.id}`);
        
        // Clean up active conversations
        for (const [convId, convData] of this.activeConversations.entries()) {
          if (convData.sid === socket.id) {
            await this.stopConversation(convId);
          }
        }
        
        this.userSessions.delete(socket.id);
      });

      // Join conversation room
      socket.on('join_conversation', (data: { conversation_id: string }) => {
        const { conversation_id } = data;
        if (conversation_id) {
          socket.join(conversation_id);
          socket.emit('joined_conversation', {
            conversation_id,
            status: 'joined'
          });
        }
      });

      // Leave conversation room
      socket.on('leave_conversation', (data: { conversation_id: string }) => {
        const { conversation_id } = data;
        if (conversation_id) {
          socket.leave(conversation_id);
          socket.emit('left_conversation', {
            conversation_id,
            status: 'left'
          });
        }
      });

      // Start conversation
      socket.on('start_conversation', async (data: {
        conversation_id: string;
        agent_ids: string[];
        initial_message: string;
        max_turns?: number;
        user_id?: string;
        file_attachments?: any;
        project_id?: string;
      }) => {
        try {
          const {
            conversation_id,
            agent_ids,
            initial_message,
            max_turns = 10,
            user_id,
            file_attachments,
            project_id
          } = data;

          const userId = user_id || socket.data.userId || this.userSessions.get(socket.id);

          // Store conversation data
          this.activeConversations.set(conversation_id, {
            sid: socket.id,
            agentIds: agent_ids,
            userId: userId || socket.id,
            isActive: true
          });

          // Join the conversation room
          socket.join(conversation_id);

          // Emit conversation started
          this.io?.to(conversation_id).emit('conversation_started', {
            conversation_id,
            agent_ids,
            status: 'started'
          });

        } catch (error) {
          socket.emit('conversation_error', {
            conversation_id: data.conversation_id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      });

      // Stop conversation
      socket.on('stop_conversation', async (data: { conversation_id: string }) => {
        await this.stopConversation(data.conversation_id);
      });
    });
  }

  async stopConversation(conversationId: string): Promise<void> {
    const conversation = this.activeConversations.get(conversationId);
    if (conversation) {
      conversation.isActive = false;

      this.io?.to(conversationId).emit('conversation_stopped', {
        conversation_id: conversationId,
        status: 'stopped'
      });

      this.activeConversations.delete(conversationId);
    }
  }

  async emitTypingIndicator(conversationId: string, agentId: string, agentName: string): Promise<void> {
    this.io?.to(conversationId).emit('agent_typing', {
      type: 'typing',
      conversation_id: conversationId,
      agent_id: agentId,
      speaker: agentName,
      message: '...'
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
      timestamp
    });
  }

  async emitConversationComplete(conversationId: string): Promise<void> {
    this.io?.to(conversationId).emit('conversation_complete', {
      type: 'complete',
      conversation_id: conversationId,
      status: 'completed'
    });

    // Don't delete the conversation - keep it available for future messages
    // Just mark it as not actively streaming
    const conversation = this.activeConversations.get(conversationId);
    if (conversation) {
      conversation.isActive = false;
    }
  }

  async emitError(conversationId: string, errorMessage: string): Promise<void> {
    this.io?.to(conversationId).emit('conversation_error', {
      type: 'error',
      conversation_id: conversationId,
      error: errorMessage
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
}

// Create singleton instance
export const websocketService = new WebSocketService();