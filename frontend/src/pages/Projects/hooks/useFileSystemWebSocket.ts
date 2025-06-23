import { useEffect, useState } from 'react';
import { useSocketIO } from '../../../services/socketio/useSocketIO';
import { MessageType } from '../../../services/socketio/SocketIOService';

interface FileSystemEvent {
  file_path: string;
  full_path: string;
  project_id: string;
  event_type: string;
  timestamp: string;
}

export const useFileSystemWebSocket = (projectId: string) => {
  const { subscribe, unsubscribe, onMessage, offMessage, isConnected } = useSocketIO();
  const [recentEvents, setRecentEvents] = useState<FileSystemEvent[]>([]);
  
  useEffect(() => {
    if (!isConnected || !projectId) return;
    
    const channel = `project:${projectId}:files`;
    
    // Subscribe to file system events
    subscribe(channel);
    
    const handleFileCreated = (message: any) => {
      const event: FileSystemEvent = message.data;
      setRecentEvents(prev => [event, ...prev.slice(0, 9)]); // Keep last 10 events
      console.log('File created:', event);
    };
    
    const handleFileModified = (message: any) => {
      const event: FileSystemEvent = message.data;
      setRecentEvents(prev => [event, ...prev.slice(0, 9)]);
      console.log('File modified:', event);
    };
    
    const handleFileDeleted = (message: any) => {
      const event: FileSystemEvent = message.data;
      setRecentEvents(prev => [event, ...prev.slice(0, 9)]);
      console.log('File deleted:', event);
    };
    
    const handleFolderCreated = (message: any) => {
      const event: FileSystemEvent = message.data;
      setRecentEvents(prev => [event, ...prev.slice(0, 9)]);
      console.log('Folder created:', event);
    };
    
    const handleFolderDeleted = (message: any) => {
      const event: FileSystemEvent = message.data;
      setRecentEvents(prev => [event, ...prev.slice(0, 9)]);
      console.log('Folder deleted:', event);
    };
    
    // Register message handlers
    onMessage(MessageType.FILE_CREATED, handleFileCreated);
    onMessage(MessageType.FILE_MODIFIED, handleFileModified);
    onMessage(MessageType.FILE_DELETED, handleFileDeleted);
    onMessage(MessageType.FOLDER_CREATED, handleFolderCreated);
    onMessage(MessageType.FOLDER_DELETED, handleFolderDeleted);
    
    return () => {
      // Cleanup
      offMessage(MessageType.FILE_CREATED, handleFileCreated);
      offMessage(MessageType.FILE_MODIFIED, handleFileModified);
      offMessage(MessageType.FILE_DELETED, handleFileDeleted);
      offMessage(MessageType.FOLDER_CREATED, handleFolderCreated);
      offMessage(MessageType.FOLDER_DELETED, handleFolderDeleted);
      unsubscribe(channel);
    };
  }, [isConnected, projectId, subscribe, unsubscribe, onMessage, offMessage]);
  
  return {
    recentEvents,
    clearEvents: () => setRecentEvents([])
  };
};