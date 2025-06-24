import { useRef, useImperativeHandle, forwardRef } from "react";
import MinimalBrowserWithAutoUpdate, { type MinimalBrowserRef } from "../../../components/MinimalBrowserWithAutoUpdate";

interface PreviewPanelProps {
  projectId: string;
  previewUrl?: string;
}

export interface PreviewPanelRef {
  navigateToUrl: (url: string) => void;
}

export const PreviewPanel = forwardRef<PreviewPanelRef, PreviewPanelProps>(({ 
  projectId, 
  previewUrl 
}, ref) => {
  const browserRef = useRef<MinimalBrowserRef>(null);

  useImperativeHandle(ref, () => ({
    navigateToUrl: (url: string) => {
      browserRef.current?.navigateToUrl(url);
    }
  }), []);

  return (
    <div className="h-full">
      <MinimalBrowserWithAutoUpdate 
        ref={browserRef}
        projectId={projectId}
        initialUrl={previewUrl}
        className="h-full no-border"
      />
    </div>
  );
});

PreviewPanel.displayName = 'PreviewPanel';