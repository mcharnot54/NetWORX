'use client';

import { useState, useEffect } from 'react';
import { Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { checkConnectivity } from '@/lib/fetch-utils';
import { SafeAbortController, runtimeErrorHandler } from '@/lib/runtime-error-handler';

interface ConnectionStatusProps {
  showDetails?: boolean;
}

export default function ConnectionStatus({ showDetails = false }: ConnectionStatusProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [serverReachable, setServerReachable] = useState(true);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [checking, setChecking] = useState(false);
  const [isMounted, setIsMounted] = useState(true);

  const checkServerConnectivity = async () => {
    if (!isMounted || checking) return;

    setChecking(true);
    const controller = new SafeAbortController('connectivity-check');

    try {
      const reachable = await checkConnectivity(controller.signal);
      
      // Only update state if component is mounted and request wasn't aborted
      if (isMounted && !controller.aborted) {
        setServerReachable(reachable);
        setLastCheck(new Date());
      }
    } catch (error) {
      // Only update state if component is mounted and error is not from cancellation
      if (isMounted && !controller.aborted && 
          error instanceof Error && 
          !error.message.includes('cancelled') &&
          !error.message.includes('aborted')) {
        setServerReachable(false);
        setLastCheck(new Date());
      }
    } finally {
      controller.cleanup();
      // Only update loading state if component is mounted
      if (isMounted) {
        setChecking(false);
      }
    }
  };

  // Check connectivity on mount and set up periodic checks
  useEffect(() => {
    let interval: NodeJS.Timeout;
    let isCleanedUp = false;
    const componentId = 'connection-status-component';

    const updateOnlineStatus = () => {
      if (isCleanedUp || !isMounted) return;
      setIsOnline(navigator.onLine);
      if (navigator.onLine) {
        checkServerConnectivity();
      }
    };

    // Initial check
    checkServerConnectivity();

    // Set up periodic checks (reduced frequency to minimize load)
    interval = setInterval(() => {
      if (!isCleanedUp && isMounted) {
        checkServerConnectivity();
      }
    }, 60000); // Check every 60 seconds instead of 30

    // Listen for online/offline events
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    setIsOnline(navigator.onLine);

    // Register cleanup task
    runtimeErrorHandler.registerCleanup(componentId, () => {
      isCleanedUp = true;
      if (interval) {
        clearInterval(interval);
      }
      try {
        window.removeEventListener('online', updateOnlineStatus);
        window.removeEventListener('offline', updateOnlineStatus);
      } catch (error) {
        // Ignore cleanup errors
      }
    }, 5);

    return () => {
      isCleanedUp = true;
      setIsMounted(false);
      runtimeErrorHandler.executeCleanup(componentId);
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

  return (
    <div className="connection-status">
      <div 
        className="status-indicator"
        style={{ color: getStatusColor() }}
        title={getStatusText()}
      >
        {getStatusIcon()}
        <span className="status-text">{getStatusText()}</span>
        {checking && <span className="checking">...</span>}
      </div>

      {showDetails && lastCheck && (
        <div className="status-details">
          <small>Last checked: {lastCheck.toLocaleTimeString()}</small>
        </div>
      )}

      <style jsx>{`
        .connection-status {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.25rem;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .status-text {
          transition: color 0.3s ease;
        }

        .checking {
          opacity: 0.7;
          animation: pulse 1s infinite;
        }

        .status-details {
          font-size: 0.75rem;
          color: #6b7280;
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 0.3; }
        }

        @media (max-width: 768px) {
          .status-text {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
