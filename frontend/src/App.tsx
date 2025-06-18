import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
  Navigate,
} from "react-router-dom";
import { FaRobot, FaUsers, FaCog, FaSignOutAlt } from "react-icons/fa";
import { AgentManagerPage, MultiAgentChatPage, LandingPage } from "./pages";
import { ConnectionManagerPage } from "./pages/ConnectionManager/ConnectionManagerPage";
import { SettingsPage } from "./pages/Settings/SettingsPage";
import SharedConversationPage from "./pages/SharedConversation/SharedConversationPage";
import { ThemeToggle } from "./components/ThemeToggle";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AuthPage } from "./components/auth/AuthPage";
import { OAuthCallback } from "./components/auth/OAuthCallback";
import { Button } from "./components/ui/button";
import { useTracking } from "./hooks/useTracking";
import { useEffect, useRef } from "react";
import "./App.css";


const Layout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { trackPageView, trackNavigation, trackUserLogout } = useTracking();
  const previousLocationRef = useRef<string>('');

  useEffect(() => {
    const currentPath = location.pathname;
    const previousPath = previousLocationRef.current;
    
    // Track page view
    const getPageName = (path: string) => {
      if (path === '/agents') return 'agents';
      if (path === '/chat') return 'multi_agent_chat';
      if (path === '/settings') return 'settings';
      if (path === '/connections') return 'connections';
      if (path === '/') return 'landing';
      if (path.startsWith('/shared/conversation/')) return 'shared_conversation';
      return 'unknown';
    };
    
    trackPageView(getPageName(currentPath));
    
    // Track navigation if not the first load
    if (previousPath && previousPath !== currentPath) {
      trackNavigation(getPageName(previousPath), getPageName(currentPath));
    }
    
    previousLocationRef.current = currentPath;
  }, [location.pathname, trackPageView, trackNavigation]);

  const handleLogout = () => {
    trackUserLogout();
    logout();
  };

  // If user is not authenticated, render AuthPage without layout
  if (!user) {
    return <AuthPage />;
  }

  const tabs = [
    { path: "/agents", label: "Agents", icon: FaRobot },
    { path: "/chat", label: "Chat", icon: FaUsers },
    { path: "/settings", label: "Settings", icon: FaCog },
  ];

  return (
    <div className="App h-screen w-screen bg-background overflow-hidden">
      <div className="flex flex-col h-full">
        <div className="bg-card border-b border-border px-6 py-4 shadow-sm flex-shrink-0">
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
                    className={`flex items-center gap-2 text-sm font-medium transition-colors duration-200 hover:text-primary cursor-pointer ${
                      location.pathname === tab.path
                        ? "text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    <tab.icon className="text-sm" />
                    <span>{tab.label}</span>
                  </Link>
                ))}
              </nav>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  {user?.email}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="flex items-center gap-2"
                >
                  <FaSignOutAlt className="text-xs" />
                  Sign Out
                </Button>
                <ThemeToggle />
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

  if (location.pathname === "/auth/callback/google" || location.pathname === "/auth/callback/github") {
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
