import React, { useState, useEffect } from 'react';
import PreviewPane from './PreviewPane';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

interface ProjectWorkspaceProps {
  projectId: string;
}

interface ContainerData {
  sandbox_id: string;
  status: string;
  preview_url?: string;
  vm_url?: string;
  ports: Record<string, number>;
}

const ProjectWorkspace: React.FC<ProjectWorkspaceProps> = ({ projectId }) => {
  const [containerData, setContainerData] = useState<ContainerData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContainerData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch container data using axios with proper base URL
        const response = await axios.get(`${API_BASE_URL}/api/containers/${projectId}/info`);
        const data: ContainerData = response.data;
        setContainerData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch container data');
      } finally {
        setIsLoading(false);
      }
    };

    if (projectId) {
      fetchContainerData();
    }
  }, [projectId]);

  if (isLoading) {
    return (
      <div className="project-workspace loading">
        <div className="workspace-header">
          <h2>Project: {projectId}</h2>
          <span>Loading container...</span>
        </div>
        <div className="workspace-content">
          <div className="loading-placeholder">
            Setting up development environment...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="project-workspace error">
        <div className="workspace-header">
          <h2>Project: {projectId}</h2>
          <span className="error-badge">Error</span>
        </div>
        <div className="workspace-content">
          <div className="error-display">
            <h3>Failed to load project workspace</h3>
            <p>{error}</p>
            <button onClick={() => window.location.reload()}>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="project-workspace">
      <div className="workspace-header">
        <div className="project-info">
          <h2>Project: {projectId}</h2>
          <div className="container-info">
            <span className="container-id">
              Container: {containerData?.sandbox_id?.substring(0, 12)}
            </span>
            <span className={`status-badge ${containerData?.status}`}>
              {containerData?.status}
            </span>
          </div>
        </div>
        
        <div className="workspace-controls">
          {containerData?.vm_url && (
            <a 
              href={containerData.vm_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="control-link"
            >
              API Server
            </a>
          )}
          
          {containerData?.preview_url && (
            <a 
              href={containerData.preview_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="control-link preview-link"
            >
              Open Preview
            </a>
          )}
        </div>
      </div>

      <div className="workspace-content">
        <div className="workspace-grid">
          {/* File Explorer / Code Editor would go here */}
          <div className="editor-section">
            <div className="editor-placeholder">
              <h3>Code Editor</h3>
              <p>Your file explorer and code editor would be here</p>
              
              {/* Example terminal commands */}
              <div className="quick-commands">
                <h4>Quick Commands:</h4>
                <div className="command-list">
                  <button className="command-btn">npm create react-app .</button>
                  <button className="command-btn">npm start</button>
                  <button className="command-btn">npm run build</button>
                </div>
              </div>
            </div>
          </div>

          {/* Preview Section */}
          <div className="preview-section">
            <PreviewPane 
              projectId={projectId}
              previewUrl={containerData?.preview_url}
              className="workspace-preview"
            />
          </div>
        </div>
      </div>

      <style>{`
        .project-workspace {
          display: flex;
          flex-direction: column;
          height: 100vh;
          background: #f5f5f5;
        }

        .workspace-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          background: white;
          border-bottom: 1px solid #e0e0e0;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .project-info h2 {
          margin: 0 0 8px 0;
          color: #333;
          font-size: 20px;
        }

        .container-info {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .container-id {
          font-family: monospace;
          font-size: 12px;
          color: #666;
        }

        .status-badge {
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 500;
          text-transform: uppercase;
        }

        .status-badge.running {
          background: #e8f5e8;
          color: #2e7d32;
        }

        .status-badge.created {
          background: #e3f2fd;
          color: #1976d2;
        }

        .workspace-controls {
          display: flex;
          gap: 12px;
        }

        .control-link {
          padding: 8px 16px;
          border: 1px solid #ddd;
          border-radius: 6px;
          text-decoration: none;
          color: #333;
          font-size: 14px;
          transition: all 0.2s ease;
        }

        .control-link:hover {
          background: #f0f0f0;
          border-color: #bbb;
        }

        .preview-link {
          background: #e3f2fd;
          border-color: #90caf9;
          color: #1976d2;
        }

        .preview-link:hover {
          background: #bbdefb;
        }

        .workspace-content {
          flex: 1;
          padding: 24px;
        }

        .workspace-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          height: 100%;
        }

        .editor-section, .preview-section {
          display: flex;
          flex-direction: column;
        }

        .editor-placeholder {
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 24px;
          text-align: center;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }

        .quick-commands {
          margin-top: 24px;
          text-align: left;
        }

        .quick-commands h4 {
          margin: 0 0 12px 0;
          color: #333;
        }

        .command-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          align-items: flex-start;
        }

        .command-btn {
          padding: 8px 12px;
          background: #f5f5f5;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-family: monospace;
          font-size: 12px;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .command-btn:hover {
          background: #e0e0e0;
        }

        .workspace-preview {
          height: 100%;
        }

        /* Loading and error states */
        .loading-placeholder, .error-display {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 200px;
          color: #666;
        }

        .error-display {
          color: #d32f2f;
        }

        .error-display button {
          margin-top: 16px;
          padding: 8px 16px;
          background: #d32f2f;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        /* Responsive design */
        @media (max-width: 1024px) {
          .workspace-grid {
            grid-template-columns: 1fr;
            grid-template-rows: 400px 1fr;
          }
        }

        @media (max-width: 768px) {
          .workspace-header {
            flex-direction: column;
            gap: 12px;
            align-items: stretch;
          }
          
          .workspace-controls {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};

export default ProjectWorkspace;