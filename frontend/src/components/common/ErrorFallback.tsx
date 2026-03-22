import React from 'react';
import { safeErrorToString } from '../../utils/errorHandler';

interface ErrorFallbackProps {
  error?: Error;
  resetErrorBoundary?: () => void;
}

// Helper function to check if we're in a router context
const isRouterContextAvailable = () => {
  try {
    // Try to access the router context
    return typeof window !== 'undefined' && window.location;
  } catch {
    return false;
  }
};

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetErrorBoundary }) => {
  const goBack = () => {
    try {
      // Use browser history as fallback
      window.history.back();
    } catch (e) {
      console.error('Failed to navigate back:', e);
    }
  };

  const goHome = () => {
    try {
      // Use browser location as fallback
      window.location.href = '/';
    } catch (e) {
      console.error('Failed to navigate home:', e);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-muted/10 p-4">
      <div className="bg-primary-foreground p-8 rounded-lg shadow-md max-w-md w-full">
        <h2 className="text-2xl font-bold text-destructive mb-4">
          {error?.name || 'Error'}
        </h2>
        <p className="text-muted-foreground mb-4">
          {safeErrorToString(error) || 'Something went wrong. Please try again.'}
        </p>
        
        {error?.stack && (
          <details className="mb-4">
            <summary className="cursor-pointer text-primary hover:text-primary">
              Technical Details
            </summary>
            <pre className="mt-2 p-4 bg-muted/20 rounded text-xs overflow-auto">
              {error.stack}
            </pre>
          </details>
        )}
        
        <div className="flex space-x-4 mt-6">
          <button
            onClick={goBack}
            className="px-4 py-2 bg-muted/30 hover:bg-muted/40 rounded-md transition-colors"
          >
            Go Back
          </button>
          <button
            onClick={resetErrorBoundary || goHome}
            className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary rounded-md transition-colors"
          >
            {resetErrorBoundary ? 'Try Again' : 'Go Home'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorFallback; 