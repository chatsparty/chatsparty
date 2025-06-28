import React, { useState, useEffect } from 'react';
import './PreviewPane.css';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

interface PreviewPaneProps {
  projectId: string;
  previewUrl?: string;
  className?: string;
}

interface ContainerInfo {
  sandbox_id: string;
  status: string;
  preview_url?: string;
  vm_url?: string;
  ports: Record<string, number>;
}

const PreviewPane: React.FC<PreviewPaneProps> = ({ 
  projectId, 
  previewUrl: initialPreviewUrl,
  className = '' 
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialPreviewUrl || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [containerInfo, setContainerInfo] = useState<ContainerInfo | null>(null);

  const fetchContainerInfo = async () => {
    if (!projectId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`${API_BASE_URL}/api/containers/${projectId}/info`);
      const info: ContainerInfo = response.data;
      setContainerInfo(info);
      
      if (info.preview_url) {
        setPreviewUrl(info.preview_url);
      } else if (info.ports['3000/tcp']) {
        setPreviewUrl(`http://localhost:${info.ports['3000/tcp']}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch container info');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!initialPreviewUrl) {
      fetchContainerInfo();
    }
  }, [projectId, initialPreviewUrl]);

  const openInNewTab = () => {
    if (previewUrl) {
      window.open(previewUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const refreshPreview = () => {
    const iframe = document.getElementById(`preview-iframe-${projectId}`) as HTMLIFrameElement;
    if (iframe) {
      iframe.src = iframe.src; // Force reload
    }
  };

  if (isLoading) {
    return (
      <div className={`preview-pane loading ${className}`}>
        <div className="preview-header">
          <span>Loading preview...</span>
        </div>
        <div className="preview-content">
          <div className="loading-spinner">Loading container info...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`preview-pane error ${className}`}>
        <div className="preview-header">
          <span>Preview Error</span>
          <button onClick={fetchContainerInfo} className="refresh-btn">
            Retry
          </button>
        </div>
        <div className="preview-content">
          <div className="error-message">
            <p>Failed to load preview:</p>
            <pre>{error}</pre>
            <p>Make sure your React dev server is running on port 3000</p>
          </div>
        </div>
      </div>
    );
  }

  if (!previewUrl) {
    return (
      <div className={`preview-pane no-preview ${className}`}>
        <div className="preview-header">
          <span>No Preview Available</span>
          <button onClick={fetchContainerInfo} className="refresh-btn">
            Check Again
          </button>
        </div>
        <div className="preview-content">
          <div className="no-preview-message">
            <h3>Start your React app to see preview</h3>
            <p>Run the following command in your container terminal:</p>
            <code>npm start</code>
            <p>The preview will appear here once the dev server starts on port 3000</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`preview-pane ${className}`}>
      <div className="preview-header">
        <div className="preview-info">
          <span className="preview-url">{previewUrl}</span>
          {containerInfo && (
            <span className="container-status">
              Container: {containerInfo.status}
            </span>
          )}
        </div>
        <div className="preview-controls">
          <button onClick={refreshPreview} className="control-btn" title="Refresh Preview">
            🔄
          </button>
          <button onClick={openInNewTab} className="control-btn" title="Open in New Tab">
            🔗
          </button>
          <button onClick={fetchContainerInfo} className="control-btn" title="Update Info">
            ℹ️
          </button>
        </div>
      </div>
      
      <div className="preview-content">
        <iframe
          id={`preview-iframe-${projectId}`}
          src={previewUrl}
          className="preview-iframe"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          title={`Preview for project ${projectId}`}
        />
      </div>
    </div>
  );
};

export default PreviewPane;