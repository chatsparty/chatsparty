import React from "react";
import { Menu } from "lucide-react";
import { ConnectionsManagement } from "./ConnectionsManagement";
import { CreditsManagement } from "./CreditsManagement";
import { CREDITS_ENABLED } from "@/config/features";
import { useTranslation } from "react-i18next";
import { LanguageSwitcherWithLabel } from "../LanguageSwitcher";

interface SettingsContentProps {
  selectedItem: string;
  onMobileMenuOpen?: () => void;
}

export const SettingsContent: React.FC<SettingsContentProps> = ({
  selectedItem,
  onMobileMenuOpen,
}) => {
  const { t } = useTranslation();
  const renderContent = () => {
    switch (selectedItem) {
      case "general":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-4">{t("settings.general")}</h2>
              <p className="text-muted-foreground">
                {t("settings.generalDescription")}
              </p>
            </div>
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="font-medium mb-2">{t("settings.preferences")}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t("settings.moreSettingsComingSoon")}
              </p>
              <div className="border-t pt-4">
                <LanguageSwitcherWithLabel />
              </div>
            </div>
          </div>
        );
      case "connections":
        return <ConnectionsManagement />;
      case "credits":
        return CREDITS_ENABLED ? <CreditsManagement /> : null;
      default:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-4">{t("common.comingSoon")}</h2>
              <p className="text-muted-foreground">
                {t("common.sectionNotAvailable")}
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
        <h1 className="text-lg font-medium">{t("settings.title")}</h1>
      </div>
      
      {/* Content */}
      <div className="flex-1 p-6">
        {renderContent()}
      </div>
    </div>
  );
};