import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebSocketService, MessageType } from '../WebSocketService';

// Mock WebSocket at the global level
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  url: string;
  readyState: number = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    // Store reference for testing
    (globalThis as any).__lastWebSocket = this;
  }

  send(data: string) {
    // Mock send
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }

  // Test helper methods
  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    if (this.onopen) {
      this.onopen(new Event('open'));
    }
  }

  simulateMessage(data: string) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data }));
    }
  }

  simulateError() {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }

  simulateClose(code: number = 1000, reason: string = 'Normal closure') {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code, reason }));
    }
  }
}

// Replace global WebSocket with our mock
(globalThis as any).WebSocket = MockWebSocket;

describe('WebSocketService', () => {
  let service: WebSocketService;
  let mockWebSocket: MockWebSocket;

  beforeEach(() => {
    service = new WebSocketService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    service.disconnect();
  });

  it('should create WebSocket connection with correct URL and token', async () => {
    const token = 'test-token-123';
    const connectPromise = service.connect(token);

    // Get the mock WebSocket instance
    mockWebSocket = (globalThis as any).__lastWebSocket;
    expect(mockWebSocket.url).toBe(`ws://localhost:8000/ws?token=${encodeURIComponent(token)}`);

    // Simulate connection opening
    mockWebSocket.simulateOpen();

    await connectPromise;
  });

  it('should handle connection success', async () => {
    const token = 'test-token';
    const connectPromise = service.connect(token);

    mockWebSocket = (globalThis as any).__lastWebSocket;
    mockWebSocket.simulateOpen();

    await expect(connectPromise).resolves.toBeUndefined();
  });

  it('should handle connection errors', async () => {
    const token = 'test-token';
    const connectPromise = service.connect(token);

    mockWebSocket = (globalThis as any).__lastWebSocket;
    mockWebSocket.simulateError();

    await expect(connectPromise).rejects.toThrow();
  });

  it('should handle authentication failures (code 4001)', async () => {
    const token = 'invalid-token';
    const connectPromise = service.connect(token);

    mockWebSocket = (globalThis as any).__lastWebSocket;
    mockWebSocket.simulateOpen();

    await connectPromise;

    // Simulate authentication failure
    mockWebSocket.simulateClose(4001, 'Authentication failed');

    // Should not attempt to reconnect for auth failures
    // This is tested by checking that no new WebSocket is created
    const originalWebSocket = mockWebSocket;
    
    // Wait a bit to see if reconnection is attempted
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect((globalThis as any).__lastWebSocket).toBe(originalWebSocket);
  });

  it('should subscribe to channels', async () => {
    const token = 'test-token';
    const channel = 'project:123:files';
    
    const connectPromise = service.connect(token);
    mockWebSocket = (globalThis as any).__lastWebSocket;
    
    // Mock the send method to capture messages
    const sentMessages: string[] = [];
    mockWebSocket.send = vi.fn((data: string) => {
      sentMessages.push(data);
    });

    mockWebSocket.simulateOpen();
    await connectPromise;

    service.subscribe(channel);

    expect(sentMessages).toHaveLength(1);
    const message = JSON.parse(sentMessages[0]);
    expect(message.type).toBe(MessageType.SUBSCRIBE);
    expect(message.data.channel).toBe(channel);
  });

  it('should unsubscribe from channels', async () => {
    const token = 'test-token';
    const channel = 'project:123:files';
    
    const connectPromise = service.connect(token);
    mockWebSocket = (globalThis as any).__lastWebSocket;
    
    const sentMessages: string[] = [];
    mockWebSocket.send = vi.fn((data: string) => {
      sentMessages.push(data);
    });

    mockWebSocket.simulateOpen();
    await connectPromise;

    service.subscribe(channel);
    service.unsubscribe(channel);

    expect(sentMessages).toHaveLength(2);
    const unsubMessage = JSON.parse(sentMessages[1]);
    expect(unsubMessage.type).toBe(MessageType.UNSUBSCRIBE);
    expect(unsubMessage.data.channel).toBe(channel);
  });

  it('should handle incoming delete messages', async () => {
    const token = 'test-token';
    const connectPromise = service.connect(token);
    mockWebSocket = (globalThis as any).__lastWebSocket;
    mockWebSocket.simulateOpen();
    await connectPromise;

    const deleteHandler = vi.fn();
    service.onMessage(MessageType.FILE_DELETED, deleteHandler);

    const deleteMessage = {
      type: MessageType.FILE_DELETED,
      channel: 'project:123:files',
      data: {
        file_path: '/workspace/test-file.txt',
        project_id: '123',
        event_type: 'fs:deleted',
        timestamp: '2024-01-01T00:00:00Z',
      },
      timestamp: '2024-01-01T00:00:00Z',
    };

    mockWebSocket.simulateMessage(JSON.stringify(deleteMessage));

    expect(deleteHandler).toHaveBeenCalledWith(deleteMessage);
  });

  it('should handle incoming folder delete messages', async () => {
    const token = 'test-token';
    const connectPromise = service.connect(token);
    mockWebSocket = (globalThis as any).__lastWebSocket;
    mockWebSocket.simulateOpen();
    await connectPromise;

    const folderDeleteHandler = vi.fn();
    service.onMessage(MessageType.FOLDER_DELETED, folderDeleteHandler);

    const folderDeleteMessage = {
      type: MessageType.FOLDER_DELETED,
      channel: 'project:123:files',
      data: {
        file_path: '/workspace/test-folder',
        project_id: '123',
        event_type: 'fs:folder_deleted',
        timestamp: '2024-01-01T00:00:00Z',
      },
      timestamp: '2024-01-01T00:00:00Z',
    };

    mockWebSocket.simulateMessage(JSON.stringify(folderDeleteMessage));

    expect(folderDeleteHandler).toHaveBeenCalledWith(folderDeleteMessage);
  });

  it('should remove message handlers when offMessage is called', async () => {
    const token = 'test-token';
    const connectPromise = service.connect(token);
    mockWebSocket = (globalThis as any).__lastWebSocket;
    mockWebSocket.simulateOpen();
    await connectPromise;

    const handler = vi.fn();
    service.onMessage(MessageType.FILE_DELETED, handler);
    service.offMessage(MessageType.FILE_DELETED, handler);

    const deleteMessage = {
      type: MessageType.FILE_DELETED,
      channel: 'project:123:files',
      data: { file_path: '/workspace/test.txt' },
      timestamp: '2024-01-01T00:00:00Z',
    };

    mockWebSocket.simulateMessage(JSON.stringify(deleteMessage));

    expect(handler).not.toHaveBeenCalled();
  });

  it('should handle malformed messages gracefully', async () => {
    const token = 'test-token';
    const connectPromise = service.connect(token);
    mockWebSocket = (globalThis as any).__lastWebSocket;
    mockWebSocket.simulateOpen();
    await connectPromise;

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Send malformed JSON
    mockWebSocket.simulateMessage('invalid json');

    expect(consoleSpy).toHaveBeenCalledWith('Error parsing WebSocket message:', expect.any(Error));
    
    consoleSpy.mockRestore();
  });

  it('should disconnect cleanly', async () => {
    const token = 'test-token';
    const connectPromise = service.connect(token);
    mockWebSocket = (globalThis as any).__lastWebSocket;
    mockWebSocket.simulateOpen();
    await connectPromise;

    const closeSpy = vi.spyOn(mockWebSocket, 'close');

    service.disconnect();

    expect(closeSpy).toHaveBeenCalled();
  });

  it('should re-subscribe to channels after reconnection', async () => {
    const token = 'test-token';
    const channel = 'project:123:files';
    
    // Initial connection
    const connectPromise = service.connect(token);
    mockWebSocket = (globalThis as any).__lastWebSocket;
    mockWebSocket.simulateOpen();
    await connectPromise;

    // Subscribe to channel
    service.subscribe(channel);

    // Simulate disconnection (not auth failure)
    mockWebSocket.simulateClose(1006, 'Connection lost');

    // Wait for reconnection attempt
    await new Promise(resolve => setTimeout(resolve, 1100)); // Wait longer than reconnect delay

    // Get the new WebSocket instance
    const newMockWebSocket = (globalThis as any).__lastWebSocket;
    
    // Mock send to capture resubscription
    const sentMessages: string[] = [];
    newMockWebSocket.send = vi.fn((data: string) => {
      sentMessages.push(data);
    });

    // Simulate reconnection success
    newMockWebSocket.simulateOpen();

    // Should automatically resubscribe
    expect(sentMessages).toHaveLength(1);
    const message = JSON.parse(sentMessages[0]);
    expect(message.type).toBe(MessageType.SUBSCRIBE);
    expect(message.data.channel).toBe(channel);
  });
});