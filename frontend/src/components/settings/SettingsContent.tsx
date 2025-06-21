import React from "react";
import { ConnectionsManagement } from "./ConnectionsManagement";
import { VoiceConnectionList } from "../voice/VoiceConnectionList";
import MCPServersPage from "../../pages/MCPServers";

interface SettingsContentProps {
  selectedItem: string;
}

export const SettingsContent: React.FC<SettingsContentProps> = ({
  selectedItem,
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
    <div className="flex-1 p-6 overflow-auto">
      {renderContent()}
    </div>
  );
};