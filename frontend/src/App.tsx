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
import Avatar from "boring-avatars";
import { useTranslation } from "react-i18next";
import { getDirection } from "./i18n/config";
import { LanguageSwitcher } from "./components/LanguageSwitcher";
import { PROJECTS_ENABLED } from "./config/features";
import {
  AgentManagerPage,
  LandingPage,
  MultiAgentChatPage,
  ProjectsPage,
  CreateProjectPage,
  ProjectDetailsPage,
  VSCodePage,
} from "./pages";
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
  const { t, i18n } = useTranslation();

  // Apply language direction to HTML element
  useEffect(() => {
    const direction = getDirection(i18n.language);
    document.documentElement.dir = direction;
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  useEffect(() => {
    const currentPath = location.pathname;
    const previousPath = previousLocationRef.current;

    const getPageName = (path: string) => {
      if (path === "/projects") return "projects";
      if (path.includes("/vscode")) return "vscode_ide";
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

  if (!user) {
    return <AuthPage />;
  }

  const tabs = [
    ...(PROJECTS_ENABLED ? [{ path: "/projects", label: t("navigation.projects") }] : []),
    { path: "/agents", label: t("navigation.agents") },
    { path: "/chat", label: t("navigation.chat") },
    { path: "/settings", label: t("navigation.settings") },
  ];

  return (
    <div className="App h-screen w-screen bg-background overflow-hidden">
      <div className="flex flex-col h-full">
        <div className="bg-card border-b border-border px-4 md:px-6 py-2 shadow-sm flex-shrink-0">
          <div className="flex items-center justify-between">
            <Link
              to="/"
              className="flex items-center gap-2 text-lg font-semibold text-foreground hover:text-primary transition-colors cursor-pointer"
            >
              <Avatar
                size={28}
                name="ChatsParty"
                variant="beam"
                colors={["#000000", "#6B46C1", "#EC4899", "#F97316", "#FCD34D"]}
              />
              <span className="hidden sm:block">{t("common.appName")}</span>
            </Link>
            <div className="flex items-center">
              <nav className="hidden md:flex items-center gap-4 lg:gap-8 me-4 lg:me-6">
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
              <div className="flex items-center gap-2 md:gap-4">
                <div className="hidden sm:block">
                  <LanguageSwitcher />
                </div>
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <FaUser className="w-3 h-3 text-primary" />
                    </div>
                    <span className="hidden md:block text-sm font-medium text-foreground">
                      {user?.email?.split("@")[0] || t("navigation.userMenu")}
                    </span>
                    <ChevronDown className="w-3 h-3 text-muted-foreground" />
                  </button>

                  {isUserMenuOpen && (
                    <div className="absolute end-0 top-full mt-1 w-48 bg-card border border-border rounded-md shadow-lg z-50">
                      <div className="py-1">
                        <div className="px-3 py-1.5 text-xs text-muted-foreground border-b border-border">
                          {user?.email}
                        </div>
                        <div className="md:hidden border-b border-border">
                          {tabs.map((tab) => (
                            <Link
                              key={tab.path}
                              to={tab.path}
                              onClick={() => setIsUserMenuOpen(false)}
                              className={`flex items-center px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
                                location.pathname === tab.path
                                  ? "text-primary font-medium"
                                  : "text-foreground"
                              }`}
                            >
                              {tab.label}
                            </Link>
                          ))}
                        </div>
                        <Link
                          to="/settings"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm text-foreground hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                          <FaCog className="w-3 h-3" />
                          {t("navigation.settings")}
                        </Link>
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            handleLogout();
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm text-foreground hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors w-full text-start"
                        >
                          <FaSignOutAlt className="w-3 h-3" />
                          {t("navigation.signOut")}
                        </button>
                        <div className="border-t border-border mt-1 pt-1">
                          <div className="px-3 py-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-foreground">{t("common.theme")}</span>
                              <ThemeToggle />
                            </div>
                          </div>
                          <div className="sm:hidden border-t border-border pt-1">
                            <div className="px-3 py-1.5">
                              <LanguageSwitcher />
                            </div>
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
            {PROJECTS_ENABLED && (
              <>
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="/projects/new" element={<CreateProjectPage />} />
              </>
            )}
            <Route path="/agents" element={<AgentManagerPage />} />
            <Route path="/connections" element={<ConnectionManagerPage />} />
            <Route path="/chat" element={<MultiAgentChatPage />} />
            <Route path="/chat/:conversationId" element={<MultiAgentChatPage />} />
            <Route
              path="/settings"
              element={<Navigate to="/settings/general" replace />}
            />
            <Route path="/settings/general" element={<SettingsPage />} />
            <Route path="/settings/connections" element={<SettingsPage />} />
            <Route
              path="/settings/voice-connections"
              element={<SettingsPage />}
            />
            <Route path="/settings/credits" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to={PROJECTS_ENABLED ? "/projects" : "/agents"} replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

const MainApp = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  if (PROJECTS_ENABLED && location.pathname === "/projects/new") {
    return (
      <div className="h-screen w-screen bg-background">
        <CreateProjectPage />
      </div>
    );
  }

  if (
    PROJECTS_ENABLED &&
    location.pathname.startsWith("/projects/") &&
    location.pathname !== "/projects"
  ) {
    return (
      <div className="h-screen w-screen bg-background">
        <Routes>
          <Route path="/projects/:projectId" element={<ProjectDetailsPage />} />
          <Route path="/projects/:id/vscode" element={<VSCodePage />} />
        </Routes>
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
    // If user is authenticated, redirect to main app
    if (user) {
      return <Navigate to={PROJECTS_ENABLED ? "/projects" : "/agents"} replace />;
    }
    // If not authenticated, show landing page
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
