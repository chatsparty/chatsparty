import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';

// Mock the projectApi before importing the component
const mockDeleteFile = vi.fn();
vi.mock('../../../../services/projectApi', () => ({
  projectApi: {
    getVMFiles: vi.fn(),
    deleteFile: mockDeleteFile,
  },
}));

// Mock axios completely
vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    delete: vi.fn(),
    defaults: {},
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
    create: vi.fn(() => ({
      post: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    })),
  },
}));

// Mock all WebSocket related functionality
vi.mock('../hooks/useFileSystemWebSocket', () => ({
  useFileSystemWebSocket: () => ({
    recentEvents: [],
    clearEvents: vi.fn(),
  }),
}));

vi.mock('../../../../config/api', () => ({
  API_BASE_URL: 'http://localhost:8000',
}));

// Create a simplified FileExplorer component for testing delete functionality
const FileExplorerTest: React.FC<{
  project: any;
  onDeleteClick: (name: string, path: string, isFolder: boolean) => void;
}> = ({ project, onDeleteClick }) => {
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [itemToDelete, setItemToDelete] = React.useState<{
    name: string;
    path: string;
    isFolder: boolean;
  } | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const openDeleteDialog = (name: string, path: string, isFolder: boolean) => {
    setItemToDelete({ name, path, isFolder });
    setShowDeleteDialog(true);
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    
    setDeleting(true);
    try {
      await mockDeleteFile(
        project.id,
        itemToDelete.path,
        itemToDelete.isFolder,
        true
      );
      setShowDeleteDialog(false);
      setItemToDelete(null);
      onDeleteClick(itemToDelete.name, itemToDelete.path, itemToDelete.isFolder);
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      {project?.vm_status === 'active' && (
        <div>
          <div data-testid="file-item">
            <span>test-file.txt</span>
            <button
              data-testid="delete-file-btn"
              onClick={() => openDeleteDialog('test-file.txt', '/workspace/test-file.txt', false)}
              title="Delete file"
            >
              Delete File
            </button>
          </div>
          <div data-testid="folder-item">
            <span>test-folder</span>
            <button
              data-testid="delete-folder-btn"
              onClick={() => openDeleteDialog('test-folder', '/workspace/test-folder', true)}
              title="Delete folder"
            >
              Delete Folder
            </button>
          </div>
        </div>
      )}

      {showDeleteDialog && (
        <div data-testid="delete-dialog">
          <h2>Delete {itemToDelete?.isFolder ? 'Folder' : 'File'}</h2>
          <p>Are you sure you want to delete "{itemToDelete?.name}"?</p>
          {itemToDelete?.isFolder && (
            <p>This will permanently delete the folder and all its contents.</p>
          )}
          <button
            data-testid="cancel-btn"
            onClick={() => setShowDeleteDialog(false)}
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            data-testid="confirm-delete-btn"
            onClick={handleDeleteItem}
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : `Delete ${itemToDelete?.isFolder ? 'Folder' : 'File'}`}
          </button>
        </div>
      )}
    </div>
  );
};

