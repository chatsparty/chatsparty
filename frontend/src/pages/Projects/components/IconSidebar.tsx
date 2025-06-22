import {
  ChevronsRight,
  FileUp,
  MessageSquare,
  Play,
  Settings,
  Terminal,
} from "lucide-react";
import React from "react";
import { Button } from "../../../components/ui/button";

type LeftTab = "chat" | string;
type RightTab = "files" | "settings" | "services" | "console" | "preview";

interface IconSidebarProps {
  fileViewerOpen: boolean;
  leftTab: LeftTab;
  rightTab: RightTab;
  onToggleFileViewer: () => void;
  onOpenLeftTab: (tab: LeftTab) => void;
  onOpenRightTab: (tab: RightTab) => void;
}

export const IconSidebar: React.FC<IconSidebarProps> = ({
  fileViewerOpen,
  leftTab,
  rightTab,
  onToggleFileViewer,
  onOpenLeftTab,
  onOpenRightTab,
}) => {
  const sidebarItems = [
    { id: "chat", icon: MessageSquare, label: "Chat", type: "left" as const },
    { id: "files", icon: FileUp, label: "Files", type: "right" as const },
    {
      id: "settings",
      icon: Settings,
      label: "Settings",
      type: "right" as const,
    },
    { id: "services", icon: Play, label: "Services", type: "right" as const },
    { id: "console", icon: Terminal, label: "Console", type: "right" as const },
  ];

  return (
    <div className="w-16 bg-muted border-r border-border flex flex-col items-center py-4 transition-all duration-200">
      <Button
        onClick={onToggleFileViewer}
        variant={fileViewerOpen ? "default" : "ghost"}
        size="sm"
        className="mb-4 w-10 h-10 p-0"
        title="Toggle File Explorer"
      >
        <ChevronsRight className="w-4 h-4" />
      </Button>

      <div className="flex flex-col gap-2">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            (item.type === "left" && leftTab === item.id) ||
            (item.type === "right" && rightTab === item.id);

          return (
            <Button
              key={item.id}
              onClick={() => {
                if (item.type === "left") {
                  onOpenLeftTab(item.id as LeftTab);
                } else {
                  onOpenRightTab(item.id as RightTab);
                }
              }}
              variant={isActive ? "default" : "ghost"}
              size="sm"
              className="w-10 h-10 p-0"
              title={item.label}
            >
              <Icon className="w-4 h-4" />
            </Button>
          );
        })}
      </div>
    </div>
  );
};