import type { ParentSettings } from "@/components/parentSettings";
import type {
  ParentAnalysis as Analysis,
  ParentSession as Session,
  ParentSessionMessage,
} from "@/lib/bobby/parentDashboard";
import type { SafetyAlertRecord } from "@/lib/offlineEngine";
import type { CloudProfile } from "@/lib/bobby/cloudSync";

export type { Analysis, Session, ParentSessionMessage, SafetyAlertRecord, CloudProfile };

export type Tab = "home" | "dashboard" | "sessions" | "activites" | "profil" | "reglages" | "confidentialite" | "cloud" | "personnalisation";

export interface ParentModeProps {
  childName: string;
  onClose: () => void;
  parentSettings?: ParentSettings;
  onSettingsChange?: (settings: ParentSettings) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────
export function humanizeSummary(text: string): string {
  return text
    .replace(/\bl'IA\b/gi, "Bobby")
    .replace(/\bl'intelligence artificielle\b/gi, "Bobby")
    .replace(/\ble chatbot\b/gi, "Bobby")
    .replace(/\ble bot\b/gi, "Bobby")
    .replace(/\bl'assistant\b/gi, "Bobby");
}

export const emotionLabels: Record<string, { label: string; color: string; emoji: string }> = {
  happy: { label: "Joyeux", color: "bg-secondary text-secondary-foreground", emoji: "😊" },
  sad: { label: "Triste", color: "bg-accent text-accent-foreground", emoji: "😢" },
  scared: { label: "Effrayé", color: "bg-destructive/20 text-destructive", emoji: "😰" },
  excited: { label: "Excité", color: "bg-secondary/60 text-secondary-foreground", emoji: "🤩" },
  bored: { label: "Ennuyé", color: "bg-muted text-muted-foreground", emoji: "😴" },
  curious: { label: "Curieux", color: "bg-primary/20 text-primary", emoji: "🧐" },
  angry: { label: "En colère", color: "bg-destructive/30 text-destructive", emoji: "😠" },
};

export const emotionScoreLabels: Record<string, { label: string; emoji: string }> = {
  joy: { label: "Joie", emoji: "😊" },
  joie: { label: "Joie", emoji: "😊" },
  curiosity: { label: "Curiosité", emoji: "🧐" },
  curiosité: { label: "Curiosité", emoji: "🧐" },
  frustration: { label: "Frustration", emoji: "😤" },
  fear: { label: "Peur", emoji: "😰" },
  peur: { label: "Peur", emoji: "😰" },
  sadness: { label: "Tristesse", emoji: "😢" },
  tristesse: { label: "Tristesse", emoji: "😢" },
  excitement: { label: "Excitation", emoji: "🤩" },
  excitation: { label: "Excitation", emoji: "🤩" },
  anger: { label: "Colère", emoji: "😠" },
  colère: { label: "Colère", emoji: "😠" },
  surprise: { label: "Surprise", emoji: "😲" },
  calm: { label: "Calme", emoji: "😌" },
  calme: { label: "Calme", emoji: "😌" },
  love: { label: "Amour", emoji: "❤️" },
  amour: { label: "Amour", emoji: "❤️" },
  boredom: { label: "Ennui", emoji: "😴" },
  ennui: { label: "Ennui", emoji: "😴" },
  confidence: { label: "Confiance", emoji: "💪" },
  confiance: { label: "Confiance", emoji: "💪" },
  neutral: { label: "Neutre", emoji: "😐" },
  neutre: { label: "Neutre", emoji: "😐" },
};

export const moodLabels: Record<string, { label: string; color: string; emoji: string }> = {
  positive: { label: "Positif", color: "text-success", emoji: "🟢" },
  neutral: { label: "Neutre", color: "text-muted-foreground", emoji: "🟡" },
  low: { label: "Bas", color: "text-destructive", emoji: "🔴" },
};

export const tagLabels: Record<string, { label: string; emoji: string; color: string }> = {
  fun: { label: "Fun", emoji: "🎉", color: "bg-secondary/60 text-secondary-foreground" },
  learning: { label: "Apprendre", emoji: "📚", color: "bg-primary/15 text-primary" },
  emotion: { label: "Émotion", emoji: "💛", color: "bg-accent/60 text-accent-foreground" },
  story: { label: "Histoire", emoji: "📖", color: "bg-muted text-muted-foreground" },
};

export const formatDuration = (seconds: number | null): string => {
  if (!seconds) return "—";
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}min ${secs}s`;
};

export const formatDate = (date: string): string => {
  const d = new Date(date);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};

export const formatDateShort = (date: string): string => {
  const d = new Date(date);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
};

export const formatDayHeader = (date: string): string => {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Aujourd'hui";
  if (d.toDateString() === yesterday.toDateString()) return "Hier";
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
};

// ─── Reusable UI Components ──────────────────────────────────────────

export const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
  <button onClick={() => onChange(!value)}
    className={`relative w-12 h-7 border-4 border-black transition-all duration-300 ${value ? "bg-foreground" : "bg-white"}`}>
    <div className={`w-4 h-4 bg-white border-2 border-black transition-all duration-300 ${value ? "translate-x-5 bg-[var(--retro-green)]" : "translate-x-0.5"}`} style={{ marginTop: "-2px" }} />
  </button>
);

export const SettingRow = ({ icon: Icon, title, desc, children }: {
  icon: any; title: string; desc?: string; children: React.ReactNode;
}) => (
  <div className="flex items-center justify-between py-3 px-1 border-b-2 border-black/10 last:border-0">
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <div className="w-9 h-9 border-2 border-black bg-white flex items-center justify-center shrink-0">
        <Icon className="w-4.5 h-4.5 text-foreground" />
      </div>
      <div className="min-w-0">
        <h4 className="text-[14px] font-black text-foreground uppercase">{title}</h4>
        {desc && <p className="text-[12px] text-foreground/60 leading-tight mt-0.5 font-bold">{desc}</p>}
      </div>
    </div>
    <div className="shrink-0 ml-3">{children}</div>
  </div>
);

export const Card = ({ title, icon: Icon, children, noPad, className: cx }: { title?: string; icon?: any; children: React.ReactNode; noPad?: boolean; className?: string }) => (
  <div className={`retro-card overflow-hidden ${cx || ""}`}>
    {title && (
      <div className="flex items-center gap-2.5 px-5 pt-4 pb-2">
        {Icon && <div className="w-8 h-8 bg-black flex items-center justify-center"><Icon className="w-4 h-4 text-white" /></div>}
        <h3 className="text-[15px] font-black text-foreground tracking-tight uppercase">{title}</h3>
      </div>
    )}
    <div className={noPad ? "" : "px-5 pb-4"}>{children}</div>
  </div>
);

export const ScoreGauge = ({ label, score, emoji, color, size = "md" }: { label: string; score: number; emoji: string; color: string; size?: "sm" | "md" | "lg" }) => {
  const dims = size === "lg" ? "w-20 h-20" : size === "sm" ? "w-12 h-12" : "w-14 h-14";
  const textSize = size === "lg" ? "text-lg" : "text-sm";
  const labelSize = size === "lg" ? "text-[11px]" : "text-[10px]";
  const scoreLevel = score >= 75 ? "Excellent" : score >= 50 ? "Bien" : score >= 30 ? "À suivre" : "Faible";
  const levelColor = score >= 75 ? "text-green-600" : score >= 50 ? "text-primary" : score >= 30 ? "text-orange-500" : "text-destructive";
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`relative ${dims}`}>
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          <path d="M18 2.0845a15.9155 15.9155 0 010 31.831 15.9155 15.9155 0 010-31.831"
            fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
          <path d="M18 2.0845a15.9155 15.9155 0 010 31.831 15.9155 15.9155 0 010-31.831"
            fill="none" stroke={color} strokeWidth="3"
            strokeDasharray={`${score}, 100`}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-base">{emoji}</span>
      </div>
      <span className={`${labelSize} text-muted-foreground font-medium text-center`}>{label}</span>
      <span className={`${textSize} font-bold text-foreground`}>{score}</span>
      {size === "lg" && <span className={`text-[9px] font-semibold ${levelColor}`}>{scoreLevel}</span>}
    </div>
  );
};

export const StatPill = ({ emoji, value, label }: { emoji: string; value: string | number; label: string }) => (
  <div className="flex flex-col items-center gap-0.5">
    <span className="text-xl">{emoji}</span>
    <span className="text-lg font-bold text-foreground">{value}</span>
    <span className="text-[10px] text-muted-foreground">{label}</span>
  </div>
);

export const tabs: { id: Tab; icon: any; label: string; emoji?: string }[] = [];
// We'll define tab config inline in ParentMode since it needs lucide icons
