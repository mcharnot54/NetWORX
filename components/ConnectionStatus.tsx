'use client';

import { useState, useEffect } from 'react';
import { Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { checkConnectivity } from '@/lib/fetch-utils';

interface ConnectionStatusProps {
  showDetails?: boolean;
}

export default function ConnectionStatus({ showDetails = false }: ConnectionStatusProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [serverReachable, setServerReachable] = useState(true);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [checking, setChecking] = useState(false);
  const [isMounted, setIsMounted] = useState(true);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const checkServerConnectivity = async () => {
    if (!isMounted) return; // Don't start new requests if component is unmounting

    // Cancel any existing request
    if (abortController) {
      abortController.abort();
    }

    const newController = new AbortController();
    setAbortController(newController);
    setChecking(true);

    try {
      const reachable = await checkConnectivity();
      if (isMounted && !newController.signal.aborted) { // Only update state if component is still mounted and request wasn't cancelled
        setServerReachable(reachable);
        setLastCheck(new Date());
      }
    } catch (error) {
      // Ignore errors if the request was cancelled due to unmounting or new request
      if (isMounted && !newController.signal.aborted && error instanceof Error && !error.message.includes('cancelled') && !error.message.includes('aborted')) {
        setServerReachable(false);
        setLastCheck(new Date());
      }
    } finally {
      if (isMounted && !newController.signal.aborted) {
        setChecking(false);
      }
    }
  };

  useEffect(() => {
    // Check browser connectivity
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    // Initial check
    updateOnlineStatus();
    checkServerConnectivity();

    // Listen for online/offline events
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Check server connectivity periodically
    const interval = setInterval(checkServerConnectivity, 30000); // Every 30 seconds

    return () => {
      setIsMounted(false); // Mark component as unmounting
      // Cancel any pending requests
      if (abortController) {
        abortController.abort();
      }
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      clearInterval(interval);
    };
  }, []);

  const getStatusColor = () => {
    if (!isOnline) return '#ef4444'; // red
    if (!serverReachable) return '#f59e0b'; // orange
    return '#10b981'; // green
  };

  const getStatusIcon = () => {
    if (!isOnline) return <WifiOff size={16} />;
    if (!serverReachable) return <AlertTriangle size={16} />;
    return <Wifi size={16} />;
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (!serverReachable) return 'Server Unreachable';
    return 'Connected';
  };

  if (!showDetails && isOnline && serverReachable) {
    return null; // Don't show when everything is working
  }

  return (
    <div style={{
      position: 'fixed',
      top: '1rem',
      right: '1rem',
      zIndex: 1000,
      background: 'white',
      border: `2px solid ${getStatusColor()}`,
      borderRadius: '0.5rem',
      padding: '0.5rem 0.75rem',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      fontSize: '0.875rem',
      color: getStatusColor()
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center',
        animation: checking ? 'pulse 2s infinite' : 'none'
      }}>
        {getStatusIcon()}
      </div>
      <span style={{ fontWeight: '500' }}>{getStatusText()}</span>
      
      {!isOnline && (
        <div style={{
          fontSize: '0.75rem',
          color: '#6b7280',
          marginLeft: '0.5rem'
        }}>
          Check your internet connection
        </div>
      )}
      
      {isOnline && !serverReachable && (
        <button
          onClick={checkServerConnectivity}
          disabled={checking}
          style={{
            marginLeft: '0.5rem',
            padding: '0.25rem 0.5rem',
            background: getStatusColor(),
            color: 'white',
            border: 'none',
            borderRadius: '0.25rem',
            fontSize: '0.75rem',
            cursor: checking ? 'not-allowed' : 'pointer',
            opacity: checking ? 0.6 : 1
          }}
        >
          {checking ? 'Checking...' : 'Retry'}
        </button>
      )}

      {showDetails && lastCheck && (
        <div style={{
          fontSize: '0.625rem',
          color: '#9ca3af',
          marginLeft: '0.5rem'
        }}>
          Last check: {lastCheck.toLocaleTimeString()}
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
