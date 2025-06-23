import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FileExplorer } from '../FileExplorer';
import { projectApi } from '../../../../services/projectApi';
import type { Project } from '../../../../types/project';

// Mock the project API
vi.mock('../../../../services/projectApi', () => ({
  projectApi: {
    getVMFiles: vi.fn(),
    deleteFile: vi.fn(),
  },
}));

// Mock axios
vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    delete: vi.fn(),
    defaults: {},
    interceptors: {
      request: {
        use: vi.fn(),
      },
      response: {
        use: vi.fn(),
      },
    },
    create: vi.fn(() => ({
      post: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        request: {
          use: vi.fn(),
        },
        response: {
          use: vi.fn(),
        },
      },
    })),
  },
}));

// Mock the WebSocket hook completely to avoid provider issues
vi.mock('../hooks/useFileSystemWebSocket', () => ({
  useFileSystemWebSocket: () => ({
    recentEvents: [],
    clearEvents: vi.fn(),
  }),
}));

// Mock the useWebSocket hook directly
vi.mock('../../../services/websocket/useWebSocket', () => ({
  useWebSocket: () => ({
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    onMessage: vi.fn(),
    offMessage: vi.fn(),
    isConnected: true,
  }),
}));

// Mock API_BASE_URL
vi.mock('../../../../config/api', () => ({
  API_BASE_URL: 'http://localhost:8000',
}));

