import React from 'react';
import { Button } from './button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, actions }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-card border border-border rounded-lg shadow-lg max-w-md w-full mx-4 animate-in fade-in-0 zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6">
          {children}
        </div>
        
        {/* Actions */}
        {actions && (
          <div className="flex justify-end gap-3 p-6 pt-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  isShared: boolean;
  shareUrl?: string;
  onCopyLink: () => void;
  onToggleShare: () => Promise<void>;
  isLoading: boolean;
}

export const ShareModal: React.FC<ShareModalProps> = ({ 
  isOpen, 
  onClose, 
  isShared, 
  shareUrl, 
  onCopyLink,
  onToggleShare,
  isLoading
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Share Conversation"
      actions={
        <>
          {isShared && shareUrl && (
            <Button 
              onClick={onCopyLink} 
              variant="outline" 
              disabled={isLoading}
              className="hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy Link
            </Button>
          )}
          <Button 
            onClick={onToggleShare} 
            variant={isShared ? "destructive" : "default"}
            disabled={isLoading}
            className="cursor-pointer"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></span>
                {isShared ? 'Making Private...' : 'Making Public...'}
              </>
            ) : (
              isShared ? 'Make Private' : 'Make Public'
            )}
          </Button>
          <Button onClick={onClose} variant="outline" disabled={isLoading} className="cursor-pointer">
            Close
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 bg-muted/50 border border-border rounded-lg">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            isShared 
              ? 'bg-green-500/20' 
              : 'bg-blue-500/20'
          }`}>
            {isShared ? (
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            )}
          </div>
          <div className="flex-1">
            <h3 className={`font-medium ${
              isShared 
                ? 'text-green-800 dark:text-green-200' 
                : 'text-blue-800 dark:text-blue-200'
            }`}>
              {isShared ? 'Conversation is Public' : 'Conversation is Private'}
            </h3>
            <p className={`text-sm ${
              isShared 
                ? 'text-green-700 dark:text-green-300' 
                : 'text-blue-700 dark:text-blue-300'
            }`}>
              {isShared 
                ? 'Anyone with the link can view this conversation' 
                : 'Only you can access this conversation'
              }
            </p>
          </div>
        </div>
        
        {isShared && shareUrl && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Share Link:</label>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 bg-transparent text-sm text-muted-foreground truncate outline-none"
              />
              <Button 
                size="sm" 
                onClick={onCopyLink} 
                variant="ghost" 
                disabled={isLoading}
                className="hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                title="Copy link"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </Button>
            </div>
          </div>
        )}

        {!isShared && (
          <div className="text-sm text-muted-foreground">
            Making this conversation public will generate a shareable link that anyone can use to view the conversation in read-only mode.
          </div>
        )}
      </div>
    </Modal>
  );
};

export default Modal;