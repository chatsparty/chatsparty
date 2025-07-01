import {
  FaGithub,
  FaArrowRight,
  FaUser,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { ThemeToggle } from "../../components/ThemeToggle";
import Avatar from "boring-avatars";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "../../components/LanguageSwitcher";

interface LandingPageProps {
  onGetStarted?: () => void;
}

function WebsiteHeader() {
  const { t } = useTranslation();
  
  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xl font-bold text-foreground">
            <Avatar
              size={32}
              name="ChatsParty"
              variant="beam"
              colors={["#000000", "#6B46C1", "#EC4899", "#F97316", "#FCD34D"]}
            />
            <span>{t("common.appName")}</span>
          </div>

          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <ThemeToggle />
            
            <Button
              size="sm"
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm hover:shadow-md transition-all duration-200"
              onClick={() => window.location.href = '/login'}
            >
              <FaUser className="text-sm" />
              {t("common.login")}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

export function LandingPage({}: LandingPageProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const avatarColors = ["#000000", "#6B46C1", "#EC4899", "#F97316", "#FCD34D"];

  const handleGetStarted = () => {
    navigate('/agents');
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 overflow-hidden">
      <WebsiteHeader />
      
      {/* Floating Avatars Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" dir="ltr">
        <div className="absolute -top-10 start-[-2.5rem] opacity-10">
          <Avatar size={200} name="bg-1" variant="beam" colors={avatarColors} />
        </div>
        <div className="absolute top-20 end-10 opacity-10 animate-float">
          <Avatar size={150} name="bg-2" variant="beam" colors={avatarColors} />
        </div>
        <div className="absolute bottom-20 start-20 opacity-10 animate-bounce-slow">
          <Avatar size={180} name="bg-3" variant="beam" colors={avatarColors} />
        </div>
        <div className="absolute bottom-40 end-40 opacity-10 animate-float" style={{ animationDelay: '2s' }}>
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
            {t("common.appName")}
          </h1>

          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
            {t("landing.subtitle")}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              onClick={handleGetStarted}
              size="lg"
              className="flex items-center gap-3 px-10 py-6 text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              {t("landing.cta.getStarted")}
              <FaArrowRight className="text-sm" />
            </Button>

            <a
              href="https://github.com/chatsparty/chatsparty"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 flex items-center gap-1"
            >
              <FaGithub className="text-base" />
              <span>Open Source</span>
            </a>
          </div>
        </div>

        {/* Features */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Experience AI Conversations Like Never Before</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Watch multiple AI agents collaborate, debate, and analyze topics from every angle—giving you deeper insights than any single AI could provide
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Multi-Perspective Analysis */}
            <div className="relative bg-card border rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 group">
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex gap-1">
                <div className="group-hover:rotate-12 transition-transform duration-300">
                  <Avatar size={45} name="perspective-1" variant="beam" colors={avatarColors} />
                </div>
                <div className="group-hover:-rotate-12 transition-transform duration-300">
                  <Avatar size={45} name="perspective-2" variant="beam" colors={avatarColors} />
                </div>
              </div>
              <div className="pt-6">
                <h3 className="text-xl font-bold mb-3">Multi-Perspective Analysis</h3>
                <p className="text-muted-foreground">
                  Get comprehensive insights as different AI agents analyze your topic from unique viewpoints—like having a panel of experts at your fingertips
                </p>
              </div>
            </div>

            {/* Real-Time Collaboration */}
            <div className="relative bg-card border rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 group">
              <div className="absolute -top-8 left-1/2 -translate-x-1/2">
                <div className="relative">
                  <div className="absolute inset-0 animate-ping">
                    <Avatar size={50} name="collab-ping" variant="beam" colors={avatarColors} className="opacity-20" />
                  </div>
                  <Avatar size={50} name="collab-main" variant="beam" colors={avatarColors} />
                </div>
              </div>
              <div className="pt-6">
                <h3 className="text-xl font-bold mb-3">Real-Time Collaboration</h3>
                <p className="text-muted-foreground">
                  Watch AI agents build on each other's ideas in real-time, creating richer, more nuanced solutions to complex problems
                </p>
              </div>
            </div>

            {/* Deep Understanding */}
            <div className="relative bg-card border rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 group">
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
                <div className="flex gap-2">
                  <Avatar size={30} name="deep-1" variant="beam" colors={avatarColors} className="group-hover:scale-110 transition-transform" />
                  <Avatar size={30} name="deep-2" variant="beam" colors={avatarColors} className="group-hover:scale-110 transition-transform delay-75" />
                </div>
                <Avatar size={40} name="deep-main" variant="beam" colors={avatarColors} className="group-hover:scale-110 transition-transform delay-150" />
              </div>
              <div className="pt-8">
                <h3 className="text-xl font-bold mb-3">Deeper Understanding</h3>
                <p className="text-muted-foreground">
                  Agents fact-check, challenge, and refine each other's responses—ensuring you get accurate, well-rounded information
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Use Cases */}
        <div className="mb-20 bg-muted/20 rounded-3xl p-12">
          <h2 className="text-3xl font-bold text-center mb-12">See ChatsParty in Action</h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {/* Business Strategy */}
            <div className="bg-card rounded-xl p-6 border">
              <div className="flex items-start gap-4">
                <div className="flex -space-x-2">
                  <Avatar size={40} name="biz-1" variant="beam" colors={avatarColors} />
                  <Avatar size={40} name="biz-2" variant="beam" colors={avatarColors} />
                  <Avatar size={40} name="biz-3" variant="beam" colors={avatarColors} />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-2">Business Strategy Analysis</h4>
                  <p className="text-sm text-muted-foreground">
                    "Analyze our market expansion strategy" → Watch a marketing expert, financial analyst, and risk manager debate your plan
                  </p>
                </div>
              </div>
            </div>

            {/* Code Review */}
            <div className="bg-card rounded-xl p-6 border">
              <div className="flex items-start gap-4">
                <div className="flex -space-x-2">
                  <Avatar size={40} name="code-1" variant="beam" colors={avatarColors} />
                  <Avatar size={40} name="code-2" variant="beam" colors={avatarColors} />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-2">Code Architecture Review</h4>
                  <p className="text-sm text-muted-foreground">
                    "Review my app architecture" → Security expert and performance engineer collaborate to optimize your code
                  </p>
                </div>
              </div>
            </div>

            {/* Research */}
            <div className="bg-card rounded-xl p-6 border">
              <div className="flex items-start gap-4">
                <div className="flex -space-x-2">
                  <Avatar size={40} name="research-1" variant="beam" colors={avatarColors} />
                  <Avatar size={40} name="research-2" variant="beam" colors={avatarColors} />
                  <Avatar size={40} name="research-3" variant="beam" colors={avatarColors} />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-2">Research & Analysis</h4>
                  <p className="text-sm text-muted-foreground">
                    "Explain quantum computing" → Watch experts break down complex topics from theoretical, practical, and future perspectives
                  </p>
                </div>
              </div>
            </div>

            {/* Creative */}
            <div className="bg-card rounded-xl p-6 border">
              <div className="flex items-start gap-4">
                <div className="flex -space-x-2">
                  <Avatar size={40} name="creative-1" variant="beam" colors={avatarColors} />
                  <Avatar size={40} name="creative-2" variant="beam" colors={avatarColors} />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-2">Creative Brainstorming</h4>
                  <p className="text-sm text-muted-foreground">
                    "Product launch ideas" → Creative director and strategist bounce ideas off each other in real-time
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Avatar Showcase */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">{t("landing.title")}</h2>
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
