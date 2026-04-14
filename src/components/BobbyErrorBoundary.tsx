import { Component, type ErrorInfo, type ReactNode } from "react";
import { HologramFace } from "@/components/hologram/HologramFace";

interface BobbyErrorBoundaryProps {
  children: ReactNode;
}

interface BobbyErrorBoundaryState {
  hasError: boolean;
}

const BG_HEX_MAP: Record<string, string> = {
  "soft-blue": "#E8F0FE", "soft-green": "#E8FEF0", "soft-pink": "#FEE8F0",
  "soft-purple": "#F0E8FE", "soft-yellow": "#FEF8E8", "white": "#FFFFFF",
  "dark": "#1A1A2E", "night": "#0D1B2A",
};

function getStoredBackground(): string {
  try {
    const raw = localStorage.getItem("bobby_parent_settings");
    if (raw) {
      const s = JSON.parse(raw);
      const bgId = s?.bobbyColors?.background || "soft-blue";
      return BG_HEX_MAP[bgId] || "#E8F0FE";
    }
  } catch {}
  return "#E8F0FE";
}

/**
 * Error boundary specific to the Bobby LCD screen.
 * Shows Bobby's real hologram face in "sleepy" mode.
 * Clicking anywhere retries.
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
    setTimeout(() => {
      if (this.state.hasError) window.location.reload();
    }, 500);
  };

  render() {
    if (this.state.hasError) {
      const bgHex = getStoredBackground();
      return (
        <div
          onClick={this.handleRetry}
          className="h-screen w-screen flex flex-col items-center justify-center cursor-pointer select-none overflow-hidden"
          style={{ background: bgHex }}
        >
          {/* Real Bobby hologram face — sleepy mode */}
          <div className="w-full flex-1 max-w-[500px] max-h-[70vh]">
            <HologramFace voiceState="session_end" emotionOverride="sleepy" />
          </div>

          <p className="text-sm font-bold opacity-40 mb-8" style={{ fontFamily: "'Nunito', sans-serif" }}>
            😴 Bobby dort... touche pour réveiller
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
