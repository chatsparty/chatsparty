import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../../services/websocket/useWebSocket';
import { useAuth } from '../../contexts/AuthContext';

export const WebSocketDebug: React.FC = () => {
  const { isConnected } = useWebSocket();
  const { token, user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);

  // Only show debug in development
  useEffect(() => {
    setIsVisible(process.env.NODE_ENV === 'development');
  }, []);

  if (!isVisible) return null;

  const tokenPreview = token ? token.substring(0, 20) + '...' : 'No token';
  
  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: '#f8f9fa',
      border: '1px solid #dee2e6',
      borderRadius: '5px',
      padding: '10px',
      fontSize: '12px',
      fontFamily: 'monospace',
      zIndex: 9999,
      minWidth: '250px'
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
        🔌 WebSocket Debug
      </div>
      
      <div style={{ marginBottom: '3px' }}>
        <span style={{ color: isConnected ? '#28a745' : '#dc3545' }}>
          ● {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
      
      <div style={{ marginBottom: '3px' }}>
        User: {user?.email || 'Not logged in'}
      </div>
      
      <div style={{ marginBottom: '3px' }}>
        Token: {tokenPreview}
      </div>
      
      <div style={{ fontSize: '10px', color: '#6c757d' }}>
        Check browser console for detailed logs
      </div>
      
      <button
        onClick={() => {
          console.log('[DEBUG] Current WebSocket state:');
          console.log('- Connected:', isConnected);
          console.log('- Token:', token);
          console.log('- User:', user);
          
          // Test token validation
          if (token) {
            try {
              const payload = JSON.parse(atob(token.split('.')[1]));
              console.log('- Token payload:', payload);
              console.log('- Token expires:', new Date(payload.exp * 1000));
              console.log('- Token expired:', new Date(payload.exp * 1000) < new Date());
            } catch (e) {
              console.log('- Token parse error:', e);
            }
          }
        }}
        style={{
          marginTop: '5px',
          padding: '2px 5px',
          fontSize: '10px',
          border: '1px solid #007bff',
          background: '#fff',
          borderRadius: '3px',
          cursor: 'pointer'
        }}
      >
        Log Debug Info
      </button>
    </div>
  );
};