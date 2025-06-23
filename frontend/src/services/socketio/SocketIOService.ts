import { io, Socket } from "socket.io-client";

export enum MessageType {
  FILE_CREATED = "fs:created",
  FILE_MODIFIED = "fs:modified",
  FILE_DELETED = "fs:deleted",
  FOLDER_CREATED = "fs:folder_created",
  FOLDER_DELETED = "fs:folder_deleted",

  SUBSCRIBE = "subscribe",
  UNSUBSCRIBE = "unsubscribe",

  TERMINAL_CREATE = "terminal:create",
  TERMINAL_INPUT = "terminal:input",
  TERMINAL_OUTPUT = "terminal:output",
  TERMINAL_RESIZE = "terminal:resize",
  TERMINAL_CLOSE = "terminal:close",
  TERMINAL_STATUS = "terminal:status",
  TERMINAL_LIST = "terminal:list",

  ERROR = "error",
  SUCCESS = "success",
}

export interface SocketIOMessage {
  type: MessageType;
  channel: string;
  data: Record<string, any>;
  timestamp: string;
  message_id?: string;
}

export type MessageHandler = (message: SocketIOMessage) => void;

export class SocketIOService {
  private socket: Socket | null = null;
  private messageHandlers = new Map<MessageType, MessageHandler[]>();
  private channelSubscriptions = new Set<string>();
  private isConnecting = false;
  private connectionPromise: Promise<void> | null = null;

  constructor() {
    this.setupEventHandlers();
  }

  async connect(token: string): Promise<void> {
    if (this.isConnecting || (this.socket && this.socket.connected)) {
      return this.connectionPromise || Promise.resolve();
    }

    this.isConnecting = true;

    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        console.log(
          `[SOCKETIO] 🔌 Connecting with token: ${token.substring(0, 20)}...`
        );

        this.socket = io("http://localhost:8000", {
          auth: {
            token: token,
          },
          autoConnect: true,
          reconnection: true,
          reconnectionAttempts: 10,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          timeout: 20000,
          forceNew: true,
        });

        this.socket.on("connect", () => {
          console.log("[SOCKETIO] ✅ Connected successfully");
          this.isConnecting = false;

          this.channelSubscriptions.forEach((channel) => {
            console.log(`[SOCKETIO] 🔄 Re-subscribing to channel: ${channel}`);
            this.subscribe(channel);
          });

          resolve();
        });

        this.socket.on("connect_error", (error) => {
          console.error("[SOCKETIO] ❌ Connection error:", error);
          this.isConnecting = false;

          if (error.message.includes("Authentication")) {
            console.error(
              "[SOCKETIO] 🔒 Authentication failed - token may be expired"
            );
          }

          reject(error);
        });

        this.socket.on("disconnect", (reason) => {
          console.log(`[SOCKETIO] ❌ Disconnected: ${reason}`);
          this.isConnecting = false;

          if (reason === "io server disconnect") {
            this.socket?.connect();
          }
        });

        this.socket.on("reconnect", (attemptNumber) => {
          console.log(
            `[SOCKETIO] 🔄 Reconnected after ${attemptNumber} attempts`
          );
        });

        this.socket.on("reconnect_attempt", (attemptNumber) => {
          console.log(`[SOCKETIO] 🔄 Reconnection attempt ${attemptNumber}`);
        });

        this.socket.on("reconnect_error", (error) => {
          console.error("[SOCKETIO] ❌ Reconnection error:", error);
        });

        this.socket.on("reconnect_failed", () => {
          console.error(
            "[SOCKETIO] ❌ Reconnection failed after maximum attempts"
          );
        });

        this.socket.on("message", (message) => {
          console.log("[SOCKETIO] 📨 Message received:", message);
          this.handleMessage(message);
        });

        this.socket.on("error", (error) => {
          console.error("[SOCKETIO] ❌ Socket error:", error);
        });
      } catch (error) {
        console.error("[SOCKETIO] ❌ Connection setup failed:", error);
        this.isConnecting = false;
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  disconnect(): void {
    if (this.socket) {
      console.log("[SOCKETIO] 🔌 Disconnecting...");
      this.socket.disconnect();
      this.socket = null;
    }
    this.channelSubscriptions.clear();
    this.messageHandlers.clear();
    this.isConnecting = false;
    this.connectionPromise = null;
  }

  subscribe(channel: string): void {
    console.log(`[SOCKETIO] 📡 Subscribing to channel: ${channel}`);
    this.channelSubscriptions.add(channel);

    if (this.socket && this.socket.connected) {
      this.socket.emit("subscribe", { channel });
    } else {
      console.log(
        `[SOCKETIO] ⚠️ Socket not connected, subscription queued for: ${channel}`
      );
    }
  }

  unsubscribe(channel: string): void {
    console.log(`[SOCKETIO] 📡 Unsubscribing from channel: ${channel}`);
    this.channelSubscriptions.delete(channel);

    if (this.socket && this.socket.connected) {
      this.socket.emit("unsubscribe", { channel });
    }
  }

  send(message: SocketIOMessage): void {
    if (this.socket && this.socket.connected) {
      console.log("[SOCKETIO] 📤 Sending message:", message);
      this.socket.emit("message", message);
    } else {
      console.warn("[SOCKETIO] ⚠️ Cannot send message - socket not connected");
    }
  }

  onMessage(type: MessageType, handler: MessageHandler): void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    this.messageHandlers.get(type)!.push(handler);
  }

  offMessage(type: MessageType, handler: MessageHandler): void {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  get isConnected(): boolean {
    return this.socket?.connected || false;
  }

  private handleMessage(data: any): void {
    try {
      const message: SocketIOMessage = {
        type: data.type as MessageType,
        channel: data.channel,
        data: data.data || {},
        timestamp: data.timestamp,
        message_id: data.message_id,
      };

      console.log("[SOCKETIO] 📥 Parsed message:", message);

      const handlers = this.messageHandlers.get(message.type);

      if (handlers) {
        console.log(
          `[SOCKETIO] 🎯 Found ${handlers.length} handlers for type: ${message.type}`
        );
        handlers.forEach((handler) => {
          console.log(`[SOCKETIO] 🔄 Calling handler for: ${message.type}`);
          try {
            handler(message);
          } catch (error) {
            console.error(
              `[SOCKETIO] ❌ Error in message handler for ${message.type}:`,
              error
            );
          }
        });
      } else {
        console.log(
          `[SOCKETIO] ⚠️ No handlers found for message type: ${message.type}`
        );
      }
    } catch (error) {
      console.error("[SOCKETIO] ❌ Error parsing message:", error);
      console.error("[SOCKETIO] Raw data:", data);
    }
  }

  private setupEventHandlers(): void {
    window.addEventListener("beforeunload", () => {
      this.disconnect();
    });

    document.addEventListener("visibilitychange", () => {
      if (
        document.visibilityState === "visible" &&
        this.socket &&
        !this.socket.connected
      ) {
        console.log("[SOCKETIO] 🔄 Page became visible - checking connection");
        this.socket.connect();
      }
    });
  }
}

export const socketIOService = new SocketIOService();
