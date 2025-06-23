import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useFileSystemWebSocket } from '../useFileSystemWebSocket';
import { MessageType } from '../../../../services/websocket/WebSocketService';

// Mock the useWebSocket hook
const mockSubscribe = vi.fn();
const mockUnsubscribe = vi.fn();
const mockOnMessage = vi.fn();
const mockOffMessage = vi.fn();

vi.mock('../../../../services/websocket/useWebSocket', () => ({
  useWebSocket: () => ({
    subscribe: mockSubscribe,
    unsubscribe: mockUnsubscribe,
    onMessage: mockOnMessage,
    offMessage: mockOffMessage,
    isConnected: true,
  }),
}));

describe('useFileSystemWebSocket', () => {
  const mockProjectId = 'test-project-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should subscribe to project file system events when connected', () => {
    renderHook(() => useFileSystemWebSocket(mockProjectId));

    expect(mockSubscribe).toHaveBeenCalledWith(`project:${mockProjectId}:files`);
    expect(mockOnMessage).toHaveBeenCalledWith(MessageType.FILE_CREATED, expect.any(Function));
    expect(mockOnMessage).toHaveBeenCalledWith(MessageType.FILE_MODIFIED, expect.any(Function));
    expect(mockOnMessage).toHaveBeenCalledWith(MessageType.FILE_DELETED, expect.any(Function));
    expect(mockOnMessage).toHaveBeenCalledWith(MessageType.FOLDER_CREATED, expect.any(Function));
    expect(mockOnMessage).toHaveBeenCalledWith(MessageType.FOLDER_DELETED, expect.any(Function));
  });

  it('should handle file deletion events correctly', () => {
    const { result } = renderHook(() => useFileSystemWebSocket(mockProjectId));

    // Get the file deleted handler that was registered
    const fileDeletedHandler = mockOnMessage.mock.calls.find(
      call => call[0] === MessageType.FILE_DELETED
    )?.[1];

    expect(fileDeletedHandler).toBeDefined();

    // Simulate a file deletion event
    const mockDeleteEvent = {
      data: {
        file_path: '/workspace/test-project-123/deleted-file.txt',
        full_path: '/workspace/test-project-123/deleted-file.txt',
        project_id: mockProjectId,
        event_type: 'fs:deleted',
        timestamp: new Date().toISOString(),
      },
    };

    act(() => {
      fileDeletedHandler(mockDeleteEvent);
    });

    // Check that the event was added to recent events
    expect(result.current.recentEvents).toHaveLength(1);
    expect(result.current.recentEvents[0]).toEqual(mockDeleteEvent.data);
  });

  it('should handle folder deletion events correctly', () => {
    const { result } = renderHook(() => useFileSystemWebSocket(mockProjectId));

    // Get the folder deleted handler that was registered
    const folderDeletedHandler = mockOnMessage.mock.calls.find(
      call => call[0] === MessageType.FOLDER_DELETED
    )?.[1];

    expect(folderDeletedHandler).toBeDefined();

    // Simulate a folder deletion event
    const mockDeleteEvent = {
      data: {
        file_path: '/workspace/test-project-123/deleted-folder',
        full_path: '/workspace/test-project-123/deleted-folder',
        project_id: mockProjectId,
        event_type: 'fs:folder_deleted',
        timestamp: new Date().toISOString(),
      },
    };

    act(() => {
      folderDeletedHandler(mockDeleteEvent);
    });

    // Check that the event was added to recent events
    expect(result.current.recentEvents).toHaveLength(1);
    expect(result.current.recentEvents[0]).toEqual(mockDeleteEvent.data);
  });

  it('should maintain only the last 10 events', () => {
    const { result } = renderHook(() => useFileSystemWebSocket(mockProjectId));

    // Get the file deleted handler
    const fileDeletedHandler = mockOnMessage.mock.calls.find(
      call => call[0] === MessageType.FILE_DELETED
    )?.[1];

    // Add 12 delete events
    for (let i = 0; i < 12; i++) {
      const mockEvent = {
        data: {
          file_path: `/workspace/test-project-123/file-${i}.txt`,
          full_path: `/workspace/test-project-123/file-${i}.txt`,
          project_id: mockProjectId,
          event_type: 'fs:deleted',
          timestamp: new Date().toISOString(),
        },
      };

      act(() => {
        fileDeletedHandler(mockEvent);
      });
    }

    // Should only keep the last 10 events
    expect(result.current.recentEvents).toHaveLength(10);
    
    // Most recent event should be file-11.txt (index 11)
    expect(result.current.recentEvents[0].file_path).toBe('/workspace/test-project-123/file-11.txt');
    
    // Oldest kept event should be file-2.txt (index 2)
    expect(result.current.recentEvents[9].file_path).toBe('/workspace/test-project-123/file-2.txt');
  });

  it('should clear events when clearEvents is called', () => {
    const { result } = renderHook(() => useFileSystemWebSocket(mockProjectId));

    // Get the file deleted handler and add an event
    const fileDeletedHandler = mockOnMessage.mock.calls.find(
      call => call[0] === MessageType.FILE_DELETED
    )?.[1];

    const mockEvent = {
      data: {
        file_path: '/workspace/test-project-123/test-file.txt',
        full_path: '/workspace/test-project-123/test-file.txt',
        project_id: mockProjectId,
        event_type: 'fs:deleted',
        timestamp: new Date().toISOString(),
      },
    };

    act(() => {
      fileDeletedHandler(mockEvent);
    });

    expect(result.current.recentEvents).toHaveLength(1);

    // Clear events
    act(() => {
      result.current.clearEvents();
    });

    expect(result.current.recentEvents).toHaveLength(0);
  });

  it('should unsubscribe and cleanup handlers on unmount', () => {
    const { unmount } = renderHook(() => useFileSystemWebSocket(mockProjectId));

    // Clear mocks to only track cleanup calls
    vi.clearAllMocks();

    unmount();

    expect(mockOffMessage).toHaveBeenCalledWith(MessageType.FILE_CREATED, expect.any(Function));
    expect(mockOffMessage).toHaveBeenCalledWith(MessageType.FILE_MODIFIED, expect.any(Function));
    expect(mockOffMessage).toHaveBeenCalledWith(MessageType.FILE_DELETED, expect.any(Function));
    expect(mockOffMessage).toHaveBeenCalledWith(MessageType.FOLDER_CREATED, expect.any(Function));
    expect(mockOffMessage).toHaveBeenCalledWith(MessageType.FOLDER_DELETED, expect.any(Function));
    expect(mockUnsubscribe).toHaveBeenCalledWith(`project:${mockProjectId}:files`);
  });

  it('should not subscribe when not connected or projectId is empty', () => {
    // Test with empty projectId
    vi.mocked(mockSubscribe).mockClear();
    renderHook(() => useFileSystemWebSocket(''));
    expect(mockSubscribe).not.toHaveBeenCalled();
  });
});