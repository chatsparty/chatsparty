import React from "react";
import { FaCog } from "react-icons/fa";
import { Link, useLocation } from "react-router-dom";
import type { SettingsItem } from "./types";

interface SettingsSidebarProps {
  settingsItems: SettingsItem[];
  onItemSelect: (itemId: string) => void;
}

export const SettingsSidebar: React.FC<SettingsSidebarProps> = ({
  settingsItems,
  onItemSelect,
}) => {
  const location = useLocation();

  return (
    <div className="w-64 bg-card border-r border-border flex-shrink-0">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <FaCog className="text-xl text-primary" />
          <h1 className="text-xl font-semibold">Settings</h1>
        </div>

        <nav className="space-y-2">
          {settingsItems.map((item) => {
            if (item.disabled) {
              return (
                <button
                  key={item.id}
                  disabled={true}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors text-muted-foreground cursor-not-allowed opacity-50"
                >
                  <item.icon className="text-xs" />
                  <span className="text-sm font-medium">{item.label}</span>
                  <span className="ml-auto text-xs bg-muted px-2 py-1 rounded">
                    Soon
                  </span>
                </button>
              );
            }

            return (
              <Link
                key={item.id}
                to={item.path}
                onClick={() => onItemSelect(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${
                  location.pathname === item.path ||
                  (item.id === "general" && location.pathname === "/settings")
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <item.icon className="text-xs" />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
