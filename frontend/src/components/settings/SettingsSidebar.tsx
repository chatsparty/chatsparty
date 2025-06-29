import React from "react";
import { Settings, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import type { SettingsItem } from "./types";

interface SettingsSidebarProps {
  settingsItems: SettingsItem[];
  onItemSelect: (itemId: string) => void;
  isMobileMenuOpen: boolean;
  onMobileMenuClose: () => void;
}

export const SettingsSidebar: React.FC<SettingsSidebarProps> = ({
  settingsItems,
  onItemSelect,
  isMobileMenuOpen,
  onMobileMenuClose,
}) => {
  const location = useLocation();

  const SidebarContent = () => (
    <div className="p-5">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl">
            <Settings className="w-4 h-4 text-primary" />
          </div>
          <h1 className="text-xl font-light text-foreground">Settings</h1>
        </div>
        {/* Mobile close button */}
        <button
          onClick={onMobileMenuClose}
          className="md:hidden p-2 hover:bg-accent rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <nav className="space-y-2">
        {settingsItems.map((item) => {
          if (item.disabled) {
            return (
              <button
                key={item.id}
                disabled={true}
                className="w-full flex items-center gap-3 px-3 py-3 md:py-2.5 rounded-xl text-left transition-all duration-200 text-muted-foreground cursor-not-allowed opacity-50 bg-muted/20 touch-manipulation"
              >
                <div className="p-1.5 bg-muted/30 rounded-lg">
                  <item.icon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                <span className="text-xs bg-muted/50 px-2 py-1 rounded-full">
                  Soon
                </span>
              </button>
            );
          }

          const isActive = location.pathname === item.path ||
            (item.id === "general" && location.pathname === "/settings");
          
          return (
            <Link
              key={item.id}
              to={item.path}
              onClick={() => onItemSelect(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-3 md:py-2.5 rounded-xl text-left transition-all duration-200 group touch-manipulation ${
                isActive
                  ? "bg-gradient-to-r from-primary/15 to-primary/5 text-primary border border-primary/20"
                  : "hover:bg-gradient-to-r hover:from-accent/50 hover:to-accent/20 hover:text-accent-foreground active:bg-accent/30"
              }`}
            >
              <div className={`p-1.5 rounded-lg transition-colors ${
                isActive 
                  ? "bg-primary/20" 
                  : "bg-muted/30 group-hover:bg-accent/40 group-active:bg-accent/50"
              }`}>
                <item.icon className={`w-4 h-4 ${
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-accent-foreground"
                }`} />
              </div>
              <div className="flex-1">
                <span className="text-sm font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:block w-60 bg-gradient-to-b from-card/50 to-card border-r border-border/50 flex-shrink-0">
        <SidebarContent />
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm" 
            onClick={onMobileMenuClose}
          />
          
          {/* Mobile Sidebar */}
          <div className="relative w-80 max-w-[85vw] bg-gradient-to-b from-card/95 to-card border-r border-border/50 shadow-2xl backdrop-blur-lg">
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  );
};