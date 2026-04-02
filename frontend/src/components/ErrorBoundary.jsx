import { Component } from 'react';
import { Link } from 'react-router-dom';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center px-6">
          <div className="glass-card max-w-lg w-full text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-accent-red/15 flex items-center justify-center">
              <svg className="w-8 h-8 text-accent-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-text-primary mb-2">Something went wrong</h2>
            <p className="text-text-secondary text-sm mb-4">
              An unexpected error occurred. This has been logged for review.
            </p>
            {this.state.error && (
              <pre className="text-xs text-accent-red/70 bg-accent-red/5 rounded-lg p-3 mb-4 overflow-x-auto text-left">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="px-5 py-2 rounded-xl bg-accent-blue/15 text-accent-blue text-sm font-medium hover:bg-accent-blue/25 transition"
              >
                Try Again
              </button>
              <Link to="/">
                <button className="px-5 py-2 rounded-xl border border-border-subtle text-text-secondary text-sm font-medium hover:bg-white/5 transition">
                  Go to Dashboard
                </button>
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
