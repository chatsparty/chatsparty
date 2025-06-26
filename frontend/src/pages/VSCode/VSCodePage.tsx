import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Loader2, 
  AlertCircle, 
  RefreshCw, 
  Power,
  Monitor
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { vscodeApi, type VSCodeSetupResult } from '../../services/vscodeApi';
import { projectApi } from '../../services/projectApi';
import type { Project } from '../../types/project';

type SetupStatus = 'idle' | 'checking' | 'setting-up' | 'ready' | 'error';

export const VSCodePage: React.FC = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [project, setProject] = useState<Project | null>(null);
  const [status, setStatus] = useState<SetupStatus>('idle');
  const [vscodeUrl, setVscodeUrl] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [setupProgress, setSetupProgress] = useState<string>('');

  useEffect(() => {
    if (projectId) {
      loadProject();
      checkVSCodeStatus();
    }
  }, [projectId]);

  const loadProject = async () => {
    if (!projectId) return;
    
    try {
      const projectData = await projectApi.getProject(projectId);
      setProject(projectData);
    } catch (error) {
      console.error('Failed to load project:', error);
      setError('Failed to load project details');
    }
  };

  const checkVSCodeStatus = async () => {
    if (!projectId) return;
    
    setStatus('checking');
    setSetupProgress('Checking VS Code server status...');

    try {
      const statusResult = await vscodeApi.getVSCodeStatus(projectId);
      
      if (statusResult.running && statusResult.url) {
        // Verify the server is actually accessible
        const isHealthy = await vscodeApi.healthCheck(statusResult.url);
        
        if (isHealthy) {
          setVscodeUrl(statusResult.url);
          setStatus('ready');
          setSetupProgress('');
        } else {
          // Server exists but not responding, try to set up again
          await setupVSCode();
        }
      } else {
        // No server running, set up new one
        await setupVSCode();
      }
    } catch (error) {
      console.error('Failed to check VS Code status:', error);
      setError(error instanceof Error ? error.message : 'Failed to check VS Code status');
      setStatus('error');
    }
  };

  const setupVSCode = async () => {
    if (!projectId) return;

    setStatus('setting-up');
    setError('');
    
    try {
      setSetupProgress('Installing VS Code server in container...');
      
      // Setup VS Code server
      const result: VSCodeSetupResult = await vscodeApi.setupVSCode(projectId);
      
      if (result.success) {
        setSetupProgress('VS Code server installed, waiting for startup...');
        
        // Wait for VS Code to be ready
        const maxAttempts = 60; // 60 seconds timeout
        for (let i = 0; i < maxAttempts; i++) {
          setSetupProgress(`Waiting for VS Code to start... (${i + 1}/${maxAttempts})`);
          
          const isHealthy = await vscodeApi.healthCheck(result.ide.url);
          if (isHealthy) {
            setVscodeUrl(result.ide.url);
            setStatus('ready');
            setSetupProgress('');
            return;
          }
          
          // Wait 1 second before next attempt
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        throw new Error('VS Code server failed to start within timeout period');
      } else {
        throw new Error('Failed to setup VS Code server');
      }
    } catch (error) {
      console.error('VS Code setup failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to setup VS Code');
      setStatus('error');
      setSetupProgress('');
    }
  };

  const handleRetry = () => {
    setError('');
    checkVSCodeStatus();
  };

  const handleStop = async () => {
    if (!projectId) return;
    
    try {
      await vscodeApi.stopVSCode(projectId);
      setStatus('idle');
      setVscodeUrl('');
      setSetupProgress('');
    } catch (error) {
      console.error('Failed to stop VS Code:', error);
      setError('Failed to stop VS Code server');
    }
  };

  const handleBackToProject = () => {
    navigate('/projects');
  };

  if (!projectId) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Invalid Project</h2>
          <p className="text-muted-foreground mb-4">No project ID provided</p>
          <Button onClick={() => navigate('/projects')}>
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-3 py-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleBackToProject}
              className="gap-1 h-7 px-2"
            >
              <ArrowLeft className="w-3 h-3" />
              Back
            </Button>
            
            <div className="h-4 w-px bg-border" />
            
            <div className="flex items-center gap-1.5">
              <Monitor className="w-4 h-4 text-blue-500" />
              <div>
                <h1 className="text-sm font-medium">Development Environment</h1>
                {project && (
                  <p className="text-xs text-muted-foreground">{project.name}</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {status === 'ready' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleStop}
                className="gap-1 h-7 px-2 text-red-600 hover:text-red-700"
              >
                <Power className="w-3 h-3" />
                Stop
              </Button>
            )}
            
            {(status === 'error' || status === 'idle') && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                className="gap-1 h-7 px-2"
              >
                <RefreshCw className="w-3 h-3" />
                Retry
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex">
        {status === 'ready' && vscodeUrl ? (
          <div className="flex-1">
            <iframe
              src={vscodeUrl}
              className="w-full h-full border-0"
              sandbox="allow-same-origin allow-scripts allow-forms allow-downloads allow-modals allow-popups"
              allow="clipboard-read; clipboard-write; microphone; camera"
              title="VS Code IDE"
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              {status === 'checking' && (
                <>
                  <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold mb-2">Checking VS Code Status</h2>
                  <p className="text-muted-foreground">{setupProgress}</p>
                </>
              )}

              {status === 'setting-up' && (
                <>
                  <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold mb-2">Setting Up VS Code</h2>
                  <p className="text-muted-foreground mb-4">{setupProgress}</p>
                  <div className="text-sm text-muted-foreground">
                    This may take up to 60 seconds on first setup...
                  </div>
                </>
              )}

              {status === 'error' && (
                <>
                  <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold mb-2">Setup Failed</h2>
                  <p className="text-red-600 mb-4">{error}</p>
                  <div className="flex gap-2 justify-center">
                    <Button onClick={handleRetry} className="gap-2">
                      <RefreshCw className="w-4 h-4" />
                      Try Again
                    </Button>
                    <Button variant="outline" onClick={handleBackToProject}>
                      Back to Project
                    </Button>
                  </div>
                </>
              )}

              {status === 'idle' && (
                <>
                  <Monitor className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold mb-2">VS Code IDE</h2>
                  <p className="text-muted-foreground mb-4">
                    Launch a full VS Code environment for your project
                  </p>
                  <Button onClick={checkVSCodeStatus} className="gap-2">
                    <Power className="w-4 h-4" />
                    Start VS Code
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};