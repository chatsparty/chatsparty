import type { SettingsItem } from "@/components/settings";
import { SettingsContent, SettingsSidebar } from "@/components/settings";
import { Server, Settings, Shield, Mic, Plug, User, Coins } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CREDITS_ENABLED } from "@/config/features";
import { useTranslation } from "react-i18next";

export const SettingsPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [selectedItem, setSelectedItem] = useState("general");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
    setIsMobileMenuOpen(false);
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
      label: t("settings.general"),
      description: t("settings.generalDescription"),
      icon: Settings,
    },
    {
      id: "connections",
      path: "/settings/connections",
      label: t("connections.title"),
      description: t("settings.connectionsDescription"),
      icon: Plug,
    },
    {
      id: "voice-connections",
      path: "/settings/voice-connections",
      label: t("voice.title"),
      description: t("settings.voiceConnectionsDescription"),
      icon: Mic,
    },
    {
      id: "mcp-servers",
      path: "/settings/mcp-servers",
      label: t("settings.mcpServers"),
      description: t("settings.mcpServersDescription"),
      icon: Server,
    },
    ...(CREDITS_ENABLED ? [{
      id: "credits",
      path: "/settings/credits",
      label: t("settings.credits"),
      description: t("settings.creditsDescription"),
      icon: Coins,
    }] : []),
    {
      id: "profile",
      path: "#",
      label: t("settings.profile"),
      description: t("settings.profileDescription"),
      icon: User,
      disabled: true,
    },
    {
      id: "security",
      path: "#",
      label: t("settings.security"),
      description: t("settings.securityDescription"),
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
      <div className="flex-1 md:ms-0 min-w-0">
        <SettingsContent 
          selectedItem={selectedItem} 
          onMobileMenuOpen={() => setIsMobileMenuOpen(true)}
        />
      </div>
    </div>
  );
};
