import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../config/api';

export interface SocketMessage {
  type: 'typing' | 'message' | 'complete' | 'error';
  conversation_id?: string;
  agent_id?: string;
  speaker?: string;
  message?: string;
  timestamp?: number;
  error?: string;
  status?: string;
}

export interface ConversationStartData {
  conversation_id: string;
  agent_ids: string[];
  initial_message: string;
  max_turns: number;
  token?: string;
  file_attachments?: Array<{
    filename: string;
    content: string;
    file_type: string;
  }>;
}

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      const token = localStorage.getItem('access_token');
      
      this.socket = io(API_BASE_URL, {
        path: '/socket.io/',
        transports: ['websocket', 'polling'],
        auth: {
          token: token || undefined
        }
      });

      this.socket.on('connect', () => {
        console.log('Socket.IO connected');
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket.IO connection error:', error);
        reject(error);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('Socket.IO disconnected:', reason);
      });

      // Set up event listeners for multi-agent chat
      this.setupEventListeners();
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    // Conversation events
    this.socket.on('conversation_started', (data) => {
      this.emit('conversation_started', data);
    });

    this.socket.on('conversation_resumed', (data) => {
      this.emit('conversation_resumed', data);
    });

    this.socket.on('conversation_stopped', (data) => {
      this.emit('conversation_stopped', data);
    });

    this.socket.on('conversation_complete', (data) => {
      this.emit('conversation_complete', data);
    });

    this.socket.on('conversation_error', (data) => {
      this.emit('conversation_error', data);
    });

    // Message events
    this.socket.on('agent_typing', (data) => {
      this.emit('agent_typing', data);
    });

    this.socket.on('agent_message', (data) => {
      this.emit('agent_message', data);
    });

    // Room events
    this.socket.on('joined_conversation', (data) => {
      this.emit('joined_conversation', data);
    });

    this.socket.on('left_conversation', (data) => {
      this.emit('left_conversation', data);
    });
  }

  startConversation(data: ConversationStartData): void {
    if (!this.socket) {
      console.error('Socket not connected');
      return;
    }

    // Add token to the data
    const token = localStorage.getItem('access_token');
    const conversationData = {
      ...data,
      token: token || undefined
    };

    this.socket.emit('start_multi_agent_conversation', conversationData);
  }

  stopConversation(conversationId: string): void {
    if (!this.socket) return;
    this.socket.emit('stop_conversation', { conversation_id: conversationId });
  }

  sendMessage(conversationId: string, message: string, agentIds: string[]): void {
    if (!this.socket) {
      console.error('Socket not connected');
      return;
    }

    const token = localStorage.getItem('access_token');
    this.socket.emit('send_message', {
      conversation_id: conversationId,
      message: message,
      agent_ids: agentIds,
      token: token || undefined
    });
  }

  joinConversation(conversationId: string): void {
    if (!this.socket) return;
    this.socket.emit('join_conversation', { conversation_id: conversationId });
  }

  leaveConversation(conversationId: string): void {
    if (!this.socket) return;
    this.socket.emit('leave_conversation', { conversation_id: conversationId });
  }

  // Event listener management
  on(event: string, callback: (data: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: (data: any) => void): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  private emit(event: string, data: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

// Create singleton instance
export const socketService = new SocketService();