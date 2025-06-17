import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom'
import { FaRobot, FaUsers, FaPlug, FaSignOutAlt } from 'react-icons/fa'
import { AgentManagerPage, MultiAgentChatPage, LandingPage } from './pages'
import { ConnectionManagerPage } from './pages/ConnectionManager/ConnectionManagerPage'
import { ThemeToggle } from './components/ThemeToggle'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { AuthPage } from './components/auth/AuthPage'
import { Button } from './components/ui/button'
import './App.css'

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }
  
  if (!user) {
    return <AuthPage />
  }
  
  return <>{children}</>
}

const Layout = () => {
  const { user, logout } = useAuth()
  const location = useLocation()

  const tabs = [
    { path: '/agents', label: 'Agents', icon: FaRobot },
    { path: '/connections', label: 'Connections', icon: FaPlug },
    { path: '/chat', label: 'Chat', icon: FaUsers }
  ]

  return (
    <div className="App h-screen w-screen bg-background overflow-hidden">
      <div className="flex flex-col h-full">
        {/* Header Menu */}
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
                  onClick={logout}
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

        {/* Content Area */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <Routes>
            <Route path="/agents" element={
              <ProtectedRoute>
                <AgentManagerPage />
              </ProtectedRoute>
            } />
            <Route path="/connections" element={
              <ProtectedRoute>
                <ConnectionManagerPage />
              </ProtectedRoute>
            } />
            <Route path="/chat" element={
              <ProtectedRoute>
                <MultiAgentChatPage />
              </ProtectedRoute>
            } />
            <Route path="*" element={<Navigate to="/agents" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}

const MainApp = () => {
  const { loading } = useAuth()
  const location = useLocation()

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Landing page is public - no authentication required
  if (location.pathname === '/') {
    return (
      <div className="App h-screen w-screen bg-background overflow-auto">
        <LandingPage onGetStarted={() => {}} />
      </div>
    )
  }

  return <Layout />
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </Router>
  )
}

export default App
