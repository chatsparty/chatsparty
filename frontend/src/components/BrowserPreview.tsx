import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  RotateCcw, 
  Home, 
  ExternalLink, 
  Shield,
  MoreHorizontal,
  Plus,
  X
} from 'lucide-react';
import './BrowserPreview.css';

interface BrowserPreviewProps {
  projectId: string;
  initialUrl?: string;
  className?: string;
}

interface BrowserTab {
  id: string;
  title: string;
  url: string;
  isActive: boolean;
  iframeRef?: React.RefObject<HTMLIFrameElement | null>;
}

const BrowserPreview: React.FC<BrowserPreviewProps> = ({ 
  projectId, 
  initialUrl,
  className = '' 
}) => {
  const [addressBarUrl, setAddressBarUrl] = useState(initialUrl || '');
  const [isLoading, setIsLoading] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [isSecure, setIsSecure] = useState(true);
  const [, setPageTitle] = useState('Preview');
  const [tabs, setTabs] = useState<BrowserTab[]>([
    { id: '1', title: 'Preview', url: initialUrl || '', isActive: true, iframeRef: useRef<HTMLIFrameElement>(null) }
  ]);
  const [activeTabId, setActiveTabId] = useState('1');

  useEffect(() => {
    if (initialUrl) {
      setAddressBarUrl(initialUrl);
      setIsSecure(initialUrl.startsWith('https://') || initialUrl.startsWith('http://localhost'));
      
      // Update the first tab's URL if it's empty
      setTabs(prevTabs => prevTabs.map(tab => 
        tab.id === '1' && !tab.url ? { ...tab, url: initialUrl } : tab
      ));
    }
  }, [initialUrl]);

  const handleNavigation = (url: string) => {
    if (!url) return;
    
    setIsLoading(true);
    setAddressBarUrl(url);
    setIsSecure(url.startsWith('https://') || url.startsWith('http://localhost'));
    
    // Update current tab
    setTabs(tabs.map(tab => 
      tab.id === activeTabId 
        ? { ...tab, url, title: 'Loading...' }
        : tab
    ));
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
    const activeTab = tabs.find(tab => tab.id === activeTabId);
    if (activeTab?.iframeRef?.current) {
      try {
        activeTab.iframeRef.current.contentWindow?.history.back();
        setCanGoBack(false);
      } catch {
        console.warn('Cannot access iframe history');
      }
    }
  };

  const handleForward = () => {
    const activeTab = tabs.find(tab => tab.id === activeTabId);
    if (activeTab?.iframeRef?.current) {
      try {
        activeTab.iframeRef.current.contentWindow?.history.forward();
        setCanGoForward(false);
      } catch {
        console.warn('Cannot access iframe history');
      }
    }
  };

  const handleRefresh = () => {
    const activeTab = tabs.find(tab => tab.id === activeTabId);
    if (activeTab?.iframeRef?.current && activeTab.url) {
      activeTab.iframeRef.current.src = activeTab.url;
      setIsLoading(true);
    }
  };

  const handleHome = () => {
    if (initialUrl) {
      handleNavigation(initialUrl);
    }
  };

  const handleOpenInNewTab = () => {
    const activeTab = tabs.find(tab => tab.id === activeTabId);
    if (activeTab?.url) {
      window.open(activeTab.url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
    
    try {
      const activeTab = tabs.find(tab => tab.id === activeTabId);
      const iframe = activeTab?.iframeRef?.current;
      if (iframe?.contentDocument) {
        const title = iframe.contentDocument.title || 'Preview';
        setPageTitle(title);
        
        // Update current tab title
        setTabs(tabs.map(tab => 
          tab.id === activeTabId 
            ? { ...tab, title }
            : tab
        ));
      }
    } catch {
      // Cross-origin restrictions
      setPageTitle('Preview');
    }
  };

  const addNewTab = () => {
    const newTabId = Date.now().toString();
    const newTab: BrowserTab = {
      id: newTabId,
      title: 'New Tab',
      url: '',
      isActive: true,
      iframeRef: useRef<HTMLIFrameElement>(null)
    };
    
    setTabs([...tabs.map(t => ({ ...t, isActive: false })), newTab]);
    setActiveTabId(newTabId);
    setAddressBarUrl('');
  };

  const closeTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (tabs.length === 1) return; // Don't close last tab
    
    const newTabs = tabs.filter(t => t.id !== tabId);
    setTabs(newTabs);
    
    if (activeTabId === tabId) {
      const newActiveTab = newTabs[newTabs.length - 1];
      setActiveTabId(newActiveTab.id);
      setAddressBarUrl(newActiveTab.url);
    }
  };

  const switchTab = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;
    
    setTabs(tabs.map(t => ({ ...t, isActive: t.id === tabId })));
    setActiveTabId(tabId);
    setAddressBarUrl(tab.url);
    // Don't set currentUrl here to prevent iframe reload
  };

  return (
    <div className={`browser-preview ${className}`}>
      {/* Browser Chrome */}
      <div className="browser-chrome">
        {/* Tab Bar */}
        <div className="tab-bar">
          <div className="tabs-container">
            {tabs.map((tab) => (
              <div 
                key={tab.id}
                className={`browser-tab ${tab.isActive ? 'active' : ''}`}
                onClick={() => switchTab(tab.id)}
              >
                <span className="tab-title">{tab.title}</span>
                {tabs.length > 1 && (
                  <button 
                    className="tab-close"
                    onClick={(e) => closeTab(tab.id, e)}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button className="new-tab-btn" onClick={addNewTab}>
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Bar */}
        <div className="nav-bar">
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
            
            <button 
              className="nav-btn"
              onClick={handleHome}
              title="Home"
            >
              <Home className="w-4 h-4" />
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
                placeholder="Enter URL or search..."
                spellCheck={false}
              />
            </div>
          </form>

          {/* Browser Actions */}
          <div className="browser-actions">
            <button 
              className="action-btn"
              onClick={handleOpenInNewTab}
              title="Open in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
            
            <button className="action-btn" title="More options">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Browser Content */}
      <div className="browser-content">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`tab-content ${tab.isActive ? 'active' : 'hidden'}`}
            style={{ display: tab.isActive ? 'block' : 'none', height: '100%' }}
          >
            {tab.url ? (
              <iframe
                ref={tab.iframeRef}
                src={tab.url}
                className="browser-iframe"
                onLoad={() => {
                  if (tab.isActive) {
                    handleIframeLoad();
                  }
                }}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                title={`Preview for project ${projectId} - Tab ${tab.id}`}
              />
            ) : (
              <div className="empty-tab">
                <div className="empty-tab-content">
                  <Home className="w-16 h-16 text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">New Tab</h3>
                  <p className="text-gray-500 mb-6">Enter a URL in the address bar to get started</p>
                  {initialUrl && (
                    <button 
                      onClick={() => handleNavigation(initialUrl)}
                      className="quick-action-btn"
                    >
                      Go to Preview
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="loading-overlay">
            <div className="loading-spinner">
              <RotateCcw className="w-6 h-6 animate-spin text-blue-500" />
              <span className="ml-2 text-sm text-gray-600">Loading...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BrowserPreview;