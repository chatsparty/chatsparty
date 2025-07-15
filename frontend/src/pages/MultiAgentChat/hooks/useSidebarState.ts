import { useState } from "react";

export type ActiveView = "chat" | "conversations" | "files";

export const useSidebarState = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isFileSidebarOpen, setIsFileSidebarOpen] = useState(false);
  const [isDesktopFileSidebarOpen, setIsDesktopFileSidebarOpen] =
    useState(false);
  const [activeView, setActiveView] = useState<ActiveView>("chat");

  const toggleConversationsSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
    setActiveView("conversations");
  };

  const toggleFilesSidebar = () => {
    setIsFileSidebarOpen((prev) => !prev);
    setActiveView("files");
  };

  const closeMobileSidebars = () => {
    setActiveView("chat");
  };

  return {
    isSidebarOpen,
    isFileSidebarOpen,
    isDesktopFileSidebarOpen,
    activeView,
    setIsDesktopFileSidebarOpen,
    toggleConversationsSidebar,
    toggleFilesSidebar,
    closeMobileSidebars,
    setActiveView,
  };
};
