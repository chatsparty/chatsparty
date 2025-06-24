import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  RotateCcw, 
  ExternalLink, 
  Shield
} from 'lucide-react';
import './MinimalBrowser.css';

interface MinimalBrowserProps {
  projectId: string;
  initialUrl?: string;
  className?: string;
}

const MinimalBrowser: React.FC<MinimalBrowserProps> = ({ 
  projectId, 
  initialUrl,
  className = '' 
}) => {
  const [currentUrl, setCurrentUrl] = useState(initialUrl || '');
  const [addressBarUrl, setAddressBarUrl] = useState(initialUrl || '');
  const [isLoading, setIsLoading] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [isSecure, setIsSecure] = useState(true);
  
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (initialUrl) {
      setCurrentUrl(initialUrl);
      setAddressBarUrl(initialUrl);
      setIsSecure(initialUrl.startsWith('https://') || initialUrl.startsWith('http://localhost'));
    }
  }, [initialUrl]);

  const handleNavigation = (url: string) => {
    if (!url) return;
    
    setIsLoading(true);
    setCurrentUrl(url);
    setAddressBarUrl(url);
    setIsSecure(url.startsWith('https://') || url.startsWith('http://localhost'));
  };

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let url = addressBarUrl.trim();
    
    // Add protocol if missing
    if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
      url = url.startsWith('localhost') ? `http://${url}` : `https://${url}`;
    }
    
    handleNavigation(url);
  };

  const handleBack = () => {
    if (iframeRef.current) {
      try {
        iframeRef.current.contentWindow?.history.back();
        setCanGoBack(false);
      } catch {
        console.warn('Cannot access iframe history');
      }
    }
  };

  const handleForward = () => {
    if (iframeRef.current) {
      try {
        iframeRef.current.contentWindow?.history.forward();
        setCanGoForward(false);
      } catch {
        console.warn('Cannot access iframe history');
      }
    }
  };

  const handleRefresh = () => {
    if (iframeRef.current) {
      iframeRef.current.src = currentUrl;
      setIsLoading(true);
    }
  };

  const handleOpenInNewTab = () => {
    if (currentUrl) {
      window.open(currentUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  return (
    <div className={`minimal-browser ${className}`}>
      {/* Minimal Navigation Bar */}
      <div className="minimal-nav-bar">
        <div className="nav-controls">
          <button 
            className={`nav-btn ${!canGoBack ? 'disabled' : ''}`}
            onClick={handleBack}
            disabled={!canGoBack}
            title="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          
          <button 
            className={`nav-btn ${!canGoForward ? 'disabled' : ''}`}
            onClick={handleForward}
            disabled={!canGoForward}
            title="Forward"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          
          <button 
            className="nav-btn"
            onClick={handleRefresh}
            title="Refresh"
          >
            <RotateCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Address Bar */}
        <form onSubmit={handleAddressSubmit} className="address-bar">
          <div className="address-input-container">
            <div className="security-indicator">
              <Shield className={`w-4 h-4 ${isSecure ? 'text-green-500' : 'text-gray-400'}`} />
            </div>
            
            <input
              type="text"
              value={addressBarUrl}
              onChange={(e) => setAddressBarUrl(e.target.value)}
              className="address-input"
              placeholder="Enter URL..."
              spellCheck={false}
            />
          </div>
        </form>

        {/* External Link Button */}
        <button 
          className="external-btn"
          onClick={handleOpenInNewTab}
          title="Open in new tab"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>

      {/* Browser Content */}
      <div className="browser-content">
        {currentUrl ? (
          <iframe
            ref={iframeRef}
            src={currentUrl}
            className="browser-iframe"
            onLoad={handleIframeLoad}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            title={`Preview for project ${projectId}`}
          />
        ) : (
          <div className="empty-state">
            <div className="empty-content">
              <p className="text-gray-500 mb-4">Enter a URL to start previewing</p>
              {initialUrl && (
                <button 
                  onClick={() => handleNavigation(initialUrl)}
                  className="preview-btn"
                >
                  Load Preview
                </button>
              )}
            </div>
          </div>
        )}
        
        {isLoading && (
          <div className="loading-overlay">
            <RotateCcw className="w-5 h-5 animate-spin text-blue-500" />
          </div>
        )}
      </div>
    </div>
  );
};

export default MinimalBrowser;