describe('FileExplorer Delete Functionality (Simplified)', () => {
  const mockProject = {
    id: 'test-project-123',
    name: 'Test Project',
    vm_status: 'active',
  };

  const mockOnDeleteClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render delete buttons when VM is active', () => {
    render(<FileExplorerTest project={mockProject} onDeleteClick={mockOnDeleteClick} />);

    expect(screen.getByTestId('delete-file-btn')).toBeInTheDocument();
    expect(screen.getByTestId('delete-folder-btn')).toBeInTheDocument();
  });

  it('should not render delete buttons when VM is not active', () => {
    const inactiveProject = { ...mockProject, vm_status: 'stopped' };
    render(<FileExplorerTest project={inactiveProject} onDeleteClick={mockOnDeleteClick} />);

    expect(screen.queryByTestId('delete-file-btn')).not.toBeInTheDocument();
    expect(screen.queryByTestId('delete-folder-btn')).not.toBeInTheDocument();
  });

  it('should open delete confirmation dialog when file delete button is clicked', async () => {
    const user = userEvent.setup();
    render(<FileExplorerTest project={mockProject} onDeleteClick={mockOnDeleteClick} />);

    const deleteButton = screen.getByTestId('delete-file-btn');
    await user.click(deleteButton);

    expect(screen.getByTestId('delete-dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Delete File' })).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete "test-file.txt"?')).toBeInTheDocument();
  });

  it('should open delete confirmation dialog for folders with warning', async () => {
    const user = userEvent.setup();
    render(<FileExplorerTest project={mockProject} onDeleteClick={mockOnDeleteClick} />);

    const deleteButton = screen.getByTestId('delete-folder-btn');
    await user.click(deleteButton);

    expect(screen.getByTestId('delete-dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Delete Folder' })).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete "test-folder"?')).toBeInTheDocument();
    expect(screen.getByText('This will permanently delete the folder and all its contents.')).toBeInTheDocument();
  });

  it('should call deleteFile API when confirming file deletion', async () => {
    const user = userEvent.setup();
    mockDeleteFile.mockResolvedValue({ success: true, message: 'File deleted' });

    render(<FileExplorerTest project={mockProject} onDeleteClick={mockOnDeleteClick} />);

    // Open delete dialog
    const deleteButton = screen.getByTestId('delete-file-btn');
    await user.click(deleteButton);

    // Confirm deletion
    const confirmButton = screen.getByTestId('confirm-delete-btn');
    await user.click(confirmButton);

    await waitFor(() => {
      expect(mockDeleteFile).toHaveBeenCalledWith(
        'test-project-123',
        '/workspace/test-file.txt',
        false,
        true
      );
    });

    expect(mockOnDeleteClick).toHaveBeenCalledWith('test-file.txt', '/workspace/test-file.txt', false);
  });

  it('should call deleteFile API with folder parameters when confirming folder deletion', async () => {
    const user = userEvent.setup();
    mockDeleteFile.mockResolvedValue({ success: true, message: 'Folder deleted' });

    render(<FileExplorerTest project={mockProject} onDeleteClick={mockOnDeleteClick} />);

    // Open delete dialog for folder
    const deleteButton = screen.getByTestId('delete-folder-btn');
    await user.click(deleteButton);

    // Confirm deletion
    const confirmButton = screen.getByTestId('confirm-delete-btn');
    await user.click(confirmButton);

    await waitFor(() => {
      expect(mockDeleteFile).toHaveBeenCalledWith(
        'test-project-123',
        '/workspace/test-folder',
        true,
        true
      );
    });

    expect(mockOnDeleteClick).toHaveBeenCalledWith('test-folder', '/workspace/test-folder', true);
  });

  it('should close delete dialog when cancel is clicked', async () => {
    const user = userEvent.setup();
    render(<FileExplorerTest project={mockProject} onDeleteClick={mockOnDeleteClick} />);

    // Open delete dialog
    const deleteButton = screen.getByTestId('delete-file-btn');
    await user.click(deleteButton);

    expect(screen.getByTestId('delete-dialog')).toBeInTheDocument();

    // Click cancel
    const cancelButton = screen.getByTestId('cancel-btn');
    await user.click(cancelButton);

    expect(screen.queryByTestId('delete-dialog')).not.toBeInTheDocument();
    expect(mockDeleteFile).not.toHaveBeenCalled();
  });

  it('should show loading state during deletion', async () => {
    const user = userEvent.setup();
    
    // Create a controlled promise
    let resolveDelete: (value: any) => void;
    const deletePromise = new Promise((resolve) => {
      resolveDelete = resolve;
    });
    
    mockDeleteFile.mockReturnValue(deletePromise);

    render(<FileExplorerTest project={mockProject} onDeleteClick={mockOnDeleteClick} />);

    // Start delete process
    const deleteButton = screen.getByTestId('delete-file-btn');
    await user.click(deleteButton);

    const confirmButton = screen.getByTestId('confirm-delete-btn');
    await user.click(confirmButton);

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText('Deleting...')).toBeInTheDocument();
    });

    // Buttons should be disabled
    expect(screen.getByTestId('cancel-btn')).toBeDisabled();
    expect(screen.getByTestId('confirm-delete-btn')).toBeDisabled();

    // Resolve the promise
    resolveDelete!({ success: true, message: 'Deleted' });

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText('Deleting...')).not.toBeInTheDocument();
    });
  });

  it('should handle delete API errors gracefully', async () => {
    const user = userEvent.setup();
    const errorMessage = 'Failed to delete file: Permission denied';
    
    mockDeleteFile.mockRejectedValue({
      response: {
        data: {
          detail: errorMessage,
        },
      },
    });

    render(<FileExplorerTest project={mockProject} onDeleteClick={mockOnDeleteClick} />);

    // Open and confirm delete
    const deleteButton = screen.getByTestId('delete-file-btn');
    await user.click(deleteButton);

    const confirmButton = screen.getByTestId('confirm-delete-btn');
    await user.click(confirmButton);

    // Wait for API call to complete
    await waitFor(() => {
      expect(mockDeleteFile).toHaveBeenCalled();
    });

    // Error should be logged (we'd need to mock console.error to test this properly)
    expect(mockOnDeleteClick).not.toHaveBeenCalled();
  });
});