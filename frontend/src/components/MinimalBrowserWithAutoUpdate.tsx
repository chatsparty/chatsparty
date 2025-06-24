import React, { useState, useRef, useEffect } from "react";
import {
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  ExternalLink,
  Shield,
  Wifi,
  WifiOff,
} from "lucide-react";
import { io, Socket } from "socket.io-client";
import "./MinimalBrowser.css";

interface MinimalBrowserProps {
  projectId: string;
  initialUrl?: string;
  className?: string;
}

interface PortInfo {
  port: number;
  process: string;
  host_port: number;
  url: string;
}

interface PortUpdateData {
  project_id: string;
  active_ports: Record<number, PortInfo>;
  preview_url: string | null;
  preview_port: number | null;
  vm_status: string;
  timestamp?: string;
}

const MinimalBrowserWithAutoUpdate: React.FC<MinimalBrowserProps> = ({
  projectId,
  initialUrl,
  className = "",
}) => {
  const [currentUrl, setCurrentUrl] = useState(initialUrl || "");
  const [addressBarUrl, setAddressBarUrl] = useState(initialUrl || "");
  const [isLoading, setIsLoading] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [isSecure, setIsSecure] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [activePorts, setActivePorts] = useState<Record<number, PortInfo>>({});
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      console.warn(
        "[MinimalBrowser] No auth token found, skipping WebSocket connection"
      );
      return;
    }

    console.log(
      "[MinimalBrowser] Connecting to WebSocket for port monitoring..."
    );
    const newSocket = io("http://localhost:8000", {
      auth: {
        token: token,
      },
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
    });

    newSocket.on("connect", () => {
      console.log(
        "[MinimalBrowser] WebSocket connected, joining project room..."
      );
      setIsSocketConnected(true);
      newSocket.emit("join_project", { project_id: projectId });
    });

    newSocket.on("joined_project", (data) => {
      console.log("[MinimalBrowser] Joined project room:", data);
      newSocket.emit("request_port_update", { project_id: projectId });
    });

    newSocket.on("port_update", (data: PortUpdateData) => {
      console.log("[MinimalBrowser] Port update received:", data);

      if (data.project_id !== projectId) {
        return;
      }

      setActivePorts(data.active_ports || {});
      setLastUpdate(new Date());

      if (data.preview_url && data.preview_url !== currentUrl) {
        console.log(
          `[MinimalBrowser] Auto-updating preview URL: ${data.preview_url}`
        );
        handleNavigation(data.preview_url);

        const port = data.preview_port;
        if (port !== null) {
          const portInfo = data.active_ports[port];
          if (portInfo) {
            console.log(
              `[MinimalBrowser] Service detected: ${portInfo.process} on port ${port}`
            );
          }
        }
      }
    });

    newSocket.on("error", (error) => {
      console.error("[MinimalBrowser] WebSocket error:", error);
    });

    newSocket.on("disconnect", () => {
      console.log("[MinimalBrowser] WebSocket disconnected");
      setIsSocketConnected(false);
    });

    setSocket(newSocket);

    return () => {
      console.log("[MinimalBrowser] Cleaning up WebSocket connection...");
      newSocket.emit("leave_project", { project_id: projectId });
      newSocket.close();
    };
  }, [projectId]);

  useEffect(() => {
    if (initialUrl) {
      setCurrentUrl(initialUrl);
      setAddressBarUrl(initialUrl);
      setIsSecure(
        initialUrl.startsWith("https://") ||
          initialUrl.startsWith("http://localhost")
      );
    }
  }, [initialUrl]);

  const handleNavigation = (url: string) => {
    if (!url) return;

    setIsLoading(true);
    setCurrentUrl(url);
    setAddressBarUrl(url);
    setIsSecure(
      url.startsWith("https://") || url.startsWith("http://localhost")
    );
  };

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let url = addressBarUrl.trim();

    if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
      url = url.startsWith("localhost") ? `http://${url}` : `https://${url}`;
    }

    handleNavigation(url);
  };

  const handleBack = () => {
    if (iframeRef.current) {
      try {
        iframeRef.current.contentWindow?.history.back();
        setCanGoBack(false);
      } catch (e) {
        console.warn("Cannot access iframe history");
      }
    }
  };

  const handleForward = () => {
    if (iframeRef.current) {
      try {
        iframeRef.current.contentWindow?.history.forward();
        setCanGoForward(false);
      } catch (e) {
        console.warn("Cannot access iframe history");
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
      window.open(currentUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleRequestPortUpdate = () => {
    if (socket && isSocketConnected) {
      socket.emit("request_port_update", { project_id: projectId });
    }
  };

  return (
    <div className={`minimal-browser ${className}`}>
      <div className="minimal-nav-bar">
        <div className="nav-controls">
          <button
            className={`nav-btn ${!canGoBack ? "disabled" : ""}`}
            onClick={handleBack}
            disabled={!canGoBack}
            title="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <button
            className={`nav-btn ${!canGoForward ? "disabled" : ""}`}
            onClick={handleForward}
            disabled={!canGoForward}
            title="Forward"
          >
            <ArrowRight className="w-4 h-4" />
          </button>

          <button className="nav-btn" onClick={handleRefresh} title="Refresh">
            <RotateCcw
              className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </button>
        </div>

        <form onSubmit={handleAddressSubmit} className="address-bar">
          <div className="address-input-container">
            <div className="security-indicator">
              <Shield
                className={`w-4 h-4 ${
                  isSecure ? "text-green-500" : "text-gray-400"
                }`}
              />
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

        <div className="flex items-center gap-2">
          <button
            className={`nav-btn ${
              isSocketConnected ? "text-green-500" : "text-gray-400"
            }`}
            onClick={handleRequestPortUpdate}
            title={
              isSocketConnected
                ? "Connected - Click to refresh ports"
                : "Not connected"
            }
          >
            {isSocketConnected ? (
              <Wifi className="w-4 h-4" />
            ) : (
              <WifiOff className="w-4 h-4" />
            )}
          </button>

          <button
            className="external-btn"
            onClick={handleOpenInNewTab}
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>

      {Object.keys(activePorts).length > 0 && (
        <div className="active-ports-bar">
          <span className="text-xs text-gray-500">Active services:</span>
          {Object.entries(activePorts).map(([port, info]) => (
            <button
              key={port}
              className="port-badge"
              onClick={() => handleNavigation(info.url)}
              title={`${info.process} on port ${port}`}
            >
              {info.process}:{port}
            </button>
          ))}
          {lastUpdate && (
            <span className="text-xs text-gray-400 ml-auto">
              Updated: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>
      )}

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
              <p className="text-gray-500 mb-4">
                {isSocketConnected
                  ? "Waiting for a service to start..."
                  : "Enter a URL to start previewing"}
              </p>
              {initialUrl && (
                <button
                  onClick={() => handleNavigation(initialUrl)}
                  className="preview-btn"
                >
                  Load Preview
                </button>
              )}
              {isSocketConnected && Object.keys(activePorts).length === 0 && (
                <p className="text-xs text-gray-400 mt-4">
                  Run <code>npm start</code> or start your dev server to see the
                  preview
                </p>
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

export default MinimalBrowserWithAutoUpdate;
