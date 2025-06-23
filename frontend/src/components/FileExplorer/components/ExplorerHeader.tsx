import React from "react";
import { RefreshCw, X } from "lucide-react";
import { Button } from "../../ui/button";

interface ExplorerHeaderProps {
  selectedFilesCount: number;
  isVMActive: boolean;
  loading: boolean;
  onRefresh: () => void;
  onClose: () => void;
  onClearSelection: () => void;
}

export const ExplorerHeader: React.FC<ExplorerHeaderProps> = ({
  selectedFilesCount,
  isVMActive,
  loading,
  onRefresh,
  onClose,
  onClearSelection,
}) => {
  return (
    <div className="p-2 border-b border-border">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold text-foreground">Explorer</h3>
          {selectedFilesCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-blue-600">
                {selectedFilesCount} selected
              </span>
              <Button
                onClick={onClearSelection}
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 text-xs"
                title="Clear selection"
              >
                <X className="w-2 h-2" />
              </Button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isVMActive && (
            <Button
              onClick={onRefresh}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              disabled={loading}
            >
              <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
            </Button>
          )}
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
};