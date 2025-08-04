'use client';

import { useState, useEffect } from 'react';
import { Database, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { robustFetchJson, robustPost, FetchError } from '@/lib/fetch-utils';

interface DatabaseInfo {
  success: boolean;
  database_schema?: any;
  error?: string;
}

export default function DatabaseStatus() {
  const [dbStatus, setDbStatus] = useState<DatabaseInfo | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkDatabaseStatus = async () => {
    try {
      const result = await robustFetchJson('/api/init-db', {
        timeout: 10000,
        retries: 2,
      });
      setDbStatus(result);
      setLastChecked(new Date());
    } catch (error) {
      console.error('Error checking database status:', error);
      setDbStatus({
        success: false,
        error: error instanceof FetchError ? error.message : 'Failed to connect to database'
      });
      setLastChecked(new Date());
    }
  };

  const initializeDatabase = async () => {
    setIsInitializing(true);
    try {
      const response = await fetch('/api/init-db', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Database initialized successfully');
        await checkDatabaseStatus(); // Refresh status
      } else {
        console.error('❌ Database initialization failed:', result.error);
        setDbStatus(result);
      }
    } catch (error) {
      console.error('❌ Error initializing database:', error);
      setDbStatus({
        success: false,
        error: 'Failed to initialize database'
      });
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    checkDatabaseStatus();
  }, []);

  const hasProjectsTable = dbStatus?.database_schema?.projects?.length > 0;
  const hasScenariosTable = dbStatus?.database_schema?.scenarios?.length > 0;
  const hasProjectIdColumn = dbStatus?.database_schema?.scenarios?.some(
    (col: any) => col.column === 'project_id'
  );

  const isDatabaseReady = dbStatus?.success && hasProjectsTable && hasScenariosTable && hasProjectIdColumn;

  return (
    <div style={{
      backgroundColor: isDatabaseReady ? '#f0f9ff' : '#fef2f2',
      border: `2px solid ${isDatabaseReady ? '#3b82f6' : '#ef4444'}`,
      borderRadius: '0.75rem',
      padding: '1rem',
      marginBottom: '1.5rem'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '0.75rem'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <Database size={20} style={{ 
            color: isDatabaseReady ? '#3b82f6' : '#ef4444' 
          }} />
          <h4 style={{
            margin: 0,
            color: '#1f2937',
            fontSize: '1rem',
            fontWeight: '600'
          }}>
            Database Status
          </h4>
          {isDatabaseReady ? (
            <Check size={16} style={{ color: '#10b981' }} />
          ) : (
            <AlertCircle size={16} style={{ color: '#ef4444' }} />
          )}
        </div>

        <div style={{
          display: 'flex',
          gap: '0.5rem'
        }}>
          <button
            onClick={checkDatabaseStatus}
            disabled={isInitializing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.375rem 0.75rem',
              backgroundColor: 'white',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              fontSize: '0.75rem',
              cursor: 'pointer',
              color: '#6b7280'
            }}
          >
            <RefreshCw size={12} />
            Check
          </button>

          {!isDatabaseReady && (
            <button
              onClick={initializeDatabase}
              disabled={isInitializing}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.375rem 0.75rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.75rem',
                cursor: isInitializing ? 'not-allowed' : 'pointer',
                opacity: isInitializing ? 0.6 : 1
              }}
            >
              {isInitializing ? (
                <>
                  <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
                  Initializing...
                </>
              ) : (
                <>
                  <Database size={12} />
                  Initialize DB
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <div style={{
        fontSize: '0.875rem',
        color: '#6b7280',
        marginBottom: '0.5rem'
      }}>
        {isDatabaseReady ? (
          'Database is properly configured and ready for use.'
        ) : dbStatus?.success === false ? (
          `Database connection failed: ${dbStatus.error}`
        ) : (
          'Database schema is incomplete or missing required tables.'
        )}
      </div>

      {lastChecked && (
        <div style={{
          fontSize: '0.75rem',
          color: '#9ca3af'
        }}>
          Last checked: {lastChecked.toLocaleTimeString()}
        </div>
      )}

      {dbStatus?.success && !isDatabaseReady && (
        <div style={{
          marginTop: '0.75rem',
          fontSize: '0.75rem',
          color: '#374151'
        }}>
          <div>Schema status:</div>
          <ul style={{ margin: '0.25rem 0', paddingLeft: '1rem' }}>
            <li style={{ color: hasProjectsTable ? '#10b981' : '#ef4444' }}>
              Projects table: {hasProjectsTable ? '✓' : '✗'}
            </li>
            <li style={{ color: hasScenariosTable ? '#10b981' : '#ef4444' }}>
              Scenarios table: {hasScenariosTable ? '✓' : '✗'}
            </li>
            <li style={{ color: hasProjectIdColumn ? '#10b981' : '#ef4444' }}>
              Project ID column: {hasProjectIdColumn ? '✓' : '✗'}
            </li>
          </ul>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
