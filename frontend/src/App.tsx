import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FaCog, FaSignOutAlt, FaUser } from "react-icons/fa";
import {
  Link,
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
  useLocation,
} from "react-router-dom";
import "./App.css";
import { ThemeToggle } from "./components/ThemeToggle";
import { AuthPage } from "./components/auth/AuthPage";
import { OAuthCallback } from "./components/auth/OAuthCallback";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { useTracking } from "./hooks/useTracking";
import { AgentManagerPage, LandingPage, MultiAgentChatPage } from "./pages";
import { ConnectionManagerPage } from "./pages/ConnectionManager/ConnectionManagerPage";
import { SettingsPage } from "./pages/Settings/SettingsPage";
import SharedConversationPage from "./pages/SharedConversation/SharedConversationPage";

const Layout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { trackPageView, trackNavigation, trackUserLogout } = useTracking();
  const previousLocationRef = useRef<string>("");
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentPath = location.pathname;
    const previousPath = previousLocationRef.current;

    // Track page view
    const getPageName = (path: string) => {
      if (path === "/agents") return "agents";
      if (path === "/chat") return "multi_agent_chat";
      if (path === "/settings") return "settings";
      if (path === "/connections") return "connections";
      if (path === "/") return "landing";
      if (path.startsWith("/shared/conversation/"))
        return "shared_conversation";
      return "unknown";
    };

    trackPageView(getPageName(currentPath));

    // Track navigation if not the first load
    if (previousPath && previousPath !== currentPath) {
      trackNavigation(getPageName(previousPath), getPageName(currentPath));
    }

    previousLocationRef.current = currentPath;
  }, [location.pathname, trackPageView, trackNavigation]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    trackUserLogout();
    logout();
  };

  // If user is not authenticated, render AuthPage without layout
  if (!user) {
    return <AuthPage />;
  }

  const tabs = [
    { path: "/agents", label: "Agents" },
    { path: "/chat", label: "Chat" },
    { path: "/settings", label: "Settings" },
  ];

  return (
    <div className="App h-screen w-screen bg-background overflow-hidden">
      <div className="flex flex-col h-full">
        <div className="bg-card border-b border-border px-6 py-2 shadow-sm flex-shrink-0">
          <div className="flex items-center justify-between">
            <Link
              to="/"
              className="text-lg font-semibold text-foreground hover:text-primary transition-colors cursor-pointer"
            >
              ChatsParty
            </Link>
            <div className="flex items-center">
              <nav className="flex items-center gap-8 mr-6">
                {tabs.map((tab) => (
                  <Link
                    key={tab.path}
                    to={tab.path}
                    className={`rounded-md text-sm font-medium transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800 hover:px-3 hover:py-2 cursor-pointer ${
                      location.pathname === tab.path
                        ? "text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    <span>{tab.label}</span>
                  </Link>
                ))}
              </nav>
              <div className="flex items-center gap-4">
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <FaUser className="w-3 h-3 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {user?.email?.split("@")[0] || "User"}
                    </span>
                    <ChevronDown className="w-3 h-3 text-muted-foreground" />
                  </button>

                  {isUserMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-40 bg-card border border-border rounded-md shadow-lg z-50">
                      <div className="py-1">
                        <div className="px-3 py-1.5 text-xs text-muted-foreground border-b border-border">
                          {user?.email}
                        </div>
                        <Link
                          to="/settings"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm text-foreground hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                          <FaCog className="w-3 h-3" />
                          Settings
                        </Link>
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            handleLogout();
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm text-foreground hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors w-full text-left"
                        >
                          <FaSignOutAlt className="w-3 h-3" />
                          Sign Out
                        </button>
                        <div className="border-t border-border mt-1 pt-1">
                          <div className="px-3 py-1.5">
                            <ThemeToggle />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          <Routes>
            <Route path="/agents" element={<AgentManagerPage />} />
            <Route path="/connections" element={<ConnectionManagerPage />} />
            <Route path="/chat" element={<MultiAgentChatPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/agents" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

const MainApp = () => {
  const { loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (location.pathname.startsWith("/shared/conversation/")) {
    console.log(
      "Rendering SharedConversationPage for path:",
      location.pathname
    );
    return <SharedConversationPage />;
  }

  if (
    location.pathname === "/auth/callback/google" ||
    location.pathname === "/auth/callback/github"
  ) {
    return <OAuthCallback />;
  }

  if (location.pathname === "/") {
    return (
      <div className="App h-screen w-screen bg-background overflow-auto">
        <LandingPage onGetStarted={() => {}} />
      </div>
    );
  }

  return <Layout />;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </Router>
  );
}

export default App;
