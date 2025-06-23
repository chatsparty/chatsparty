import { useEffect } from "react";
import type { FileTab } from "./useFileManager";

interface UseKeyboardShortcutsProps {
  openFileTabs: FileTab[];
  activeTabId: string;
  onSaveFile: (tabId: string) => Promise<boolean>;
}

export const useKeyboardShortcuts = ({
  openFileTabs,
  activeTabId,
  onSaveFile,
}: UseKeyboardShortcutsProps) => {
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();

        const activeFileTab = openFileTabs.find(
          (tab) => tab.id === activeTabId
        );
        if (activeFileTab && activeFileTab.isDirty) {
          await onSaveFile(activeFileTab.id);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeTabId, openFileTabs, onSaveFile]);
};
