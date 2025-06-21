import type { SettingsItem } from "@/components/settings";
import { SettingsContent, SettingsSidebar } from "@/components/settings";
import { Server } from "lucide-react";
import React, { useEffect, useState } from "react";
import { FaCog, FaLock, FaMicrophone, FaPlug, FaUser } from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";

export const SettingsPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedItem, setSelectedItem] = useState("general");

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
      icon: FaCog,
    },
    {
      id: "connections",
      path: "/settings/connections",
      label: "Model Connections",
      description: "Manage your AI model connections and configurations",
      icon: FaPlug,
    },
    {
      id: "voice-connections",
      path: "/settings/voice-connections",
      label: "Voice Connections",
      description:
        "Manage your voice synthesis and speech recognition connections",
      icon: FaMicrophone,
    },
    {
      id: "mcp-servers",
      path: "/settings/mcp-servers",
      label: "MCP Servers",
      description:
        "Manage Model Context Protocol servers that provide tools for your agents",
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
        onItemSelect={handleItemSelect}
      />
      <SettingsContent selectedItem={selectedItem} />
    </div>
  );
};
