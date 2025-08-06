'use client';

import { useState, useEffect } from 'react';
import { Database, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { robustFetchJson, FetchError } from '@/lib/fetch-utils';
import { SafeAbortController, runtimeErrorHandler, safeAsync } from '@/lib/runtime-error-handler';

interface DatabaseInfo {
  success: boolean;
  error?: string;
  database_url?: string;
  connection_pool?: any;
  version?: string;
}

export default function DatabaseStatus() {
  const [dbStatus, setDbStatus] = useState<DatabaseInfo | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [isMounted, setIsMounted] = useState(true);

  const checkDatabaseStatus = async () => {
    if (!isMounted) return;

    const result = await safeAsync(async () => {
      const controller = new SafeAbortController('db-status-check');
      
      try {
        const result = await robustFetchJson('/api/init-db', {
          timeout: 10000,
          retries: 2,
          signal: controller.signal,
        });

        if (isMounted && !controller.aborted) {
          setDbStatus(result);
          setLastChecked(new Date());
        }
        
        return result;
      } finally {
        controller.cleanup();
      }
    }, 'checkDatabaseStatus');

    if (!result && isMounted) {
      setDbStatus({
        success: false,
        error: 'Failed to connect to database'
      });
      setLastChecked(new Date());
    }
  };

  const initializeDatabase = async () => {
    if (!isMounted || isInitializing) return;

    setIsInitializing(true);
    
    const result = await safeAsync(async () => {
      const controller = new SafeAbortController('db-init');
      
      try {
        const result = await robustFetchJson('/api/setup-db', {
          timeout: 30000,
          retries: 1,
          signal: controller.signal,
        });

        if (isMounted && !controller.aborted) {
          if (result.success) {
            console.log('✅ Database initialized successfully');
            setDbStatus(result);
          } else {
            console.error('❌ Database initialization failed:', result.error);
            setDbStatus(result);
          }
          setLastChecked(new Date());
        }
        
        return result;
      } finally {
        controller.cleanup();
      }
    }, 'initializeDatabase');

    if (!result && isMounted) {
      setDbStatus({
        success: false,
        error: 'Database initialization failed'
      });
      setLastChecked(new Date());
    }

    if (isMounted) {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    let isCleanedUp = false;
    const componentId = 'database-status-component';

    const initComponent = async () => {
      if (isCleanedUp) return;
      await checkDatabaseStatus();
    };

    initComponent();

    // Register cleanup
    runtimeErrorHandler.registerCleanup(componentId, () => {
      isCleanedUp = true;
    }, 5);

    return () => {
      isCleanedUp = true;
      setIsMounted(false);
      runtimeErrorHandler.executeCleanup(componentId);
    };
  }, []);

  const getStatusColor = () => {
    if (!dbStatus) return '#6b7280'; // gray
    return dbStatus.success ? '#10b981' : '#ef4444'; // green or red
  };

  const getStatusIcon = () => {
    if (!dbStatus) return <Database size={16} className="animate-pulse" />;
    return dbStatus.success ? <Check size={16} /> : <AlertCircle size={16} />;
  };

  const getStatusText = () => {
    if (!dbStatus) return 'Checking...';
    return dbStatus.success ? 'Connected' : 'Error';
  };

  return (
    <div className="database-status">
      <div className="status-header">
        <div 
          className="status-indicator"
          style={{ color: getStatusColor() }}
        >
          {getStatusIcon()}
          <span>Database: {getStatusText()}</span>
        </div>
        
        {dbStatus && !dbStatus.success && (
          <button
            onClick={initializeDatabase}
            disabled={isInitializing}
            className="init-button"
            title="Initialize Database"
          >
            {isInitializing ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <RefreshCw size={14} />
            )}
          </button>
        )}
      </div>

      {dbStatus && !dbStatus.success && dbStatus.error && (
        <div className="error-message">
          {dbStatus.error}
        </div>
      )}

      {lastChecked && (
        <div className="last-checked">
          Last checked: {lastChecked.toLocaleTimeString()}
        </div>
      )}

      <style jsx>{`
        .database-status {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding: 0.75rem;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 0.375rem;
          font-size: 0.875rem;
        }

        .status-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.5rem;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 500;
          transition: color 0.3s ease;
        }

        .init-button {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.25rem;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 0.25rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .init-button:hover:not(:disabled) {
          background: #2563eb;
        }

        .init-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .error-message {
          color: #dc2626;
          font-size: 0.75rem;
          background: #fef2f2;
          padding: 0.5rem;
          border-radius: 0.25rem;
          border: 1px solid #fecaca;
        }

        .last-checked {
          color: #6b7280;
          font-size: 0.75rem;
        }

        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
