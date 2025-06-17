import { FaRobot, FaGithub, FaArrowRight, FaComments, FaStar } from 'react-icons/fa'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { ThemeToggle } from '../../components/ThemeToggle'

interface LandingPageProps {
  onGetStarted: () => void
}

function WebsiteHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="text-xl font-bold text-foreground">
            Chats<span className="text-primary">Party</span>
          </div>
          
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm"
              className="flex items-center gap-2"
              onClick={() => window.open('https://github.com/chatsparty/chatsparty', '_blank')}
            >
              <FaGithub className="text-sm" />
              GitHub
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              className="flex items-center gap-2"
              onClick={() => window.open('https://github.com/chatsparty/chatsparty', '_blank')}
            >
              <FaStar className="text-sm" />
              Star
            </Button>
            
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  )
}

export function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <WebsiteHeader />
      
      <div className="container mx-auto px-6 pt-32 pb-16">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <h1 className="text-6xl md:text-7xl font-bold text-foreground mb-8 leading-tight">
            Chats<span className="text-primary">Party</span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
            An open-source platform for creating and managing AI agents with multi-agent conversations. 
            Experience the future of AI collaboration.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              onClick={onGetStarted}
              size="lg" 
              className="flex items-center gap-3 px-10 py-6 text-lg"
            >
              Get Started
              <FaArrowRight className="text-sm" />
            </Button>
            
            <Button 
              variant="outline" 
              size="lg" 
              className="flex items-center gap-3 px-10 py-6 text-lg"
              onClick={() => window.open('https://github.com/chatsparty/chatsparty', '_blank')}
            >
              <FaGithub className="text-lg" />
              View on GitHub
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-20">
          <div className="text-center p-6">
            <FaRobot className="text-3xl text-primary mx-auto mb-4" />
            <h3 className="text-xl font-medium mb-2">Agent Management</h3>
            <p className="text-muted-foreground">
              Create and manage AI agents with custom personalities.
            </p>
          </div>

          <div className="text-center p-6">
            <FaComments className="text-3xl text-primary mx-auto mb-4" />
            <h3 className="text-xl font-medium mb-2">Multi-Agent Chat</h3>
            <p className="text-muted-foreground">
              Watch multiple AI agents collaborate in real-time.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <div className="bg-card border rounded-2xl p-12 max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-6">Ready to Join the Party?</h2>
            <p className="text-muted-foreground mb-8 text-lg">
              Open source for personal use. Start experimenting with multi-agent AI today.
            </p>
            <Button 
              onClick={onGetStarted}
              size="lg" 
              className="flex items-center gap-3 mx-auto px-8 py-4 text-lg"
            >
              Launch ChatsParty
              <FaArrowRight className="text-sm" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}