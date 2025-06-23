import React, { useEffect, useRef, useState } from 'react';
import { useTerminal } from '../../../hooks/useTerminal';
import '@xterm/xterm/css/xterm.css';

interface TerminalPanelProps {
  projectId: string;
}

export const TerminalPanel: React.FC<TerminalPanelProps> = ({ projectId }) => {
  const {
    sessions,
    activeSession,
    setActiveSession,
    isCreatingSession,
    error,
    createTerminalSession,
    closeTerminalSession,
    createTerminalInstance,
    fitTerminal,
    isConnected
  } = useTerminal({ projectId, autoCreate: true });
  
  const terminalRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [terminalInstances, setTerminalInstances] = useState<Map<string, any>>(new Map());
  
  // Create terminal instances when sessions are available
  useEffect(() => {
    sessions.forEach(session => {
      if (session.status === 'active' && !terminalInstances.has(session.session_id)) {
        const container = terminalRefs.current.get(session.session_id);
        if (container) {
          const terminal = createTerminalInstance(session.session_id, container);
          setTerminalInstances(prev => new Map(prev).set(session.session_id, terminal));
        }
      }
    });
  }, [sessions, createTerminalInstance, terminalInstances]);
  
  // Auto-fit terminal when panel resizes
  useEffect(() => {
    const resizeHandler = () => {
      if (activeSession) {
        fitTerminal(activeSession.session_id);
      }
    };
    
    window.addEventListener('resize', resizeHandler);
    return () => window.removeEventListener('resize', resizeHandler);
  }, [activeSession, fitTerminal]);
  
  const handleCreateTerminal = async () => {
    await createTerminalSession(24, 80);
  };
  
  const handleCloseTerminal = async (sessionId: string) => {
    await closeTerminalSession(sessionId);
  };
  
  const setTerminalRef = (sessionId: string, ref: HTMLDivElement | null) => {
    if (ref) {
      terminalRefs.current.set(sessionId, ref);
    } else {
      terminalRefs.current.delete(sessionId);
    }
  };
  
  if (!isConnected) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center">
          <div className="text-red-400 mb-2">⚠️ WebSocket Disconnected</div>
          <div className="text-sm text-slate-400">Attempting to reconnect...</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col bg-slate-900">
      {/* Terminal Header */}
      <div className="flex-shrink-0 bg-slate-800 border-b border-slate-700 p-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-white font-medium">Terminal</span>
            {sessions.length > 0 && (
              <span className="text-slate-400 text-sm">
                {sessions.length} session{sessions.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCreateTerminal}
              disabled={isCreatingSession}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreatingSession ? 'Creating...' : '+ New Terminal'}
            </button>
          </div>
        </div>
        
        {/* Terminal Tabs */}
        {sessions.length > 1 && (
          <div className="flex mt-2 space-x-1">
            {sessions.map((session, index) => (
              <button
                key={session.session_id}
                onClick={() => setActiveSession(session)}
                className={`px-3 py-1 text-sm rounded-t border-b-2 transition-colors ${
                  activeSession?.session_id === session.session_id
                    ? 'bg-slate-700 text-white border-emerald-500'
                    : 'bg-slate-800 text-slate-400 border-transparent hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span>Terminal {index + 1}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCloseTerminal(session.session_id);
                  }}
                  className="ml-2 text-slate-500 hover:text-white"
                >
                  ×
                </button>
              </button>
            ))}
          </div>
        )}
        
        {/* Error Display */}
        {error && (
          <div className="mt-2 p-2 bg-red-900 border border-red-700 rounded text-red-200 text-sm">
            {error}
          </div>
        )}
      </div>
      
      {/* Terminal Content */}
      <div className="flex-1 relative">
        {sessions.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-400">
            <div className="text-center">
              <div className="text-6xl mb-4">💻</div>
              <div className="text-lg mb-2">No Terminal Sessions</div>
              <div className="text-sm">Click "New Terminal" to get started</div>
            </div>
          </div>
        ) : (
          sessions.map((session) => (
            <div
              key={session.session_id}
              className={`absolute inset-0 ${
                activeSession?.session_id === session.session_id ? 'block' : 'hidden'
              }`}
            >
              {session.status === 'active' ? (
                <div
                  ref={(ref) => setTerminalRef(session.session_id, ref)}
                  className="w-full h-full"
                />
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400">
                  <div className="text-center">
                    <div className="text-4xl mb-2">⏳</div>
                    <div className="text-lg">
                      Terminal {session.status === 'creating' ? 'Starting...' : 'Inactive'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};