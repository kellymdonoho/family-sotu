import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("App error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
          <div className="bg-white border border-stone-200 rounded-2xl p-8 shadow-sm max-w-sm w-full text-center">
            <h1 className="text-lg font-bold text-slate-900 mb-2">Something went wrong</h1>
            <p className="text-sm text-stone-500 mb-6">
              The app hit an unexpected error. Reloading usually fixes it. If it keeps happening, let each other know.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-3 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
