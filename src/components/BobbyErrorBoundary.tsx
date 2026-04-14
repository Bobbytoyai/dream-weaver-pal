import { Component, type ErrorInfo, type ReactNode } from "react";

interface BobbyErrorBoundaryProps {
  children: ReactNode;
}

interface BobbyErrorBoundaryState {
  hasError: boolean;
}

/**
 * Error boundary specific to the Bobby LCD screen.
 * Instead of showing an error dialog, it shows Bobby "sleeping"
 * and clicking anywhere retries (reloads the page).
 */
export default class BobbyErrorBoundary extends Component<BobbyErrorBoundaryProps, BobbyErrorBoundaryState> {
  state: BobbyErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): BobbyErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[BobbyLCD] Error caught — showing sleep mode", {
      message: error.message,
      componentStack: errorInfo.componentStack,
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false });
    // Also try a full reload as fallback
    setTimeout(() => {
      if (this.state.hasError) window.location.reload();
    }, 500);
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          onClick={this.handleRetry}
          className="min-h-screen flex flex-col items-center justify-center cursor-pointer select-none"
          style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)" }}
        >
          {/* Bobby sleeping face */}
          <svg viewBox="0 0 200 200" width="180" height="180">
            {/* Head glow */}
            <circle cx="100" cy="100" r="70" fill="none" stroke="rgba(100,200,255,0.15)" strokeWidth="2" />
            
            {/* Closed eyes — gentle arcs */}
            <path d="M 60 90 Q 72 100 84 90" fill="none" stroke="rgba(100,200,255,0.6)" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 116 90 Q 128 100 140 90" fill="none" stroke="rgba(100,200,255,0.6)" strokeWidth="2.5" strokeLinecap="round" />
            
            {/* Tiny smile */}
            <path d="M 85 125 Q 100 133 115 125" fill="none" stroke="rgba(100,200,255,0.4)" strokeWidth="2" strokeLinecap="round" />
            
            {/* Zzz */}
            <text x="145" y="65" fill="#6B21A8" fontSize="18" fontWeight="bold" opacity="0.9"
              style={{ animation: "bobbyZzz1 3s ease-in-out infinite" }}>
              Z
            </text>
            <text x="155" y="48" fill="#6B21A8" fontSize="14" fontWeight="bold" opacity="0.7"
              style={{ animation: "bobbyZzz2 3s ease-in-out infinite 0.3s" }}>
              z
            </text>
            <text x="162" y="35" fill="#6B21A8" fontSize="10" fontWeight="bold" opacity="0.5"
              style={{ animation: "bobbyZzz3 3s ease-in-out infinite 0.6s" }}>
              z
            </text>
          </svg>
          
          <p className="mt-4 text-sm text-blue-200/50 animate-pulse">Bobby dort...</p>
          
          <style>{`
            @keyframes bobbyZzz1 { 0%,100% { transform: translateY(0); opacity: 0.9; } 50% { transform: translateY(-6px); opacity: 0.5; } }
            @keyframes bobbyZzz2 { 0%,100% { transform: translateY(0); opacity: 0.7; } 50% { transform: translateY(-8px); opacity: 0.3; } }
            @keyframes bobbyZzz3 { 0%,100% { transform: translateY(0); opacity: 0.5; } 50% { transform: translateY(-10px); opacity: 0.2; } }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}
