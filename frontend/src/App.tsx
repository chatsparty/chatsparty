import { useState } from 'react'
import { FaRobot, FaUsers, FaPlug, FaSignOutAlt } from 'react-icons/fa'
import { AgentManagerPage, MultiAgentChatPage, LandingPage } from './pages'
import { ConnectionManagerPage } from './pages/ConnectionManager/ConnectionManagerPage'
import { ThemeToggle } from './components/ThemeToggle'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { AuthPage } from './components/auth/AuthPage'
import { Button } from './components/ui/button'
import './App.css'

const MainApp = () => {
  const [activeTab, setActiveTab] = useState<'landing' | 'agents' | 'connections' | 'multi-chat'>('landing')
  const { user, logout, loading } = useAuth()

  const tabs = [
    { id: 'agents', label: 'Agents', icon: FaRobot },
    { id: 'connections', label: 'Connections', icon: FaPlug },
    { id: 'multi-chat', label: 'Chat', icon: FaUsers }
  ]

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
  if (activeTab === 'landing') {
    return (
      <div className="App h-screen w-screen bg-background overflow-auto">
        <LandingPage onGetStarted={() => setActiveTab('agents')} />
      </div>
    )
  }

  // Protected features require authentication
  if (!user) {
    return <AuthPage />
  }

  return (
    <div className="App h-screen w-screen bg-background overflow-hidden">
      <div className="flex flex-col h-full">
        {/* Header Menu */}
        <div className="bg-card border-b border-border px-6 py-4 shadow-sm flex-shrink-0">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => setActiveTab('landing')}
              className="text-lg font-semibold text-foreground hover:text-primary transition-colors cursor-pointer"
            >
              ChatsParty
            </button>
            <div className="flex items-center">
              <nav className="flex items-center gap-8 mr-6">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    className={`flex items-center gap-2 text-sm font-medium transition-colors duration-200 hover:text-primary cursor-pointer ${
                      activeTab === tab.id 
                        ? "text-primary" 
                        : "text-muted-foreground"
                    }`}
                  >
                    <tab.icon className="text-sm" />
                    <span>{tab.label}</span>
                  </button>
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
          {activeTab === 'agents' && <AgentManagerPage onNavigateToConnections={() => setActiveTab('connections')} />}
          {activeTab === 'connections' && <ConnectionManagerPage />}
          {activeTab === 'multi-chat' && <MultiAgentChatPage />}
        </div>
      </div>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  )
}

export default App
