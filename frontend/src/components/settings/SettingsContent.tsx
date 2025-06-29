import React from "react";
import { Menu } from "lucide-react";
import { ConnectionsManagement } from "./ConnectionsManagement";
import { CreditsManagement } from "./CreditsManagement";
import { VoiceConnectionList } from "../voice/VoiceConnectionList";
import MCPServersPage from "../../pages/MCPServers";
import { CREDITS_ENABLED } from "@/config/features";

interface SettingsContentProps {
  selectedItem: string;
  onMobileMenuOpen?: () => void;
}

export const SettingsContent: React.FC<SettingsContentProps> = ({
  selectedItem,
  onMobileMenuOpen,
}) => {
  const renderContent = () => {
    switch (selectedItem) {
      case "general":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-4">General Settings</h2>
              <p className="text-muted-foreground">
                Configure general application preferences and settings.
              </p>
            </div>
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="font-medium mb-2">Application Preferences</h3>
              <p className="text-sm text-muted-foreground">
                More general settings will be available here in future updates.
              </p>
            </div>
          </div>
        );
      case "connections":
        return <ConnectionsManagement />;
      case "voice-connections":
        return <VoiceConnectionList />;
      case "mcp-servers":
        return <MCPServersPage />;
      case "credits":
        return CREDITS_ENABLED ? <CreditsManagement /> : null;
      default:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-4">Coming Soon</h2>
              <p className="text-muted-foreground">
                This section is not yet available. Check back later for updates.
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center gap-3 p-4 border-b border-border/50 bg-card/50">
        <button
          onClick={onMobileMenuOpen}
          className="p-2 hover:bg-accent rounded-lg transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-medium">Settings</h1>
      </div>
      
      {/* Content */}
      <div className="flex-1 p-6">
        {renderContent()}
      </div>
    </div>
  );
};