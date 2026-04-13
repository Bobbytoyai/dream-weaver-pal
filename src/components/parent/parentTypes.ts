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
