import React from "react";
import { FaCog } from "react-icons/fa";
import type { SettingsItem } from "./types";

interface SettingsSidebarProps {
  settingsItems: SettingsItem[];
  selectedItem: string;
  onItemSelect: (itemId: string) => void;
}

export const SettingsSidebar: React.FC<SettingsSidebarProps> = ({
  settingsItems,
  selectedItem,
  onItemSelect,
}) => {
  return (
    <div className="w-64 bg-card border-r border-border flex-shrink-0">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <FaCog className="text-xl text-primary" />
          <h1 className="text-xl font-semibold">Settings</h1>
        </div>

        <nav className="space-y-2">
          {settingsItems.map((item) => (
            <button
              key={item.id}
              onClick={() => !item.disabled && onItemSelect(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${
                selectedItem === item.id
                  ? "bg-primary text-primary-foreground"
                  : item.disabled
                  ? "text-muted-foreground cursor-not-allowed opacity-50"
                  : "hover:bg-accent hover:text-accent-foreground"
              }`}
              disabled={item.disabled}
            >
              <item.icon className="text-xs" />
              <span className="text-sm font-medium">{item.label}</span>
              {item.disabled && (
                <span className="ml-auto text-xs bg-muted px-2 py-1 rounded">
                  Soon
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
};
