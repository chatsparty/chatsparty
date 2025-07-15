import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/ui/button";
import {
  X,
  Paperclip,
  MessageCircle,
  Files,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import type { ActiveView } from "../hooks/useSidebarState";

interface ResponsiveLayoutProps {
  isRTL: boolean;
  activeView: ActiveView;
  isDesktopFileSidebarOpen: boolean;
  attachedFiles: unknown[];
  activeConvName: string | undefined;
  toggleConversationsSidebar: () => void;
  toggleFilesSidebar: () => void;
  closeMobileSidebars: () => void;
  setIsDesktopFileSidebarOpen: (isOpen: boolean) => void;
  conversationSidebar: React.ReactNode;
  chatArea: React.ReactNode;
  fileAttachmentSidebar: React.ReactNode;
}

export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  isRTL,
  activeView,
  isDesktopFileSidebarOpen,
  attachedFiles,
  activeConvName,
  toggleConversationsSidebar,
  toggleFilesSidebar,
  closeMobileSidebars,
  setIsDesktopFileSidebarOpen,
  conversationSidebar,
  chatArea,
  fileAttachmentSidebar,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex h-full bg-background relative">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-50 bg-background/98 backdrop-blur-lg border-b-2 border-border shadow-xl">
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-background to-card/90">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleConversationsSidebar}
              className="lg:hidden text-foreground hover:text-primary hover:bg-primary/15 border border-transparent hover:border-primary/20 transition-all duration-200"
            >
              <MessageCircle className="w-5 h-5" />
              <span className="sr-only">Toggle conversations</span>
            </Button>
            <h1 className="text-lg font-bold text-foreground tracking-tight">
              {activeConvName || t("chat.multiAgentChat")}
            </h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFilesSidebar}
            className="lg:hidden text-foreground hover:text-primary hover:bg-primary/15 border border-transparent hover:border-primary/20 transition-all duration-200 relative"
          >
            <Paperclip className="w-5 h-5" />
            {attachedFiles.length > 0 && (
              <span className="ms-1 text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5 font-bold shadow-md border border-primary/20">
                {attachedFiles.length}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:flex h-full w-full relative">
        <div className="fixed start-0 top-0 bottom-0 z-30">
          <div className="group w-2 h-full absolute start-0 top-0">
            <div className="w-2 h-full bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="transform rtl:translate-x-full ltr:-translate-x-full group-hover:translate-x-0 transition-all duration-300 ease-out h-full shadow-2xl border-e border-border/20 backdrop-blur-sm absolute start-0 top-0">
              {conversationSidebar}
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-gradient-to-br from-background via-background/95 to-muted/30">
          {chatArea}
        </div>

        {isDesktopFileSidebarOpen && fileAttachmentSidebar}

        <div
          className="fixed top-1/2 -translate-y-1/2 z-40"
          style={{
            [isRTL ? "left" : "right"]: isDesktopFileSidebarOpen
              ? "288px"
              : "16px",
          }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setIsDesktopFileSidebarOpen(!isDesktopFileSidebarOpen)
            }
            className="h-12 w-8 p-0 bg-card/80 hover:bg-card border border-border/50 hover:border-border shadow-md transition-all duration-200 rounded-s-lg rounded-e-none"
            title={
              isDesktopFileSidebarOpen
                ? "Close file sidebar"
                : "Open file sidebar"
            }
          >
            {isDesktopFileSidebarOpen ? (
              isRTL ? (
                <ChevronLeft className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )
            ) : (
              <div className="flex flex-col items-center gap-1">
                <Files className="w-4 h-4 text-muted-foreground" />
                {attachedFiles.length > 0 && (
                  <span className="text-xs bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center font-medium">
                    {attachedFiles.length}
                  </span>
                )}
              </div>
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden flex h-full w-full">
        <div
          className={`
          fixed inset-0 z-40 bg-background backdrop-blur-lg transform transition-all duration-300 pt-16 shadow-2xl border-e-2 border-border/50
          ${
            activeView === "conversations"
              ? "translate-x-0"
              : isRTL
              ? "translate-x-full"
              : "-translate-x-full"
          }
        `}
        >
          <div className="h-full flex flex-col">
            <div className="p-4 border-b-2 border-border flex items-center justify-between bg-gradient-to-r from-card/70 to-background/50">
              <h2 className="text-lg font-bold text-foreground tracking-tight">
                {t("chat.conversations")}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={closeMobileSidebars}
                className="text-muted-foreground hover:text-foreground hover:bg-muted/70 border border-transparent hover:border-border transition-all duration-200"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-hidden">{conversationSidebar}</div>
          </div>
        </div>

        <div
          className={`
          fixed inset-0 z-40 bg-background backdrop-blur-lg transform transition-all duration-300 pt-16 shadow-2xl border-s-2 border-border/50
          ${
            activeView === "files"
              ? "translate-x-0"
              : isRTL
              ? "-translate-x-full"
              : "translate-x-full"
          }
        `}
        >
          <div className="h-full flex flex-col">
            <div className="p-4 border-b-2 border-border flex items-center justify-between bg-gradient-to-r from-card/70 to-background/50">
              <h2 className="text-lg font-bold text-foreground tracking-tight">
                {t("chat.fileAttachments")}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={closeMobileSidebars}
                className="text-muted-foreground hover:text-foreground hover:bg-muted/70 border border-transparent hover:border-border transition-all duration-200"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-hidden">
              {fileAttachmentSidebar}
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-gradient-to-br from-background via-background/95 to-muted/30 pt-8 min-h-0">
          {chatArea}
        </div>
      </div>
    </div>
  );
};
