import { useState, useCallback } from "react";

export type LeftTab = "chat" | string;
export type RightTab =
  | "files"
  | "settings"
  | "services"
  | "console"
  | "preview";

export const useTabManager = () => {
  const [leftTab, setLeftTab] = useState<LeftTab>("chat");
  const [rightTab, setRightTab] = useState<RightTab>("files");
  const [openLeftTabs, setOpenLeftTabs] = useState<LeftTab[]>(["chat"]);
  const [openRightTabs, setOpenRightTabs] = useState<RightTab[]>(["files"]);

  const handleOpenLeftTab = useCallback((tab: LeftTab) => {
    setOpenLeftTabs((prev) => {
      if (!prev.includes(tab)) {
        return [...prev, tab];
      }
      return prev;
    });
    setLeftTab(tab);
  }, []);

  const handleOpenRightTab = useCallback((tab: RightTab) => {
    setOpenRightTabs((prev) => {
      if (!prev.includes(tab)) {
        return [...prev, tab];
      }
      return prev;
    });
    setRightTab(tab);
  }, []);

  const handleCloseLeftTab = useCallback(
    (tab: LeftTab) => {
      const newOpenTabs = openLeftTabs.filter((t) => t !== tab);
      setOpenLeftTabs(newOpenTabs);

      if (leftTab === tab && newOpenTabs.length > 0) {
        setLeftTab(newOpenTabs[newOpenTabs.length - 1]);
      }
    },
    [leftTab, openLeftTabs]
  );

  const handleCloseRightTab = useCallback(
    (tab: RightTab) => {
      const newOpenTabs = openRightTabs.filter((t) => t !== tab);
      setOpenRightTabs(newOpenTabs);

      if (rightTab === tab && newOpenTabs.length > 0) {
        setRightTab(newOpenTabs[newOpenTabs.length - 1]);
      }
    },
    [rightTab, openRightTabs]
  );

  const addFileTabToLeft = useCallback(
    (fileTabId: string) => {
      const currentFileTabId = openLeftTabs.find((tab) =>
        tab.startsWith("file-")
      );

      if (currentFileTabId) {
        setOpenLeftTabs((prev) =>
          prev.map((tab) => (tab === currentFileTabId ? fileTabId : tab))
        );
      } else {
        setOpenLeftTabs((prev) => [...prev, fileTabId]);
      }
      setLeftTab(fileTabId);
    },
    [openLeftTabs]
  );

  const removeFileTabFromLeft = useCallback(
    (fileTabId: string) => {
      const newOpenLeftTabs = openLeftTabs.filter((tab) => tab !== fileTabId);
      setOpenLeftTabs(newOpenLeftTabs);

      if (leftTab === fileTabId && newOpenLeftTabs.length > 0) {
        setLeftTab(newOpenLeftTabs[newOpenLeftTabs.length - 1]);
      }
    },
    [leftTab, openLeftTabs]
  );

  const switchToExistingFileTab = useCallback((fileTabId: string) => {
    setLeftTab(fileTabId);
  }, []);

  return {
    leftTab,
    rightTab,
    openLeftTabs,
    openRightTabs,
    setLeftTab,
    setRightTab,
    handleOpenLeftTab,
    handleOpenRightTab,
    handleCloseLeftTab,
    handleCloseRightTab,
    addFileTabToLeft,
    removeFileTabFromLeft,
    switchToExistingFileTab,
  };
};
