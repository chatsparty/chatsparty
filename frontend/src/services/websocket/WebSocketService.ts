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

export interface WebSocketMessage {
  type: MessageType;
  channel: string;
  data: Record<string, any>;
  timestamp: string;
  message_id?: string;
}

export type MessageHandler = (message: WebSocketMessage) => void;

export class WebSocketService {
  private ws: WebSocket | null = null;
  private messageHandlers = new Map<MessageType, MessageHandler[]>();
  private channelSubscriptions = new Set<string>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;

  constructor() {
    this.setupEventHandlers();
  }

  async connect(token: string): Promise<void> {
    if (
      this.isConnecting ||
      (this.ws && this.ws.readyState === WebSocket.OPEN)
    ) {
      return;
    }

    this.isConnecting = true;

    try {
      const wsUrl = `ws://localhost:8000/ws?token=${encodeURIComponent(token)}`;
      console.log(
        `[WEBSOCKET] Attempting to connect with token: ${token.substring(
          0,
          20
        )}...`
      );
      this.ws = new WebSocket(wsUrl);

      return new Promise((resolve, reject) => {
        if (!this.ws) return reject(new Error("WebSocket not initialized"));

        this.ws.onopen = () => {
          console.log("[WEBSOCKET] ✅ Connected successfully");
          this.isConnecting = false;
          this.reconnectAttempts = 0;

          this.channelSubscriptions.forEach((channel) => {
            console.log(`[WEBSOCKET] Re-subscribing to channel: ${channel}`);
            this.subscribe(channel);
          });

          resolve();
        };

        this.ws.onerror = (error) => {
          console.error("[WEBSOCKET] ❌ Connection error:", error);
          this.isConnecting = false;
          reject(error);
        };

        this.ws.onclose = (event) => {
          console.log(
            `[WEBSOCKET] ❌ Disconnected - Code: ${event.code}, Reason: ${event.reason}`
          );
          this.isConnecting = false;

          if (event.code === 4001) {
            console.error(
              "[WEBSOCKET] 🔒 Authentication failed - token may be expired or invalid"
            );
            console.error(
              "[WEBSOCKET] Token used:",
              token.substring(0, 30) + "..."
            );
            return;
          }

          this.handleReconnect(token);
        };

        this.ws.onmessage = (event) => {
          console.log("[WEBSOCKET] 📨 Message received:", event.data);
          this.handleMessage(event.data);
        };
      });
    } catch (error) {
      console.error("[WEBSOCKET] ❌ Connection failed:", error);
      this.isConnecting = false;
      throw error;
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.channelSubscriptions.clear();
    this.messageHandlers.clear();
  }

  subscribe(channel: string): void {
    console.log(`[WEBSOCKET] 📡 Subscribing to channel: ${channel}`);
    this.channelSubscriptions.add(channel);

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = {
        type: MessageType.SUBSCRIBE,
        channel: "system",
        data: { channel },
        timestamp: new Date().toISOString(),
      };
      console.log(`[WEBSOCKET] 📤 Sending subscription message:`, message);
      this.send(message);
    } else {
      console.log(
        `[WEBSOCKET] ⚠️ WebSocket not open, subscription queued for: ${channel}`
      );
    }
  }

  unsubscribe(channel: string): void {
    this.channelSubscriptions.delete(channel);

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send({
        type: MessageType.UNSUBSCRIBE,
        channel: "system",
        data: { channel },
        timestamp: new Date().toISOString(),
      });
    }
  }

  send(message: WebSocketMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
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

  private handleMessage(data: string): void {
    try {
      const message: WebSocketMessage = JSON.parse(data);
      console.log("[WEBSOCKET] 📥 Parsed message:", message);

      const handlers = this.messageHandlers.get(message.type as MessageType);

      if (handlers) {
        console.log(
          `[WEBSOCKET] 🎯 Found ${handlers.length} handlers for type: ${message.type}`
        );
        handlers.forEach((handler) => {
          console.log(`[WEBSOCKET] 🔄 Calling handler for: ${message.type}`);
          handler(message);
        });
      } else {
        console.log(
          `[WEBSOCKET] ⚠️ No handlers found for message type: ${message.type}`
        );
      }
    } catch (error) {
      console.error("[WEBSOCKET] ❌ Error parsing message:", error);
      console.error("[WEBSOCKET] Raw data:", data);
    }
  }

  private async handleReconnect(token: string): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Max reconnection attempts reached");
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);

    console.log(
      `Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`
    );

    setTimeout(async () => {
      try {
        await this.connect(token);
      } catch (error) {
        console.error("Reconnection failed:", error);
      }
    }, delay);
  }

  private setupEventHandlers(): void {
    window.addEventListener("beforeunload", () => {
      this.disconnect();
    });
  }
}

export const webSocketService = new WebSocketService();
