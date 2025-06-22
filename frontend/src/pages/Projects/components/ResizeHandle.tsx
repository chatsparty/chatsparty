import React from "react";

interface ResizeHandleProps {
  onMouseDown: (e: React.MouseEvent) => void;
}

export const ResizeHandle: React.FC<ResizeHandleProps> = ({ onMouseDown }) => {
  return (
    <div
      className="w-1 bg-border hover:bg-primary cursor-col-resize flex-shrink-0"
      onMouseDown={onMouseDown}
    />
  );
};