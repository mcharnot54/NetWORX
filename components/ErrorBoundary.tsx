'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      // Add your error logging service here
    }
    
    this.setState({
      error,
      errorInfo,
    });
  }

  retry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      const { fallback: Fallback } = this.props;
      
      if (Fallback && this.state.error) {
        return <Fallback error={this.state.error} retry={this.retry} />;
      }

      return (
        <div className="error-boundary-container">
          <div className="error-boundary-content">
            <div className="error-icon">
              <AlertTriangle size={48} />
            </div>
            <h2>Something went wrong</h2>
            <p className="error-message">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button onClick={this.retry} className="retry-button">
              <RefreshCw size={16} />
              Try Again
            </button>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="error-details">
                <summary>Error Details (Development)</summary>
                <pre>{this.state.error.stack}</pre>
                {this.state.errorInfo && (
                  <pre>{this.state.errorInfo.componentStack}</pre>
                )}
              </details>
            )}
          </div>

          <style jsx>{`
            .error-boundary-container {
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 400px;
              padding: 2rem;
              background: #fef2f2;
              border: 1px solid #fecaca;
              border-radius: 0.5rem;
              margin: 1rem;
            }

            .error-boundary-content {
              text-align: center;
              max-width: 500px;
            }

            .error-icon {
              color: #dc2626;
              margin-bottom: 1rem;
            }

            h2 {
              color: #991b1b;
              margin-bottom: 0.5rem;
              font-size: 1.5rem;
              font-weight: 600;
            }

            .error-message {
              color: #7f1d1d;
              margin-bottom: 1.5rem;
              font-size: 1rem;
              line-height: 1.5;
            }

            .retry-button {
              display: inline-flex;
              align-items: center;
              gap: 0.5rem;
              padding: 0.75rem 1.5rem;
              background: #dc2626;
              color: white;
              border: none;
              border-radius: 0.375rem;
              font-weight: 500;
              cursor: pointer;
              transition: background-color 0.2s;
            }

            .retry-button:hover {
              background: #b91c1c;
            }

            .error-details {
              margin-top: 2rem;
              text-align: left;
              background: white;
              border: 1px solid #d1d5db;
              border-radius: 0.375rem;
              padding: 1rem;
            }

            .error-details summary {
              cursor: pointer;
              font-weight: 500;
              margin-bottom: 0.5rem;
              color: #374151;
            }

            .error-details pre {
              background: #f9fafb;
              border: 1px solid #e5e7eb;
              border-radius: 0.25rem;
              padding: 0.75rem;
              font-size: 0.75rem;
              line-height: 1.4;
              color: #374151;
              overflow-x: auto;
              white-space: pre-wrap;
              word-break: break-all;
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}

// Simple fallback component for fetch errors
export const FetchErrorFallback: React.FC<{ error: Error; retry: () => void }> = ({ error, retry }) => (
  <div className="fetch-error-container">
    <div className="fetch-error-content">
      <AlertTriangle size={32} className="fetch-error-icon" />
      <h3>Network Error</h3>
      <p>
        {error.message.includes('fetch') 
          ? 'Unable to connect to the server. Please check your connection and try again.'
          : error.message
        }
      </p>
      <button onClick={retry} className="fetch-retry-button">
        <RefreshCw size={16} />
        Retry
      </button>
    </div>

    <style jsx>{`
      .fetch-error-container {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem;
        background: #fef3c7;
        border: 1px solid #fcd34d;
        border-radius: 0.5rem;
        margin: 1rem 0;
      }

      .fetch-error-content {
        text-align: center;
        max-width: 400px;
      }

      .fetch-error-icon {
        color: #d97706;
        margin-bottom: 0.75rem;
      }

      h3 {
        color: #92400e;
        margin-bottom: 0.5rem;
        font-size: 1.25rem;
        font-weight: 600;
      }

      p {
        color: #78350f;
        margin-bottom: 1rem;
        font-size: 0.875rem;
        line-height: 1.4;
      }

      .fetch-retry-button {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        background: #d97706;
        color: white;
        border: none;
        border-radius: 0.25rem;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;
      }

      .fetch-retry-button:hover {
        background: #b45309;
      }
    `}</style>
  </div>
);

export default ErrorBoundary;
