"use client";

import React from 'react';

interface DevErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface DevErrorBoundaryProps {
  children: React.ReactNode;
}

export class DevErrorBoundary extends React.Component<DevErrorBoundaryProps, DevErrorBoundaryState> {
  constructor(props: DevErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): DevErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error for debugging
    console.error('Development Error Boundary caught an error:', error, errorInfo);
    
    // Check if this is a fetch/network error
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      console.warn('Network error detected - likely dev server connectivity issue');
      
      // Auto-reload in development after a short delay
      if (process.env.NODE_ENV === 'development') {
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    }
    
    this.setState({
      error,
      errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.502 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            
            <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">
              Development Server Issue
            </h2>
            
            <p className="text-gray-600 text-center mb-4">
              {this.state.error?.message.includes('Failed to fetch') 
                ? 'Network connectivity issue detected. Reloading automatically...'
                : 'An unexpected error occurred during development.'
              }
            </p>
            
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Reload Page
              </button>
              
              <button
                onClick={() => this.setState({ hasError: false })}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                Try Again
              </button>
            </div>
            
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-6">
                <summary className="text-sm text-gray-500 cursor-pointer">
                  Technical Details (Development Only)
                </summary>
                <pre className="mt-2 text-xs text-gray-600 bg-gray-100 p-2 rounded overflow-auto max-h-32">
                  {this.state.error?.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
