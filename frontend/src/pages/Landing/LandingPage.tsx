import {
  FaGithub,
  FaArrowRight,
  FaStar,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { ThemeToggle } from "../../components/ThemeToggle";
import Avatar from "boring-avatars";

interface LandingPageProps {
  onGetStarted?: () => void;
}

function WebsiteHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xl font-bold text-foreground">
            <Avatar
              size={32}
              name="ChatsParty"
              variant="beam"
              colors={["#000000", "#6B46C1", "#EC4899", "#F97316", "#FCD34D"]}
            />
            <span>Chats<span className="text-primary">Party</span></span>
          </div>

          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              onClick={() =>
                window.open(
                  "https://github.com/chatsparty/chatsparty",
                  "_blank"
                )
              }
            >
              <FaGithub className="text-sm" />
              GitHub
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              onClick={() =>
                window.open(
                  "https://github.com/chatsparty/chatsparty",
                  "_blank"
                )
              }
            >
              <FaStar className="text-sm" />
              Star
            </Button>

            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}

export function LandingPage({}: LandingPageProps) {
  const navigate = useNavigate();
  const avatarColors = ["#000000", "#6B46C1", "#EC4899", "#F97316", "#FCD34D"];

  const handleGetStarted = () => {
    navigate('/agents');
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 overflow-hidden">
      <WebsiteHeader />
      
      {/* Floating Avatars Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-10 -left-10 opacity-10">
          <Avatar size={200} name="bg-1" variant="beam" colors={avatarColors} />
        </div>
        <div className="absolute top-20 right-10 opacity-10 animate-float">
          <Avatar size={150} name="bg-2" variant="beam" colors={avatarColors} />
        </div>
        <div className="absolute bottom-20 left-20 opacity-10 animate-bounce-slow">
          <Avatar size={180} name="bg-3" variant="beam" colors={avatarColors} />
        </div>
        <div className="absolute bottom-40 right-40 opacity-10 animate-float" style={{ animationDelay: '2s' }}>
          <Avatar size={120} name="bg-4" variant="beam" colors={avatarColors} />
        </div>
      </div>

      <div className="container mx-auto px-6 pt-32 pb-16 relative z-10">
        {/* Hero Section */}
        <div className="text-center mb-20 relative">
          {/* Hero Avatars */}
          <div className="flex justify-center items-center gap-4 mb-8">
            <div className="animate-bounce-slow" style={{ animationDelay: '0s' }}>
              <Avatar size={80} name="hero-1" variant="beam" colors={avatarColors} />
            </div>
            <div className="animate-bounce-slow" style={{ animationDelay: '0.5s' }}>
              <Avatar size={100} name="hero-2" variant="beam" colors={avatarColors} />
            </div>
            <div className="animate-bounce-slow" style={{ animationDelay: '1s' }}>
              <Avatar size={80} name="hero-3" variant="beam" colors={avatarColors} />
            </div>
          </div>
          
          <h1 className="text-6xl md:text-7xl font-bold text-foreground mb-8 leading-tight">
            Chats<span className="text-primary">Party</span>
          </h1>

          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
            An open-source platform for creating and managing AI agents with
            multi-agent conversations. Experience the future of AI
            collaboration.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              onClick={handleGetStarted}
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
              onClick={() =>
                window.open(
                  "https://github.com/chatsparty/chatsparty",
                  "_blank"
                )
              }
            >
              <FaGithub className="text-lg" />
              View on GitHub
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-20">
          <div className="relative bg-card border rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 group">
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 group-hover:scale-110 transition-transform duration-300">
              <Avatar size={60} name="feature-agent" variant="beam" colors={avatarColors} />
            </div>
            <div className="pt-6">
              <h3 className="text-xl font-bold mb-3">Agent Management</h3>
              <p className="text-muted-foreground">
                Create and manage AI agents with unique personalities. Each agent gets their own colorful avatar!
              </p>
            </div>
          </div>

          <div className="relative bg-card border rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 group">
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex gap-2">
              <div className="group-hover:scale-110 transition-transform duration-300">
                <Avatar size={40} name="chat-1" variant="beam" colors={avatarColors} />
              </div>
              <div className="group-hover:scale-110 transition-transform duration-300" style={{ transitionDelay: '0.1s' }}>
                <Avatar size={40} name="chat-2" variant="beam" colors={avatarColors} />
              </div>
              <div className="group-hover:scale-110 transition-transform duration-300" style={{ transitionDelay: '0.2s' }}>
                <Avatar size={40} name="chat-3" variant="beam" colors={avatarColors} />
              </div>
            </div>
            <div className="pt-6">
              <h3 className="text-xl font-bold mb-3">Multi-Agent Chat</h3>
              <p className="text-muted-foreground">
                Watch colorful AI agents collaborate in real-time conversations.
              </p>
            </div>
          </div>
        </div>

        {/* Avatar Showcase */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">Meet Your New AI Friends</h2>
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background pointer-events-none z-10" />
            <div className="overflow-hidden">
              <div className="flex gap-6 animate-scroll-horizontal">
                {Array.from({ length: 20 }, (_, i) => (
                  <div key={i} className="flex-shrink-0">
                    <Avatar
                      size={100}
                      name={`showcase-${i}`}
                      variant="beam"
                      colors={avatarColors}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <div className="bg-card border-2 border-primary/20 rounded-3xl p-12 max-w-3xl mx-auto relative overflow-hidden">
            {/* Party avatars in corners */}
            <div className="absolute top-4 left-4 opacity-20 animate-spin-slow">
              <Avatar size={60} name="party-1" variant="beam" colors={avatarColors} />
            </div>
            <div className="absolute top-4 right-4 opacity-20 animate-spin-slow" style={{ animationDirection: 'reverse' }}>
              <Avatar size={60} name="party-2" variant="beam" colors={avatarColors} />
            </div>
            <div className="absolute bottom-4 left-4 opacity-20 animate-float">
              <Avatar size={60} name="party-3" variant="beam" colors={avatarColors} />
            </div>
            <div className="absolute bottom-4 right-4 opacity-20 animate-float" style={{ animationDelay: '1s' }}>
              <Avatar size={60} name="party-4" variant="beam" colors={avatarColors} />
            </div>
            
            <h2 className="text-3xl font-bold mb-6 relative z-10">
              Ready to Join the Party?
            </h2>
            <p className="text-muted-foreground mb-8 text-lg relative z-10">
              Open source for personal use. Start experimenting with colorful multi-agent
              AI conversations today.
            </p>
            <Button
              onClick={handleGetStarted}
              size="lg"
              className="flex items-center gap-3 mx-auto px-8 py-4 text-lg relative z-10 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
            >
              Launch ChatsParty
              <FaArrowRight className="text-sm" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
