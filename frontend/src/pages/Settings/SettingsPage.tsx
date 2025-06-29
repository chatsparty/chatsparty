import type { SettingsItem } from "@/components/settings";
import { SettingsContent, SettingsSidebar } from "@/components/settings";
import { Server, Settings, Shield, Mic, Plug, User, Coins } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CREDITS_ENABLED } from "@/config/features";

export const SettingsPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedItem, setSelectedItem] = useState("general");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Extract the settings section from the URL path
  const getSettingsSectionFromPath = (pathname: string) => {
    if (pathname === "/settings" || pathname === "/settings/general") {
      return "general";
    }
    const section = pathname.split("/settings/")[1];
    return section || "general";
  };

  useEffect(() => {
    const section = getSettingsSectionFromPath(location.pathname);
    setSelectedItem(section);
  }, [location.pathname]);

  const handleItemSelect = (itemId: string) => {
    setSelectedItem(itemId);
    setIsMobileMenuOpen(false); // Close mobile menu when item is selected
    if (itemId === "general") {
      navigate("/settings/general");
    } else {
      navigate(`/settings/${itemId}`);
    }
  };

  const settingsItems: SettingsItem[] = [
    {
      id: "general",
      path: "/settings/general",
      label: "General",
      description: "General application settings",
      icon: Settings,
    },
    {
      id: "connections",
      path: "/settings/connections",
      label: "Model Connections",
      description: "Manage your AI model connections and configurations",
      icon: Plug,
    },
    {
      id: "voice-connections",
      path: "/settings/voice-connections",
      label: "Voice Connections",
      description:
        "Manage your voice synthesis and speech recognition connections",
      icon: Mic,
    },
    {
      id: "mcp-servers",
      path: "/settings/mcp-servers",
      label: "MCP Servers",
      description:
        "Manage Model Context Protocol servers that provide tools for your agents",
      icon: Server,
    },
    ...(CREDITS_ENABLED ? [{
      id: "credits",
      path: "/settings/credits",
      label: "Credits",
      description: "Manage your credits and billing information",
      icon: Coins,
    }] : []),
    {
      id: "profile",
      path: "#",
      label: "Profile",
      description: "Update your profile information and preferences",
      icon: User,
      disabled: true,
    },
    {
      id: "security",
      path: "#",
      label: "Security",
      description: "Manage your account security and privacy settings",
      icon: Shield,
      disabled: true,
    },
  ];

  return (
    <div className="flex h-full relative">
      <SettingsSidebar
        settingsItems={settingsItems}
        onItemSelect={handleItemSelect}
        isMobileMenuOpen={isMobileMenuOpen}
        onMobileMenuClose={() => setIsMobileMenuOpen(false)}
      />
      <div className="flex-1 md:ml-0 min-w-0">
        <SettingsContent 
          selectedItem={selectedItem} 
          onMobileMenuOpen={() => setIsMobileMenuOpen(true)}
        />
      </div>
    </div>
  );
};
