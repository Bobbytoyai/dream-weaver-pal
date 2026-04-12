/**
 * MicStatusIndicator — Shows detailed microphone / STT engine state.
 * Visible as a small pill at the bottom of the voice screen.
 */
import { Mic, MicOff, Wifi, WifiOff, Radio, AlertTriangle } from "lucide-react";
import type { ConversationState } from "@/hooks/useConversationStateMachine";

interface MicStatusIndicatorProps {
  machineState: ConversationState;
  micArmed: boolean;
  sttRunning: boolean;
  sttBackend: string;
  networkOffline: boolean;
  partialText: string;
}

type MicStatus = "active" | "armed" | "starting" | "error" | "off" | "sleep";

function deriveMicStatus(props: MicStatusIndicatorProps): MicStatus {
  const { machineState, micArmed, sttRunning } = props;
  if (machineState === "SLEEP") return "sleep";
  if (!micArmed) return "off";
  if (micArmed && !sttRunning) return "starting";
  if (machineState === "LISTENING" && sttRunning) return "active";
  if (sttRunning) return "armed";
  return "error";
}

const STATUS_CONFIG: Record<MicStatus, {
  icon: typeof Mic;
  label: string;
  bg: string;
  text: string;
  iconColor: string;
  dot?: string;
  animate?: boolean;
}> = {
  active: {
    icon: Mic,
    label: "Micro actif",
    bg: "bg-emerald-100/70",
    text: "text-emerald-700",
    iconColor: "text-emerald-600",
    dot: "bg-emerald-500",
    animate: true,
  },
  armed: {
    icon: Mic,
    label: "En veille active",
    bg: "bg-sky-100/60",
    text: "text-sky-600",
    iconColor: "text-sky-500",
    dot: "bg-sky-400",
  },
  starting: {
    icon: Radio,
    label: "Démarrage micro…",
    bg: "bg-amber-100/60",
    text: "text-amber-700",
    iconColor: "text-amber-500",
    dot: "bg-amber-400",
    animate: true,
  },
  error: {
    icon: AlertTriangle,
    label: "Micro indisponible",
    bg: "bg-red-100/60",
    text: "text-red-600",
    iconColor: "text-red-500",
    dot: "bg-red-500",
  },
  off: {
    icon: MicOff,
    label: "Micro éteint",
    bg: "bg-muted/50",
    text: "text-muted-foreground",
    iconColor: "text-muted-foreground",
  },
  sleep: {
    icon: MicOff,
    label: "Mode veille",
    bg: "bg-indigo-100/50",
    text: "text-indigo-500",
    iconColor: "text-indigo-400",
  },
};

export function MicStatusIndicator(props: MicStatusIndicatorProps) {
  const status = deriveMicStatus(props);
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;

  const backendLabel = props.sttBackend === "deepgram" ? "Deepgram" : "Navigateur";

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-sm ${cfg.bg} transition-all duration-300`}>
      {cfg.dot && (
        <span className={`w-2 h-2 rounded-full ${cfg.dot} ${cfg.animate ? "animate-pulse" : ""}`} />
      )}
      <Icon className={`w-3.5 h-3.5 ${cfg.iconColor}`} />
      <span className={`text-[10px] font-semibold ${cfg.text}`}>{cfg.label}</span>
      <span className={`text-[9px] ${cfg.text} opacity-60`}>· {backendLabel}</span>
      {props.networkOffline ? (
        <WifiOff className="w-3 h-3 text-orange-500" />
      ) : (
        <Wifi className="w-3 h-3 text-emerald-500 opacity-60" />
      )}
    </div>
  );
}