describe('FileExplorer Delete Functionality', () => {
  const mockProject: Project = {
    id: 'test-project-123',
    name: 'Test Project',
    user_id: 'user-123',
    vm_status: 'active',
    is_active: true,
    auto_sync_files: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  const mockFileStructure = {
    name: 'workspace',
    type: 'directory',
    path: '/workspace',
    children: [
      {
        name: 'test-file.txt',
        type: 'file',
        path: '/workspace/test-file.txt',
      },
      {
        name: 'test-folder',
        type: 'directory',
        path: '/workspace/test-folder',
        children: [
          {
            name: 'nested-file.txt',
            type: 'file',
            path: '/workspace/test-folder/nested-file.txt',
          },
        ],
      },
    ],
  };

  const defaultProps = {
    project: mockProject,
    expandedFolders: new Set<string>(),
    onToggleFolder: vi.fn(),
    onOpenFile: vi.fn(),
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock successful file structure fetch
    vi.mocked(projectApi.getVMFiles).mockResolvedValue({
      files: mockFileStructure,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render delete buttons for files when VM is active', async () => {
    render(<FileExplorer {...defaultProps} />);

    // Wait for files to load
    await waitFor(() => {
      expect(screen.getByText('test-file.txt')).toBeInTheDocument();
    });

    // Find the file row and hover to show delete button
    const fileRow = screen.getByText('test-file.txt').closest('div');
    expect(fileRow).toBeInTheDocument();

    // The delete button should be in the DOM but hidden (opacity-0)
    const deleteButtons = screen.getAllByTitle('Delete file');
    expect(deleteButtons.length).toBeGreaterThan(0);
  });

  it('should render delete buttons for folders when VM is active', async () => {
    const propsWithExpandedFolder = {
      ...defaultProps,
      expandedFolders: new Set(['/workspace/test-folder']),
    };

    render(<FileExplorer {...propsWithExpandedFolder} />);

    // Wait for files to load
    await waitFor(() => {
      expect(screen.getByText('test-folder')).toBeInTheDocument();
    });

    // The delete button for folder should be present
    const deleteButtons = screen.getAllByTitle('Delete folder');
    expect(deleteButtons.length).toBeGreaterThan(0);
  });

  it('should not render delete buttons when VM is not active', async () => {
    const inactiveProject = { ...mockProject, vm_status: 'stopped' as const };
    const props = { ...defaultProps, project: inactiveProject };

    render(<FileExplorer {...props} />);

    // Wait for component to render
    await waitFor(() => {
      expect(screen.getByText('VM must be active to view files')).toBeInTheDocument();
    });

    // No delete buttons should be present
    expect(screen.queryByTitle('Delete file')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Delete folder')).not.toBeInTheDocument();
  });

  it('should open delete confirmation dialog when delete button is clicked', async () => {
    const user = userEvent.setup();
    render(<FileExplorer {...defaultProps} />);

    // Wait for files to load
    await waitFor(() => {
      expect(screen.getByText('test-file.txt')).toBeInTheDocument();
    });

    // Click the delete button for the file
    const deleteButton = screen.getAllByTitle('Delete file')[0];
    await user.click(deleteButton);

    // Check that delete confirmation dialog appears
    await waitFor(() => {
      expect(screen.getByText('Delete File')).toBeInTheDocument();
      expect(screen.getByText('Are you sure you want to delete "test-file.txt"?')).toBeInTheDocument();
      expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
    });
  });

  it('should open delete confirmation dialog for folders with warning', async () => {
    const user = userEvent.setup();
    const propsWithExpandedFolder = {
      ...defaultProps,
      expandedFolders: new Set(['/workspace/test-folder']),
    };

    render(<FileExplorer {...propsWithExpandedFolder} />);

    // Wait for files to load
    await waitFor(() => {
      expect(screen.getByText('test-folder')).toBeInTheDocument();
    });

    // Click the delete button for the folder
    const deleteButton = screen.getAllByTitle('Delete folder')[0];
    await user.click(deleteButton);

    // Check that delete confirmation dialog appears with folder warning
    await waitFor(() => {
      expect(screen.getByText('Delete Folder')).toBeInTheDocument();
      expect(screen.getByText('Are you sure you want to delete "test-folder"?')).toBeInTheDocument();
      expect(screen.getByText('This will permanently delete the folder and all its contents.')).toBeInTheDocument();
    });
  });

  it('should call deleteFile API when confirming file deletion', async () => {
    const user = userEvent.setup();
    vi.mocked(projectApi.deleteFile).mockResolvedValue({
      success: true,
      message: 'File deleted successfully',
    });

    render(<FileExplorer {...defaultProps} />);

    // Wait for files to load
    await waitFor(() => {
      expect(screen.getByText('test-file.txt')).toBeInTheDocument();
    });

    // Click delete button
    const deleteButton = screen.getAllByTitle('Delete file')[0];
    await user.click(deleteButton);

    // Wait for dialog to appear and click confirm
    await waitFor(() => {
      expect(screen.getByText('Delete File')).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole('button', { name: /Delete File/i });
    await user.click(confirmButton);

    // Check that API was called correctly
    await waitFor(() => {
      expect(projectApi.deleteFile).toHaveBeenCalledWith(
        'test-project-123',
        '/workspace/test-file.txt',
        false,
        true
      );
    });
  });

  it('should call deleteFile API with folder parameters when confirming folder deletion', async () => {
    const user = userEvent.setup();
    vi.mocked(projectApi.deleteFile).mockResolvedValue({
      success: true,
      message: 'Folder deleted successfully',
    });

    const propsWithExpandedFolder = {
      ...defaultProps,
      expandedFolders: new Set(['/workspace/test-folder']),
    };

    render(<FileExplorer {...propsWithExpandedFolder} />);

    // Wait for files to load
    await waitFor(() => {
      expect(screen.getByText('test-folder')).toBeInTheDocument();
    });

    // Click delete button for folder
    const deleteButton = screen.getAllByTitle('Delete folder')[0];
    await user.click(deleteButton);

    // Wait for dialog and confirm
    await waitFor(() => {
      expect(screen.getByText('Delete Folder')).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole('button', { name: /Delete Folder/i });
    await user.click(confirmButton);

    // Check that API was called with folder parameters
    await waitFor(() => {
      expect(projectApi.deleteFile).toHaveBeenCalledWith(
        'test-project-123',
        '/workspace/test-folder',
        true,
        true
      );
    });
  });

  it('should handle delete API errors gracefully', async () => {
    const user = userEvent.setup();
    const errorMessage = 'Failed to delete file: Permission denied';
    vi.mocked(projectApi.deleteFile).mockRejectedValue({
      response: {
        data: {
          detail: errorMessage,
        },
      },
    });

    render(<FileExplorer {...defaultProps} />);

    // Wait for files to load
    await waitFor(() => {
      expect(screen.getByText('test-file.txt')).toBeInTheDocument();
    });

    // Click delete and confirm
    const deleteButton = screen.getAllByTitle('Delete file')[0];
    await user.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText('Delete File')).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole('button', { name: /Delete File/i });
    await user.click(confirmButton);

    // Check that error message is displayed
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('should close delete dialog when cancel is clicked', async () => {
    const user = userEvent.setup();
    render(<FileExplorer {...defaultProps} />);

    // Wait for files to load
    await waitFor(() => {
      expect(screen.getByText('test-file.txt')).toBeInTheDocument();
    });

    // Open delete dialog
    const deleteButton = screen.getAllByTitle('Delete file')[0];
    await user.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText('Delete File')).toBeInTheDocument();
    });

    // Click cancel
    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    await user.click(cancelButton);

    // Dialog should close
    await waitFor(() => {
      expect(screen.queryByText('Delete File')).not.toBeInTheDocument();
    });

    // API should not have been called
    expect(projectApi.deleteFile).not.toHaveBeenCalled();
  });

  it('should show loading state during deletion', async () => {
    const user = userEvent.setup();
    
    // Create a promise that we can control
    let resolveDelete: (value: { success: boolean; message: string }) => void;
    const deletePromise = new Promise<{ success: boolean; message: string }>((resolve) => {
      resolveDelete = resolve;
    });
    
    vi.mocked(projectApi.deleteFile).mockReturnValue(deletePromise);

    render(<FileExplorer {...defaultProps} />);

    // Wait for files to load
    await waitFor(() => {
      expect(screen.getByText('test-file.txt')).toBeInTheDocument();
    });

    // Start delete process
    const deleteButton = screen.getAllByTitle('Delete file')[0];
    await user.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText('Delete File')).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole('button', { name: /Delete File/i });
    await user.click(confirmButton);

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText('Deleting...')).toBeInTheDocument();
    });

    // Buttons should be disabled during loading
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Deleting.../i })).toBeDisabled();

    // Resolve the promise
    resolveDelete!({ success: true, message: 'Deleted' });

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText('Deleting...')).not.toBeInTheDocument();
    });
  });
});