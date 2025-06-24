import {
  ChevronsRight,
  FileUp,
  MessageSquare,
  Monitor,
  Play,
  Settings,
  Terminal,
} from "lucide-react";
import React from "react";
import { Button } from "../../../components/ui/button";

type LeftTab = "chat" | string;
type RightTab = "files" | "settings" | "services" | "terminal" | "preview";

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
    { id: "chat", icon: MessageSquare, label: "Chat", type: "left" as const, color: "text-blue-600" },
    { id: "files", icon: FileUp, label: "Files", type: "right" as const, color: "text-yellow-600" },
    {
      id: "settings",
      icon: Settings,
      label: "Settings",
      type: "right" as const,
      color: "text-gray-500",
    },
    { id: "services", icon: Play, label: "Services", type: "right" as const, color: "text-green-600" },
    { id: "terminal", icon: Terminal, label: "Terminal", type: "right" as const, color: "text-purple-600" },
    { id: "preview", icon: Monitor, label: "Preview", type: "right" as const, color: "text-orange-600" },
  ];

  return (
    <div className="w-12 bg-black flex flex-col items-center transition-all duration-200">
      <div className="pt-3">
        <Button
          onClick={onToggleFileViewer}
          variant={fileViewerOpen ? "default" : "ghost"}
          size="sm"
          className="w-8 h-8 p-0 flex items-center justify-center"
          title="Toggle File Explorer"
        >
          <ChevronsRight className="w-3.5 h-3.5 text-cyan-600" />
        </Button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-1">
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
                className="w-8 h-8 p-2 flex items-center justify-center"
                title={item.label}
              >
                <Icon className={`w-3.5 h-3.5 ${item.color}`} />
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
};