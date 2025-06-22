import { ExternalLink } from "lucide-react";
import React from "react";

export const PreviewPanel: React.FC = () => {
  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <ExternalLink className="w-5 h-5" />
        <h2 className="text-lg font-semibold">Preview</h2>
      </div>
      <div className="text-center text-muted-foreground py-8">
        <ExternalLink className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
        <p>Preview will show your running applications</p>
        <p className="text-sm mt-2">Start a service to see it here</p>
      </div>
    </div>
  );
};