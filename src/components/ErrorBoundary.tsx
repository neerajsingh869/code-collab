"use client";

import { Component, ReactNode } from "react";

// React Error Boundaries catch JS errors in the component tree
// They prevent the whole app from crashing — show a friendly message instead
// Must be a class component — this is a known React limitation
// (hooks like useErrorBoundary don't exist natively yet)

type Props = { children: ReactNode };
type State = { hasError: boolean; message: string };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  // React calls this when a child component throws
  // Returns new state to trigger the fallback UI
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-6">
          <div className="bg-[#161b22] border border-red-900 rounded-xl p-8 max-w-md w-full text-center">
            <p className="text-red-400 text-lg mb-2">Something went wrong</p>
            <p className="text-gray-600 text-sm mb-6 break-words">
              {this.state.message}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-500 text-white text-sm
                         px-6 py-2.5 rounded-lg transition-colors"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
