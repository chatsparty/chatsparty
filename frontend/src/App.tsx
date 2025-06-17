import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FaRobot, FaUsers, FaComments } from 'react-icons/fa'
import ChatInterface from './components/ChatInterface'
import { AgentManagerPage, MultiAgentChatPage } from './pages'
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
        <div className="bg-white border-b border-gray-200 px-5 py-3 shadow-sm">
          <div className="flex gap-2 items-center">
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                variant="ghost"
                size="sm"
                className={`px-4 py-2 h-9 font-medium transition-all duration-150 ${
                  activeTab === tab.id 
                    ? "bg-blue-100 text-blue-700 hover:bg-blue-200 hover:text-blue-800" 
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-700"
                }`}
              >
                <div className="flex items-center gap-2">
                  <tab.icon className="text-sm" />
                  <span className="text-sm">{tab.label}</span>
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden bg-gray-50">
          {activeTab === 'agents' && <AgentManagerPage />}
          {activeTab === 'multi-chat' && <MultiAgentChatPage />}
          {activeTab === 'chat' && (
            <div className="w-96 min-w-96 max-w-96 h-full border-r border-gray-200 bg-white">
              <ChatInterface />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
