import { Component, type ErrorInfo, type ReactNode } from "react";

interface LazyImportBoundaryProps {
  children: ReactNode;
  label?: string;
}

interface LazyImportBoundaryState {
  hasError: boolean;
}

export default class LazyImportBoundary extends Component<LazyImportBoundaryProps, LazyImportBoundaryState> {
  state: LazyImportBoundaryState = { hasError: false };

  static getDerivedStateFromError(): LazyImportBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Lazy import failed", {
      label: this.props.label,
      message: error.message,
      componentStack: errorInfo.componentStack,
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="w-full max-w-md border-4 border-foreground bg-card px-6 py-5 text-card-foreground shadow-[6px_6px_0_hsl(var(--foreground)/0.2)]">
            <div className="space-y-3 text-center">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Loading interrupted</p>
              <h2 className="text-lg font-black uppercase">Preview module failed to load</h2>
              <p className="text-sm font-bold text-muted-foreground">
                {this.props.label ? `${this.props.label} failed to load in preview.` : "A screen failed to load in preview."} Reload to continue.
              </p>
              <button
                onClick={this.handleReload}
                className="w-full border-4 border-foreground bg-primary px-4 py-3 text-sm font-black uppercase text-primary-foreground transition-transform active:scale-[0.98]"
              >
                Reload preview
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}