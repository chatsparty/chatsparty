import React from "react";
import { Button } from "../../ui/button";
import type { FileSystemEvent } from "../types";

interface FileEventsPanelProps {
  events: FileSystemEvent[];
  onClearEvents: () => void;
}

export const FileEventsPanel: React.FC<FileEventsPanelProps> = ({
  events,
  onClearEvents,
}) => {
  if (events.length === 0) {
    return null;
  }

  return (
    <div className="border-t border-border bg-muted/50">
      <div className="p-2">
        <div className="flex justify-between items-center mb-2">
          <h4 className="text-xs font-medium text-foreground">
            Recent File Events
          </h4>
          <Button
            onClick={onClearEvents}
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 text-xs text-muted-foreground hover:text-foreground"
          >
            Clear
          </Button>
        </div>
        <div className="space-y-1 max-h-24 overflow-y-auto">
          {events.map((event, index) => (
            <div key={index} className="text-xs text-muted-foreground">
              <span className="font-mono bg-muted px-1 rounded">
                {event.event_type}
              </span>
              : {event.file_path}
              <span className="text-muted-foreground/70 ml-2">
                {new Date(event.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};