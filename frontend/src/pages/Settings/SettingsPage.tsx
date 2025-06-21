import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { FaPlug, FaCog, FaUser, FaLock, FaMicrophone } from "react-icons/fa";
import { Server } from "lucide-react";
import { SettingsSidebar, SettingsContent } from "@/components/settings";
import type { SettingsItem } from "@/components/settings";

export const SettingsPage: React.FC = () => {
  const location = useLocation();
  const [selectedItem, setSelectedItem] = useState("general");

  useEffect(() => {
    // Check if there's an activeTab in the navigation state
    if (location.state?.activeTab) {
      setSelectedItem(location.state.activeTab);
    }
  }, [location.state]);

  const settingsItems: SettingsItem[] = [
    {
      id: "general",
      path: "/settings",
      label: "General",
      description: "General application settings",
      icon: FaCog,
    },
    {
      id: "connections",
      path: "/connections",
      label: "Model Connections",
      description: "Manage your AI model connections and configurations",
      icon: FaPlug,
    },
    {
      id: "voice-connections",
      path: "/voice-connections",
      label: "Voice Connections",
      description:
        "Manage your voice synthesis and speech recognition connections",
      icon: FaMicrophone,
    },
    {
      id: "mcp-servers",
      path: "/mcp-servers",
      label: "MCP Servers",
      description: "Manage Model Context Protocol servers that provide tools for your agents",
      icon: Server,
    },
    {
      id: "profile",
      path: "#",
      label: "Profile",
      description: "Update your profile information and preferences",
      icon: FaUser,
      disabled: true,
    },
    {
      id: "security",
      path: "#",
      label: "Security",
      description: "Manage your account security and privacy settings",
      icon: FaLock,
      disabled: true,
    },
  ];

  return (
    <div className="flex h-full">
      <SettingsSidebar
        settingsItems={settingsItems}
        selectedItem={selectedItem}
        onItemSelect={setSelectedItem}
      />
      <SettingsContent selectedItem={selectedItem} />
    </div>
  );
};
