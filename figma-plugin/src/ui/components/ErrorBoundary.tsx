import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: ErrorInfo) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error!, this.state.errorInfo!);
      }

      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <p>An error occurred while rendering the plugin UI.</p>
          
          <details>
            <summary>Error details</summary>
            <pre>{this.state.error?.toString()}</pre>
            {this.state.errorInfo && (
              <pre>{this.state.errorInfo.componentStack}</pre>
            )}
          </details>
          
          <button 
            className="button button-secondary"
            onClick={this.handleReset}
            style={{ marginTop: '16px' }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;