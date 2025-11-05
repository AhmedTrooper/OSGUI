import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, Button } from '@heroui/react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { AppError, ErrorSeverity } from '@/types/global';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: AppError) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

export class ErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private readonly maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    
    const appError: AppError = {
      code: error.name || 'UNKNOWN_ERROR',
      message: error.message,
      details: {
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        errorBoundary: this.constructor.name,
      },
      timestamp: Date.now(),
      ...(error.stack && { stack: error.stack }),
      recoverable: this.isRecoverableError(error),
    };

    
    this.logError(appError);

    
    this.props.onError?.(appError);

    
    this.reportError(appError);
  }

  private isRecoverableError(error: Error): boolean {
    
    const recoverableErrors = [
      'ChunkLoadError',
      'NetworkError',
      'TimeoutError',
      'AbortError',
    ];
    
    return recoverableErrors.includes(error.name) || 
           error.message.includes('Loading chunk');
  }

  private getErrorSeverity(error: Error): ErrorSeverity {
    if (error.name === 'TypeError' && error.stack?.includes('Cannot read prop')) {
      return 'medium';
    }
    if (error.name === 'ChunkLoadError') {
      return 'low';
    }
    if (error.message.includes('Network')) {
      return 'medium';
    }
    return 'high';
  }

  private logError(error: AppError) {
    const severity = this.getErrorSeverity(this.state.error!);
    const logMethod = severity === 'critical' ? console.error : console.warn;
    
    logMethod('ErrorBoundary caught an error:', {
      id: this.state.errorId,
      severity,
      error: error.message,
      stack: error.stack,
      details: error.details,
    });
  }

  private async reportError(error: AppError) {
    try {
      
      
      const errorReport = {
        id: this.state.errorId,
        error: error.message,
        stack: error.stack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: error.timestamp,
        appVersion: import.meta.env.VITE_APP_VERSION || 'unknown',
      };

      
      if (import.meta.env.DEV) {
        console.info('Error report:', errorReport);
      }
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  }

  private handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: '',
      });
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private copyErrorDetails = () => {
    const errorDetails = {
      id: this.state.errorId,
      error: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2))
      .then(() => {
        
        console.info('Error details copied to clipboard');
      })
      .catch((err) => {
        console.error('Failed to copy error details:', err);
      });
  };

  override render() {
    if (this.state.hasError) {
      
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isRecoverable = this.state.error ? this.isRecoverableError(this.state.error) : false;
      const canRetry = this.retryCount < this.maxRetries && isRecoverable;

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
          <Card className="max-w-md w-full p-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <AlertTriangle className="h-12 w-12 text-red-500" />
              </div>
              
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Something went wrong
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  {isRecoverable 
                    ? "Don't worry, this usually fixes itself with a retry."
                    : "We've encountered an unexpected error."
                  }
                </p>
              </div>

              {import.meta.env.DEV && this.state.error && (
                <div className="text-left bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm">
                  <p className="font-mono text-red-600 dark:text-red-400">
                    {this.state.error.message}
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-2">
                {canRetry && (
                  <Button
                    color="primary"
                    onClick={this.handleRetry}
                    startContent={<RefreshCw className="h-4 w-4" />}
                  >
                    Try Again ({this.maxRetries - this.retryCount} attempts left)
                  </Button>
                )}
                
                <Button
                  variant="bordered"
                  onClick={this.handleReload}
                  startContent={<RefreshCw className="h-4 w-4" />}
                >
                  Reload App
                </Button>
                
                <Button
                  variant="light"
                  onClick={this.handleGoHome}
                  startContent={<Home className="h-4 w-4" />}
                >
                  Go Home
                </Button>

                {import.meta.env.DEV && (
                  <Button
                    variant="light"
                    size="sm"
                    onClick={this.copyErrorDetails}
                    startContent={<Bug className="h-4 w-4" />}
                  >
                    Copy Error Details
                  </Button>
                )}
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-500">
                Error ID: {this.state.errorId}
              </p>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// ...existing code...
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  return (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );
}

// ...existing code...
export function useErrorHandler() {
  return React.useCallback((error: Error, errorInfo?: { [key: string]: unknown }) => {
    const appError: AppError = {
      code: error.name || 'HANDLED_ERROR',
      message: error.message,
      details: errorInfo,
      timestamp: Date.now(),
      ...(error.stack && { stack: error.stack }),
      recoverable: false,
    };

    console.error('Handled error:', appError);
    
    
  }, []);
}