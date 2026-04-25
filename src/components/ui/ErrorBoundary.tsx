"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    // In production: send to Sentry
    // Sentry.captureException(error, { extra: errorInfo });
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="border border-red-500/20 bg-red-500/5 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-[var(--red)] shrink-0" />
            <div>
              <p className="font-mono text-sm font-medium text-[var(--red)]">
                Something went wrong
              </p>
              <p className="font-mono text-xs text-[var(--text-3)] mt-0.5">
                {this.state.error?.message ?? "An unexpected error occurred"}
              </p>
            </div>
          </div>

          {process.env.NODE_ENV === "development" && this.state.errorInfo && (
            <pre className="font-mono text-[10px] text-[var(--text-3)] bg-[var(--surface)] p-3 overflow-auto max-h-40 border border-[var(--border)]">
              {this.state.errorInfo.componentStack}
            </pre>
          )}

          <button
            onClick={this.reset}
            className="btn-ghost flex items-center gap-2 text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
