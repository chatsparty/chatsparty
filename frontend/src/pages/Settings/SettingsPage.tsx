import React, { useState } from "react";
import { FaPlug, FaCog, FaUser, FaLock, FaMicrophone } from "react-icons/fa";
import { SettingsSidebar, SettingsContent } from "@/components/settings";
import type { SettingsItem } from "@/components/settings";

export const SettingsPage: React.FC = () => {
  const [selectedItem, setSelectedItem] = useState("general");

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
