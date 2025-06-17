import { useState } from 'react'
import { FaRobot, FaUsers, FaPlug } from 'react-icons/fa'
import { AgentManagerPage, MultiAgentChatPage, LandingPage } from './pages'
import { ConnectionManagerPage } from './pages/ConnectionManager/ConnectionManagerPage'
import { ThemeToggle } from './components/ThemeToggle'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState<'landing' | 'agents' | 'connections' | 'multi-chat'>('landing')

  const tabs = [
    { id: 'agents', label: 'Agents', icon: FaRobot },
    { id: 'connections', label: 'Connections', icon: FaPlug },
    { id: 'multi-chat', label: 'Chat', icon: FaUsers }
  ]

  if (activeTab === 'landing') {
    return (
      <div className="App h-screen w-screen bg-background overflow-auto">
        <LandingPage onGetStarted={() => setActiveTab('agents')} />
      </div>
    )
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
              <ThemeToggle />
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

export default App
