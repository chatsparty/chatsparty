import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FaRobot, FaUsers, FaComments } from 'react-icons/fa'
import ChatInterface from './components/ChatInterface'
import { AgentManagerPage, MultiAgentChatPage } from './pages'
import { ThemeToggle } from './components/ThemeToggle'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState<'agents' | 'multi-chat' | 'chat'>('agents')

  const tabs = [
    { id: 'agents', label: 'Agent Manager', icon: FaRobot },
    { id: 'multi-chat', label: 'Multi-Agent Chat', icon: FaUsers },
    { id: 'chat', label: 'Simple Chat', icon: FaComments }
  ]

  return (
    <div className="App h-screen w-screen overflow-hidden">
      <div className="flex flex-col h-full">
        {/* Compact Tab Navigation */}
        <div className="bg-card border-b border-border px-5 py-3 shadow-sm">
          <div className="flex gap-2 items-center justify-between">
            <div className="text-sm font-semibold text-foreground">Chatsparty</div>
            <div className="flex gap-2 items-center">
              {tabs.map((tab) => (
                <Button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  variant="ghost"
                  size="sm"
                  className={`px-4 py-2 h-9 font-medium transition-all duration-150 ${
                    activeTab === tab.id 
                      ? "bg-primary/10 text-primary hover:bg-primary/20" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <tab.icon className="text-sm" />
                    <span className="text-sm">{tab.label}</span>
                  </div>
                </Button>
              ))}
              <ThemeToggle />
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden bg-background">
          {activeTab === 'agents' && <AgentManagerPage />}
          {activeTab === 'multi-chat' && <MultiAgentChatPage />}
          {activeTab === 'chat' && (
            <div className="w-96 min-w-96 max-w-96 h-full border-r border-border bg-card">
              <ChatInterface />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
