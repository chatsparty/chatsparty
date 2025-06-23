import { useState, useCallback, useEffect } from "react";

const MIN_WIDTH = 250;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 256;

export const useFileExplorerResize = (initialWidth: number = DEFAULT_WIDTH) => {
  const [width, setWidth] = useState(initialWidth);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      setDragStartX(e.clientX);
      setStartWidth(width);
    },
    [width]
  );

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaX = e.clientX - dragStartX;

      const newWidth = startWidth + deltaX;

      const clampedWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth));
      setWidth(clampedWidth);
    };

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleGlobalMouseMove);
      document.addEventListener("mouseup", handleGlobalMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      return () => {
        document.removeEventListener("mousemove", handleGlobalMouseMove);
        document.removeEventListener("mouseup", handleGlobalMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
    }
  }, [isDragging, dragStartX, startWidth]);

  return {
    width,
    isDragging,
    handleMouseDown,
    setWidth,
  };
};
