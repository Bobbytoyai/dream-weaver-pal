import { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from "react";
import {
  ArrowLeft, Clock, MessageSquare, Heart, Brain, Loader2, RefreshCw,
  Mic, BookOpen, Timer, Sparkles, Shield, Camera, Volume2, VolumeX,
  Play, Pause, AlertTriangle, TrendingUp, Trash2, ChevronRight, Gamepad2,
  BarChart3, Calendar, User, Zap, Moon, Sun, Hand, Lock,
  Download, ToggleLeft, Settings, Eye, EyeOff, FileText, Tag, X,
  SkipForward, SkipBack, Activity, Bell, ChevronDown, Star
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import StoryLibrary from "@/components/StoryLibrary";
import ContentCategories from "@/components/ContentCategories";
import { preloadVoice as preloadPiperVoice } from "@/lib/piperTTS";
import ConfirmDialog from "@/components/ConfirmDialog";

import { ParentSettings, DEFAULT_PARENT_SETTINGS, BOBBY_COLORS } from "./parentSettings";
export type { ParentSettings };
export { DEFAULT_PARENT_SETTINGS };

// ─── Types ───────────────────────────────────────────────────────────

interface ParentModeProps {
  childName: string;
  onClose: () => void;
  parentSettings?: ParentSettings;
  onSettingsChange?: (settings: ParentSettings) => void;
}

interface Session {
  id: string;
  child_name: string;
  child_age: number;
  started_at: string;
  ended_at: string | null;
  message_count: number;
  detected_emotions: string[] | null;
  topics: string[] | null;
  ai_summary: string | null;
  duration_seconds: number | null;
  tags: string[] | null;
}

interface Analysis {
  id: string;
  session_id: string;
  audio_path: string | null;
  full_transcription: string | null;
  summary: string | null;
  emotions: Record<string, number>;
  topics_detected: string[];
  behavior_insights: string[];
  engagement_level: string;
  attention_span: string | null;
  mood_score: string | null;
  alerts: Array<{ type: string; message: string }>;
  created_at: string;
  sociability_score: number | null;
  curiosity_score: number | null;
  emotional_stability_score: number | null;
  extracted_interests: string[] | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────

const emotionLabels: Record<string, { label: string; color: string; emoji: string }> = {
  happy: { label: "Joyeux", color: "bg-secondary text-secondary-foreground", emoji: "😊" },
  sad: { label: "Triste", color: "bg-accent text-accent-foreground", emoji: "😢" },
  scared: { label: "Effrayé", color: "bg-destructive/20 text-destructive", emoji: "😰" },
  excited: { label: "Excité", color: "bg-secondary/60 text-secondary-foreground", emoji: "🤩" },
  bored: { label: "Ennuyé", color: "bg-muted text-muted-foreground", emoji: "😴" },
  curious: { label: "Curieux", color: "bg-primary/20 text-primary", emoji: "🧐" },
  angry: { label: "En colère", color: "bg-destructive/30 text-destructive", emoji: "😠" },
};

const emotionScoreLabels: Record<string, { label: string; emoji: string }> = {
  joy: { label: "Joie", emoji: "😊" },
  curiosity: { label: "Curiosité", emoji: "🧐" },
  frustration: { label: "Frustration", emoji: "😤" },
  fear: { label: "Peur", emoji: "😰" },
  sadness: { label: "Tristesse", emoji: "😢" },
  excitement: { label: "Excitation", emoji: "🤩" },
};

const moodLabels: Record<string, { label: string; color: string; emoji: string }> = {
  positive: { label: "Positif", color: "text-success", emoji: "🟢" },
  neutral: { label: "Neutre", color: "text-muted-foreground", emoji: "🟡" },
  low: { label: "Bas", color: "text-destructive", emoji: "🔴" },
};

const tagLabels: Record<string, { label: string; emoji: string; color: string }> = {
  fun: { label: "Fun", emoji: "🎉", color: "bg-secondary/60 text-secondary-foreground" },
  learning: { label: "Apprentissage", emoji: "📚", color: "bg-primary/15 text-primary" },
  emotion: { label: "Émotion", emoji: "💛", color: "bg-accent/60 text-accent-foreground" },
  story: { label: "Histoire", emoji: "📖", color: "bg-muted text-muted-foreground" },
};

const ALL_THEMES = [
  { id: "princesse", label: "👑 Princesse" },
  { id: "pirate", label: "🏴‍☠️ Pirate" },
  { id: "espace", label: "🚀 Espace" },
  { id: "animaux", label: "🐉 Animaux" },
  { id: "éducatif", label: "🧠 Éducatif" },
  { id: "magie", label: "✨ Magie" },
];

const formatDuration = (seconds: number | null): string => {
  if (!seconds) return "—";
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}min ${secs}s`;
};

const formatDate = (date: string): string => {
  const d = new Date(date);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};

const formatDateShort = (date: string): string => {
  const d = new Date(date);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
};

const formatDayHeader = (date: string): string => {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Aujourd'hui";
  if (d.toDateString() === yesterday.toDateString()) return "Hier";
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
};

// ─── Reusable UI Components ──────────────────────────────────────────

const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
  <button onClick={() => onChange(!value)}
    className={`relative w-12 h-7 rounded-full transition-all duration-300 ${value ? "bg-primary" : "bg-muted"}`}>
    <div className={`w-5 h-5 rounded-full bg-card shadow-md transition-all duration-300 ${value ? "translate-x-6" : "translate-x-1"}`} />
  </button>
);

const SettingRow = ({ icon: Icon, title, desc, children }: {
  icon: any; title: string; desc?: string; children: React.ReactNode;
}) => (
  <div className="flex items-center justify-between py-3 px-1">
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <div className="w-8 h-8 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="min-w-0">
        <h4 className="text-[13px] font-semibold text-foreground">{title}</h4>
        {desc && <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{desc}</p>}
      </div>
    </div>
    <div className="shrink-0 ml-3">{children}</div>
  </div>
);

const Card = ({ title, icon: Icon, children, noPad, className: cx }: { title?: string; icon?: any; children: React.ReactNode; noPad?: boolean; className?: string }) => (
  <div className={`bg-card rounded-2xl overflow-hidden ${cx || ""}`}>
    {title && (
      <div className="flex items-center gap-2.5 px-5 pt-4 pb-2">
        {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
        <h3 className="text-[13px] font-semibold text-foreground tracking-tight">{title}</h3>
      </div>
    )}
    <div className={noPad ? "" : "px-5 pb-4"}>{children}</div>
  </div>
);

const ScoreGauge = ({ label, score, emoji, color }: { label: string; score: number; emoji: string; color: string }) => (
  <div className="flex flex-col items-center gap-1">
    <div className="relative w-14 h-14">
      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
        <path d="M18 2.0845a15.9155 15.9155 0 010 31.831 15.9155 15.9155 0 010-31.831"
          fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
        <path d="M18 2.0845a15.9155 15.9155 0 010 31.831 15.9155 15.9155 0 010-31.831"
          fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={`${score}, 100`}
          strokeLinecap="round" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-base">{emoji}</span>
    </div>
    <span className="text-[10px] text-muted-foreground font-medium text-center">{label}</span>
    <span className="text-sm font-bold text-foreground">{score}</span>
  </div>
);

const StatPill = ({ emoji, value, label }: { emoji: string; value: string | number; label: string }) => (
  <div className="flex flex-col items-center gap-0.5">
    <span className="text-xl">{emoji}</span>
    <span className="text-lg font-bold text-foreground">{value}</span>
    <span className="text-[10px] text-muted-foreground">{label}</span>
  </div>
);

// ─── Tab config (5 tabs) ────────────────────────────────────────

type Tab = "dashboard" | "sessions" | "activites" | "histoires" | "profil" | "reglages" | "confidentialite";

const tabs: { id: Tab; icon: any; label: string }[] = [
  { id: "dashboard", icon: BarChart3, label: "Tableau" },
  { id: "sessions", icon: MessageSquare, label: "Sessions" },
  { id: "activites", icon: Gamepad2, label: "Activités" },
  { id: "histoires", icon: BookOpen, label: "Histoires" },
  { id: "profil", icon: User, label: "Profil" },
  { id: "reglages", icon: Settings, label: "Réglages" },
  { id: "confidentialite", icon: Shield, label: "Privé" },
];

// ─── Main Component ───────────────────────────────────────────────

const ParentMode = ({ childName, onClose, parentSettings, onSettingsChange }: ParentModeProps) => {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<Analysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [sessionMessages, setSessionMessages] = useState<Array<{ role: string; content: string; created_at: string; detected_emotion: string | null }>>([]);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [settings, setSettings] = useState<ParentSettings>(() => ({
    ...DEFAULT_PARENT_SETTINGS,
    ...(parentSettings || {}),
    contentModes: { ...DEFAULT_PARENT_SETTINGS.contentModes, ...(parentSettings?.contentModes || {}) },
    nightMode: { ...DEFAULT_PARENT_SETTINGS.nightMode, ...(parentSettings?.nightMode || {}) },
    interactions: { ...DEFAULT_PARENT_SETTINGS.interactions, ...(parentSettings?.interactions || {}) },
  }));
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [audioSpeed, setAudioSpeed] = useState<number>(1);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [newBlockedTopic, setNewBlockedTopic] = useState("");
  const [activeMessageIdx, setActiveMessageIdx] = useState<number>(-1);
  const [reglagesSection, setReglagesSection] = useState<"voix" | "contenu" | "limites">("voix");
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string; description: string; confirmLabel?: string;
    variant?: "danger" | "warning"; onConfirm: () => void;
  } | null>(null);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressInterval = useRef<number | null>(null);
  const [piperDownloading, setPiperDownloading] = useState(false);
  const [piperProgress, setPiperProgress] = useState<Record<string, number>>({});
  const [piperDone, setPiperDone] = useState(false);

  useEffect(() => { loadData(); }, []);

  const updateSetting = <K extends keyof ParentSettings>(key: K, value: ParentSettings[K]) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    onSettingsChange?.(next);
  };

  const updateNested = <K extends keyof ParentSettings>(key: K, subKey: string, value: any) => {
    const current = settings[key] as any;
    const next = { ...settings, [key]: { ...current, [subKey]: value } };
    setSettings(next);
    onSettingsChange?.(next);
  };

  const toggleTheme = (theme: string) => {
    const themes = settings.enabledThemes.includes(theme)
      ? settings.enabledThemes.filter(t => t !== theme)
      : [...settings.enabledThemes, theme];
    updateSetting("enabledThemes", themes);
  };

  const loadData = async () => {
    setLoading(true);
    const [sessionsRes, analysesRes] = await Promise.all([
      supabase.from("child_sessions").select("*").order("started_at", { ascending: false }).limit(50),
      supabase.from("conversation_analyses").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    if (sessionsRes.data) setSessions(sessionsRes.data as any);
    if (analysesRes.data) setAnalyses(analysesRes.data as any);
    setLoading(false);
  };

  const analyzeSession = async (session: Session) => {
    setSelectedSession(session);
    const { data: msgs } = await supabase
      .from("session_messages")
      .select("role, content, created_at, detected_emotion")
      .eq("session_id", session.id)
      .order("created_at", { ascending: true });
    setSessionMessages(msgs || []);

    const existing = analyses.find(a => a.session_id === session.id);
    if (existing) { setSelectedAnalysis(existing); return; }
    setAnalyzing(true);
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-conversation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ sessionId: session.id }),
        }
      );
      if (resp.ok) {
        const data = await resp.json();
        setSelectedAnalysis(data.analysis);
        loadData();
      }
    } catch { /* ignore */ } finally { setAnalyzing(false); }
  };

  // ─── Audio Player ──────────────────────────────────────────────

  const playAudio = async (audioPath: string) => {
    if (playingAudio === audioPath) {
      audioRef.current?.pause();
      setPlayingAudio(null);
      if (progressInterval.current) clearInterval(progressInterval.current);
      return;
    }
    const { data } = await supabase.storage.from("conversation-audio").createSignedUrl(audioPath, 3600);
    if (data?.signedUrl) {
      if (audioRef.current) { audioRef.current.pause(); }
      if (progressInterval.current) clearInterval(progressInterval.current);
      const audio = new Audio(data.signedUrl);
      audioRef.current = audio;
      audio.playbackRate = audioSpeed;
      audio.onloadedmetadata = () => setAudioDuration(audio.duration);
      audio.onended = () => {
        setPlayingAudio(null);
        setAudioProgress(0);
        setActiveMessageIdx(-1);
        if (progressInterval.current) clearInterval(progressInterval.current);
      };
      audio.play();
      setPlayingAudio(audioPath);
      progressInterval.current = window.setInterval(() => {
        if (audio.duration > 0) {
          setAudioProgress((audio.currentTime / audio.duration) * 100);
          if (sessionMessages.length > 0) {
            const msgIdx = Math.min(
              Math.floor((audio.currentTime / audio.duration) * sessionMessages.length),
              sessionMessages.length - 1
            );
            setActiveMessageIdx(msgIdx);
          }
        }
      }, 200);
    }
  };

  const seekAudio = (pct: number) => {
    if (audioRef.current && audioDuration > 0) {
      audioRef.current.currentTime = (pct / 100) * audioDuration;
      setAudioProgress(pct);
    }
  };

  const skipMessage = (direction: 1 | -1) => {
    if (!audioRef.current || !audioDuration || sessionMessages.length === 0) return;
    const nextIdx = Math.max(0, Math.min(sessionMessages.length - 1, activeMessageIdx + direction));
    const pct = (nextIdx / sessionMessages.length) * 100;
    seekAudio(pct);
    setActiveMessageIdx(nextIdx);
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = audioSpeed;
    }
  }, [audioSpeed]);

  const deleteSession = async (sessionId: string) => {
    await supabase.from("conversation_analyses").delete().eq("session_id", sessionId);
    await supabase.from("session_messages").delete().eq("session_id", sessionId);
    await supabase.from("child_sessions").delete().eq("id", sessionId);
    await supabase.storage.from("conversation-audio").remove([`${sessionId}.webm`]);
    loadData();
    setSelectedSession(null);
    setSelectedAnalysis(null);
  };

  const exportSessionPDF = (session: Session, analysis: Analysis | null) => {
    const lines: string[] = [
      `RAPPORT DE SESSION — ${childName}`,
      `═══════════════════════════════════════`,
      `Date : ${formatDate(session.started_at)}`,
      `Durée : ${formatDuration(session.duration_seconds)}`,
      `Messages : ${session.message_count}`,
      ``,
    ];
    if (analysis) {
      lines.push(`RÉSUMÉ`, `───────`, analysis.summary || "Aucun résumé", ``);
      if (analysis.emotions && Object.keys(analysis.emotions).length > 0) {
        lines.push(`ÉMOTIONS`, `───────`);
        Object.entries(analysis.emotions).filter(([, v]) => v > 0).forEach(([k, v]) => {
          const info = emotionScoreLabels[k] || { label: k, emoji: "" };
          lines.push(`  ${info.emoji} ${info.label}: ${v}%`);
        });
        lines.push(``);
      }
      if (analysis.sociability_score != null) {
        lines.push(`SCORES`, `───────`);
        lines.push(`  🤝 Sociabilité : ${analysis.sociability_score}/100`);
        lines.push(`  🔍 Curiosité : ${analysis.curiosity_score}/100`);
        lines.push(`  ⚖️ Stabilité : ${analysis.emotional_stability_score}/100`);
        lines.push(``);
      }
      if (analysis.extracted_interests?.length) {
        lines.push(`INTÉRÊTS`, `───────`, `  ${analysis.extracted_interests.join(", ")}`, ``);
      }
      if (analysis.topics_detected?.length) {
        lines.push(`SUJETS`, `───────`, `  ${analysis.topics_detected.join(", ")}`, ``);
      }
      if (analysis.behavior_insights?.length) {
        lines.push(`OBSERVATIONS`, `───────`);
        analysis.behavior_insights.forEach(i => lines.push(`  • ${i}`));
        lines.push(``);
      }
      if (analysis.full_transcription) {
        lines.push(`TRANSCRIPTION`, `───────`, analysis.full_transcription);
      }
    }
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rapport-${childName}-${new Date(session.started_at).toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Computed ─────────────────────────────────────────────────

  const totalSessions = sessions.length;
  const totalMessages = sessions.reduce((acc, s) => acc + s.message_count, 0);
  const totalDuration = sessions.reduce((acc, s) => acc + (s.duration_seconds || 0), 0);
  const allEmotions = sessions.flatMap(s => s.detected_emotions || []);
  const emotionCounts = allEmotions.reduce((acc, e) => { acc[e] = (acc[e] || 0) + 1; return acc; }, {} as Record<string, number>);

  const recentAnalyses = analyses.slice(0, 7);

  const allAlerts = analyses.flatMap(a => (a.alerts || []).map(alert => ({
    ...alert, date: a.created_at, sessionId: a.session_id,
  })));

  const smartAlerts = useMemo(() => {
    const alerts: Array<{ type: string; message: string; severity: "info" | "warning" | "critical" }> = [];
    const recentSadness = recentAnalyses.filter(a => ((a.emotions as any)?.sadness || 0) > 40);
    if (recentSadness.length >= 3) {
      alerts.push({ type: "sadness", message: "Tristesse répétée détectée sur plusieurs sessions", severity: "warning" });
    }
    const recentFrustration = recentAnalyses.filter(a => ((a.emotions as any)?.frustration || 0) > 50);
    if (recentFrustration.length >= 2) {
      alerts.push({ type: "frustration", message: "Pattern de frustration observé récemment", severity: "warning" });
    }
    const lowEngagement = recentAnalyses.filter(a => a.engagement_level === "low");
    if (lowEngagement.length >= 3) {
      alerts.push({ type: "engagement", message: "Engagement faible sur les dernières sessions", severity: "info" });
    }
    allAlerts.slice(0, 3).forEach(a => {
      alerts.push({ type: a.type, message: a.message, severity: "warning" });
    });
    return alerts;
  }, [recentAnalyses, allAlerts]);

  const allTopics = analyses.flatMap(a => a.topics_detected || []);
  const topicCounts = allTopics.reduce((acc, t) => { acc[t] = (acc[t] || 0) + 1; return acc; }, {} as Record<string, number>);
  const topTopics = Object.entries(topicCounts).sort(([, a], [, b]) => b - a).slice(0, 8);

  const today = new Date().toDateString();
  const todaySessions = sessions.filter(s => new Date(s.started_at).toDateString() === today);
  const todayDuration = todaySessions.reduce((acc, s) => acc + (s.duration_seconds || 0), 0);
  const dominantMood = Object.entries(emotionCounts).sort(([, a], [, b]) => b - a)[0];

  const avgScores = useMemo(() => {
    const scored = analyses.filter(a => a.sociability_score != null);
    if (scored.length === 0) return null;
    return {
      sociability: Math.round(scored.reduce((s, a) => s + (a.sociability_score || 0), 0) / scored.length),
      curiosity: Math.round(scored.reduce((s, a) => s + (a.curiosity_score || 0), 0) / scored.length),
      stability: Math.round(scored.reduce((s, a) => s + (a.emotional_stability_score || 0), 0) / scored.length),
    };
  }, [analyses]);

  // Real emotion averages from actual analyses only
  const avgEmotions = useMemo(() => {
    if (recentAnalyses.length === 0) return {};
    return Object.keys(emotionScoreLabels).reduce((acc, key) => {
      const values = recentAnalyses.map(a => ((a.emotions as any)?.[key] || 0)).filter(v => v > 0);
      if (values.length > 0) {
        acc[key] = Math.round(values.reduce((s, v) => s + v, 0) / values.length);
      }
      return acc;
    }, {} as Record<string, number>);
  }, [recentAnalyses]);

  const allInterests = useMemo(() => {
    const counts: Record<string, number> = {};
    analyses.forEach(a => {
      (a.extracted_interests || []).forEach(i => { counts[i] = (counts[i] || 0) + 1; });
    });
    return Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 12);
  }, [analyses]);

  // Chart data — only real data, no interpolation
  const emotionChartData = useMemo(() => {
    const days: { date: string; label: string; joy: number; curiosity: number; frustration: number; fear: number; sadness: number; excitement: number; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" });
      days.push({ date: dateStr, label, joy: 0, curiosity: 0, frustration: 0, fear: 0, sadness: 0, excitement: 0, count: 0 });
    }
    for (const a of analyses) {
      const aDate = a.created_at.slice(0, 10);
      const day = days.find(d => d.date === aDate);
      if (!day) continue;
      const emo = (a.emotions || {}) as Record<string, number>;
      day.joy += emo.joy || 0;
      day.curiosity += emo.curiosity || 0;
      day.frustration += emo.frustration || 0;
      day.fear += emo.fear || 0;
      day.sadness += emo.sadness || 0;
      day.excitement += emo.excitement || 0;
      day.count++;
    }
    return days.map(d => ({
      name: d.label,
      Joie: d.count > 0 ? Math.round(d.joy / d.count) : null,
      Curiosité: d.count > 0 ? Math.round(d.curiosity / d.count) : null,
      Excitation: d.count > 0 ? Math.round(d.excitement / d.count) : null,
      Frustration: d.count > 0 ? Math.round(d.frustration / d.count) : null,
      Peur: d.count > 0 ? Math.round(d.fear / d.count) : null,
      Tristesse: d.count > 0 ? Math.round(d.sadness / d.count) : null,
    }));
  }, [analyses]);

  // Average session duration
  const avgSessionDuration = useMemo(() => {
    const withDuration = sessions.filter(s => s.duration_seconds && s.duration_seconds > 0);
    if (withDuration.length === 0) return 0;
    return Math.round(withDuration.reduce((s, ses) => s + (ses.duration_seconds || 0), 0) / withDuration.length);
  }, [sessions]);

  // Average messages per session
  const avgMessagesPerSession = useMemo(() => {
    if (sessions.length === 0) return 0;
    return Math.round(sessions.reduce((s, ses) => s + ses.message_count, 0) / sessions.length);
  }, [sessions]);

  // Engagement distribution
  const engagementDist = useMemo(() => {
    const dist = { high: 0, medium: 0, low: 0 };
    recentAnalyses.forEach(a => {
      if (a.engagement_level === "high") dist.high++;
      else if (a.engagement_level === "medium") dist.medium++;
      else dist.low++;
    });
    return dist;
  }, [recentAnalyses]);

  // Mood distribution
  const moodDist = useMemo(() => {
    const dist = { positive: 0, neutral: 0, low: 0 };
    recentAnalyses.forEach(a => {
      const mood = a.mood_score || "neutral";
      if (mood === "positive") dist.positive++;
      else if (mood === "low") dist.low++;
      else dist.neutral++;
    });
    return dist;
  }, [recentAnalyses]);

  // Weekly activity (sessions per day of week)
  const weeklyActivity = useMemo(() => {
    const days = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
    const counts = new Array(7).fill(0);
    sessions.forEach(s => {
      const d = new Date(s.started_at).getDay();
      counts[d === 0 ? 6 : d - 1]++;
    });
    return days.map((label, i) => ({ label, count: counts[i] }));
  }, [sessions]);

  // Last session info
  const lastSession = sessions[0] || null;
  const lastAnalysis = lastSession ? analyses.find(a => a.session_id === lastSession.id) : null;

  const filteredSessions = useMemo(() => {
    if (!tagFilter) return sessions;
    return sessions.filter(s => s.tags?.includes(tagFilter));
  }, [sessions, tagFilter]);

  // Smart daily insights — picks one relevant insight
  const dailyInsights = useMemo(() => {
    const insights: string[] = [];
    if (recentAnalyses.length === 0) return insights;

    // Dominant emotion
    const sortedEmotions = Object.entries(avgEmotions).sort(([, a], [, b]) => b - a);
    if (sortedEmotions.length > 0) {
      const [topEmo, topVal] = sortedEmotions[0];
      const info = emotionScoreLabels[topEmo];
      if (info && topVal > 40) {
        insights.push(`${info.emoji} ${childName} est principalement ${info.label.toLowerCase()} (${topVal}%) dans ses échanges.`);
      }
    }

    // Interests
    if (allInterests.length > 0) {
      const top3 = allInterests.slice(0, 3).map(([i]) => i).join(", ");
      insights.push(`🎯 Centres d'intérêt principaux : ${top3}.`);
    }

    // Engagement
    if (engagementDist.high > 0) {
      const pct = Math.round((engagementDist.high / recentAnalyses.length) * 100);
      insights.push(`🔥 ${pct}% des sessions sont très engagées.`);
    }

    // Scores
    if (avgScores && avgScores.curiosity > 60) {
      insights.push(`🔍 Curiosité élevée (${avgScores.curiosity}/100) — Bobby stimule l'apprentissage !`);
    }

    return insights;
  }, [recentAnalyses, avgEmotions, allInterests, engagementDist, avgScores, childName]);

  // ─── Key moments (emotional highlights) ───────────────────────
  const keyMoments = useMemo(() => {
    if (sessionMessages.length === 0) return [];
    return sessionMessages
      .map((msg, idx) => ({ ...msg, idx }))
      .filter(msg => msg.detected_emotion && msg.detected_emotion !== "neutral" && msg.role === "user")
      .slice(0, 5);
  }, [sessionMessages]);

  const jumpToMoment = (msgIdx: number) => {
    if (!audioRef.current || !audioDuration || sessionMessages.length === 0) {
      // No audio recording — use TTS to read the moment
      speakMessage(sessionMessages[msgIdx]?.content || "");
      return;
    }
    const pct = (msgIdx / sessionMessages.length) * 100;
    seekAudio(pct);
    setActiveMessageIdx(msgIdx);
  };

  const [ttsPlaying, setTtsPlaying] = useState<string | null>(null);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);

  const speakMessage = async (text: string) => {
    if (!text) return;
    
    // Toggle off if same text
    if (ttsPlaying === text) {
      ttsAudioRef.current?.pause();
      setTtsPlaying(null);
      return;
    }

    // Stop previous
    ttsAudioRef.current?.pause();
    setTtsPlaying(text);

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts-stream`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text: text.slice(0, 500), voiceProfile: "female" }),
        }
      );
      if (!resp.ok) throw new Error("TTS failed");
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      ttsAudioRef.current = audio;
      audio.onended = () => {
        setTtsPlaying(null);
        URL.revokeObjectURL(url);
      };
      audio.play();
    } catch {
      setTtsPlaying(null);
    }
  };

  // ─── Sessions grouped by day ──────────────────────────────────
  const groupedSessions = useMemo(() => {
    const groups: { day: string; sessions: Session[] }[] = [];
    for (const session of filteredSessions) {
      const dayKey = new Date(session.started_at).toDateString();
      const existing = groups.find(g => g.day === dayKey);
      if (existing) {
        existing.sessions.push(session);
      } else {
        groups.push({ day: dayKey, sessions: [session] });
      }
    }
    return groups;
  }, [filteredSessions]);

  // ─── Presets ──────────────────────────────────────────────────

  const applyPreset = (name: string) => {
    let next = { ...settings };
    switch (name) {
      case "calm":
        next.voiceSpeed = "slow"; next.personality = "calm";
        next.storyDuration = "longue"; next.sfxVolume = 0.3;
        break;
      case "game":
        next.contentModes = { ...next.contentModes, games: true };
        next.personality = "energetic"; next.voiceSpeed = "fast";
        break;
      case "night":
        next.nightMode = { ...next.nightMode, active: true };
        next.personality = "calm"; next.voiceSpeed = "slow"; next.sfxVolume = 0.2;
        break;
      case "education":
        next.personality = "educational";
        next.contentModes = { ...next.contentModes, educational: true };
        break;
    }
    setSettings(next);
    onSettingsChange?.(next);
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER: DASHBOARD
  // ═══════════════════════════════════════════════════════════════

  const emotionConfig: Record<string, { emoji: string; color: string }> = {
    Joie: { emoji: "😊", color: "hsl(145, 65%, 42%)" },
    Curiosité: { emoji: "🧐", color: "hsl(210, 80%, 55%)" },
    Excitation: { emoji: "🤩", color: "hsl(36, 90%, 50%)" },
    Frustration: { emoji: "😤", color: "hsl(0, 75%, 55%)" },
    Peur: { emoji: "😰", color: "hsl(260, 45%, 58%)" },
    Tristesse: { emoji: "😢", color: "hsl(0, 0%, 55%)" },
  };

  const renderDashboard = () => {
    const hasData = totalSessions > 0;
    const hasAnalysis = recentAnalyses.length > 0;

    return (
    <div className="p-4 space-y-3">

      {/* ═══ 1. KPI HERO ROW ═══ */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { value: totalSessions, label: "Sessions", emoji: "💬", accent: "from-blue-500/15 to-blue-600/5" },
          { value: totalMessages, label: "Messages", emoji: "📝", accent: "from-green-500/15 to-green-600/5" },
          { value: formatDuration(totalDuration), label: "Temps total", emoji: "⏱️", accent: "from-purple-500/15 to-purple-600/5" },
          { value: todaySessions.length, label: "Aujourd'hui", emoji: "📅", accent: "from-orange-500/15 to-orange-600/5" },
        ].map((kpi) => (
          <div key={kpi.label} className={`bg-gradient-to-br ${kpi.accent} rounded-2xl p-3 text-center border border-border/30`}>
            <span className="text-lg block">{kpi.emoji}</span>
            <p className="text-base font-extrabold text-foreground mt-1">{kpi.value}</p>
            <p className="text-[9px] text-muted-foreground font-medium mt-0.5">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* ═══ 2. INSIGHTS INTELLIGENTS ═══ */}
      {dailyInsights.length > 0 && (
        <div className="bg-card rounded-2xl p-4 border border-border/30">
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-4 h-4 text-primary" />
            <h3 className="text-[13px] font-bold text-foreground">Analyse de la semaine</h3>
          </div>
          <div className="space-y-2">
            {dailyInsights.map((insight, i) => (
              <p key={i} className="text-[12px] text-foreground/80 leading-relaxed pl-2 border-l-2 border-primary/20">
                {insight}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* ═══ 3. ALERTES ═══ */}
      {smartAlerts.length > 0 && (
        <div className="bg-card rounded-2xl p-4 border border-destructive/20">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-4 h-4 text-destructive" />
            <h3 className="text-[13px] font-bold text-foreground">Alertes</h3>
            <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-bold">{smartAlerts.length}</span>
          </div>
          <div className="space-y-2">
            {smartAlerts.map((alert, i) => (
              <div key={i} className={`flex items-start gap-2.5 p-2.5 rounded-xl ${
                alert.severity === "critical" ? "bg-destructive/10" :
                alert.severity === "warning" ? "bg-destructive/5" : "bg-muted/50"
              }`}>
                <span className="text-sm mt-0.5">{alert.severity === "critical" ? "🔴" : alert.severity === "warning" ? "🟡" : "🔵"}</span>
                <p className="text-[12px] text-foreground leading-relaxed">{alert.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ 4. SCORES COMPORTEMENTAUX ═══ */}
      {avgScores && (
        <div className="bg-card rounded-2xl p-4 border border-border/30">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-[13px] font-bold text-foreground">Développement</h3>
          </div>
          <div className="flex justify-around">
            <ScoreGauge label="Sociabilité" score={avgScores.sociability} emoji="🤝" color="hsl(var(--primary))" />
            <ScoreGauge label="Curiosité" score={avgScores.curiosity} emoji="🔍" color="hsl(36, 90%, 50%)" />
            <ScoreGauge label="Stabilité" score={avgScores.stability} emoji="⚖️" color="hsl(145, 65%, 42%)" />
          </div>

          {/* Engagement + Mood mini bars */}
          <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-border/50">
            <div>
              <p className="text-[10px] text-muted-foreground font-medium mb-1.5">Engagement</p>
              <div className="flex gap-1 h-3">
                {recentAnalyses.length > 0 ? (
                  <>
                    <div className="rounded-full bg-primary" style={{ width: `${(engagementDist.high / recentAnalyses.length) * 100}%` }} title={`Élevé: ${engagementDist.high}`} />
                    <div className="rounded-full bg-primary/40" style={{ width: `${(engagementDist.medium / recentAnalyses.length) * 100}%` }} title={`Moyen: ${engagementDist.medium}`} />
                    <div className="rounded-full bg-muted" style={{ width: `${(engagementDist.low / recentAnalyses.length) * 100}%` }} title={`Faible: ${engagementDist.low}`} />
                  </>
                ) : <div className="rounded-full bg-muted w-full" />}
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[9px] text-muted-foreground">🔥 {engagementDist.high}</span>
                <span className="text-[9px] text-muted-foreground">👍 {engagementDist.medium}</span>
                <span className="text-[9px] text-muted-foreground">💤 {engagementDist.low}</span>
              </div>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-medium mb-1.5">Humeur</p>
              <div className="flex gap-1 h-3">
                {recentAnalyses.length > 0 ? (
                  <>
                    <div className="rounded-full bg-green-500" style={{ width: `${(moodDist.positive / recentAnalyses.length) * 100}%` }} />
                    <div className="rounded-full bg-yellow-400" style={{ width: `${(moodDist.neutral / recentAnalyses.length) * 100}%` }} />
                    <div className="rounded-full bg-red-400" style={{ width: `${(moodDist.low / recentAnalyses.length) * 100}%` }} />
                  </>
                ) : <div className="rounded-full bg-muted w-full" />}
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[9px] text-muted-foreground">🟢 {moodDist.positive}</span>
                <span className="text-[9px] text-muted-foreground">🟡 {moodDist.neutral}</span>
                <span className="text-[9px] text-muted-foreground">🔴 {moodDist.low}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ 5. ÉMOTIONS MOYENNES ═══ */}
      {Object.keys(avgEmotions).length > 0 && (
        <div className="bg-card rounded-2xl p-4 border border-border/30">
          <div className="flex items-center gap-2 mb-3">
            <Heart className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-[13px] font-bold text-foreground">Émotions</h3>
            <span className="ml-auto text-[10px] text-muted-foreground">{recentAnalyses.length} sessions analysées</span>
          </div>
          <div className="space-y-2">
            {Object.entries(avgEmotions).filter(([, v]) => v > 0).sort(([, a], [, b]) => b - a).map(([key, value]) => {
              const info = emotionScoreLabels[key] || { label: key, emoji: "❓" };
              const barColor = key === "joy" ? "bg-green-500" : key === "curiosity" ? "bg-blue-500" : key === "excitement" ? "bg-orange-400" : key === "frustration" ? "bg-red-400" : key === "fear" ? "bg-purple-400" : "bg-gray-400";
              return (
                <div key={key} className="flex items-center gap-2.5">
                  <span className="text-base w-6 text-center">{info.emoji}</span>
                  <span className="text-[12px] text-foreground w-20 font-semibold">{info.label}</span>
                  <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full ${barColor} rounded-full transition-all duration-700`} style={{ width: `${value}%` }} />
                  </div>
                  <span className="text-[12px] text-foreground w-10 text-right font-bold">{value}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ 6. GRAPHIQUE ÉVOLUTION ═══ */}
      {emotionChartData.some(d => d.Joie !== null) && (
        <div className="bg-card rounded-2xl p-4 border border-border/30">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-[13px] font-bold text-foreground">Évolution (7 jours)</h3>
          </div>
          <div className="w-full h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={emotionChartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="gradJoie" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(145, 65%, 42%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(145, 65%, 42%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradCuriosite" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(210, 80%, 55%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(210, 80%, 55%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} domain={[0, 100]} axisLine={false} tickLine={false} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="bg-card border border-border rounded-xl p-2.5 shadow-lg min-w-[130px]">
                        <p className="text-[11px] font-bold text-foreground mb-1.5">{label}</p>
                        {payload.filter(p => (p.value as number) > 0).sort((a, b) => (b.value as number) - (a.value as number)).map(p => {
                          const cfg = emotionConfig[p.name as string] || { emoji: "❓", color: "#888" };
                          return (
                            <div key={p.name} className="flex items-center gap-1.5 py-0.5">
                              <span className="text-xs">{cfg.emoji}</span>
                              <span className="text-[10px] text-foreground flex-1">{p.name}</span>
                              <span className="text-[11px] font-bold" style={{ color: cfg.color }}>{p.value}</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }}
                />
                <Area type="monotone" dataKey="Joie" stroke="hsl(145, 65%, 42%)" strokeWidth={2} fill="url(#gradJoie)" dot={{ r: 3, fill: "hsl(145, 65%, 42%)", strokeWidth: 1.5, stroke: "hsl(var(--card))" }} connectNulls />
                <Area type="monotone" dataKey="Curiosité" stroke="hsl(210, 80%, 55%)" strokeWidth={2} fill="url(#gradCuriosite)" dot={{ r: 3, fill: "hsl(210, 80%, 55%)", strokeWidth: 1.5, stroke: "hsl(var(--card))" }} connectNulls />
                <Area type="monotone" dataKey="Excitation" stroke="hsl(36, 90%, 50%)" strokeWidth={1.5} fill="transparent" dot={{ r: 2.5, fill: "hsl(36, 90%, 50%)" }} connectNulls />
                <Area type="monotone" dataKey="Frustration" stroke="hsl(0, 75%, 55%)" strokeWidth={1.5} fill="transparent" dot={{ r: 2, fill: "hsl(0, 75%, 55%)" }} connectNulls />
                <Area type="monotone" dataKey="Peur" stroke="hsl(260, 45%, 58%)" strokeWidth={1} fill="transparent" dot={{ r: 2, fill: "hsl(260, 45%, 58%)" }} connectNulls />
                <Area type="monotone" dataKey="Tristesse" stroke="hsl(0, 0%, 55%)" strokeWidth={1} fill="transparent" dot={{ r: 2, fill: "hsl(0, 0%, 55%)" }} connectNulls />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {Object.entries(emotionConfig).map(([label, cfg]) => (
              <span key={label} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }} />
                {cfg.emoji} {label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ═══ 7. CENTRES D'INTÉRÊT ═══ */}
      {allInterests.length > 0 && (
        <div className="bg-card rounded-2xl p-4 border border-border/30">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-[13px] font-bold text-foreground">Centres d'intérêt</h3>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {allInterests.map(([interest, count]) => (
              <span key={interest} className="px-2.5 py-1 rounded-full bg-primary/8 text-primary text-[11px] font-medium border border-primary/10">
                {interest} <span className="opacity-40 text-[9px]">×{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ═══ 8. STATISTIQUES DÉTAILLÉES ═══ */}
      <div className="bg-card rounded-2xl p-4 border border-border/30">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-[13px] font-bold text-foreground">Statistiques détaillées</h3>
        </div>
        <div className="space-y-3">
          {[
            { label: "Durée moyenne / session", value: formatDuration(avgSessionDuration), icon: "⏱️" },
            { label: "Messages / session", value: avgMessagesPerSession, icon: "💬" },
            { label: "Sessions analysées", value: `${recentAnalyses.length} / ${totalSessions}`, icon: "🔬" },
            { label: "Durée aujourd'hui", value: formatDuration(todayDuration), icon: "📅" },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                <span className="text-sm">{stat.icon}</span>
                <span className="text-[12px] text-muted-foreground">{stat.label}</span>
              </div>
              <span className="text-[13px] font-bold text-foreground">{stat.value}</span>
            </div>
          ))}
        </div>

        {/* Activité par jour */}
        {hasData && (
          <div className="mt-4 pt-3 border-t border-border/50">
            <p className="text-[10px] text-muted-foreground font-medium mb-2">Activité par jour</p>
            <div className="flex items-end gap-1 h-12">
              {weeklyActivity.map((day) => {
                const maxCount = Math.max(...weeklyActivity.map(d => d.count), 1);
                const height = (day.count / maxCount) * 100;
                return (
                  <div key={day.label} className="flex-1 flex flex-col items-center gap-0.5">
                    <div className="w-full rounded-t-sm bg-primary/20 relative" style={{ height: `${Math.max(height, 4)}%` }}>
                      {day.count > 0 && (
                        <div className="absolute inset-0 rounded-t-sm bg-primary" style={{ height: `${height}%` }} />
                      )}
                    </div>
                    <span className="text-[8px] text-muted-foreground">{day.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ═══ 9. DERNIÈRE SESSION ═══ */}
      {lastSession && (
        <div className="bg-card rounded-2xl p-4 border border-border/30">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-[13px] font-bold text-foreground">Dernière session</h3>
            <span className="ml-auto text-[10px] text-muted-foreground">{formatDate(lastSession.started_at)}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="text-center p-2 rounded-lg bg-muted/30">
              <p className="text-sm font-bold text-foreground">{lastSession.message_count}</p>
              <p className="text-[9px] text-muted-foreground">messages</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/30">
              <p className="text-sm font-bold text-foreground">{formatDuration(lastSession.duration_seconds)}</p>
              <p className="text-[9px] text-muted-foreground">durée</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/30">
              <p className="text-sm font-bold text-foreground">
                {lastAnalysis ? (lastAnalysis.engagement_level === "high" ? "🔥" : lastAnalysis.engagement_level === "medium" ? "👍" : "💤") : "—"}
              </p>
              <p className="text-[9px] text-muted-foreground">engagement</p>
            </div>
          </div>
          {lastAnalysis?.summary && (
            <p className="text-[11px] text-foreground/70 leading-relaxed bg-muted/20 rounded-lg p-2.5">
              {lastAnalysis.summary}
            </p>
          )}
        </div>
      )}

      {/* ═══ 10. MODES RAPIDES ═══ */}
      <div className="bg-card rounded-2xl p-4 border border-border/30">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-[13px] font-bold text-foreground">Modes rapides</h3>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[
            { id: "calm", emoji: "😌", label: "Calme" },
            { id: "game", emoji: "🎮", label: "Jeu" },
            { id: "night", emoji: "🌙", label: "Nuit" },
            { id: "education", emoji: "📚", label: "Éducatif" },
          ].map(preset => (
            <button key={preset.id} onClick={() => applyPreset(preset.id)}
              className="flex flex-col items-center p-2.5 rounded-xl bg-muted/40 hover:bg-primary/10 transition-all active:scale-95">
              <span className="text-xl">{preset.emoji}</span>
              <span className="text-[10px] font-semibold text-foreground mt-1">{preset.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ═══ ÉTAT VIDE ═══ */}
      {!hasData && (
        <div className="bg-card rounded-2xl p-8 text-center border border-border/30">
          <span className="text-4xl block mb-3">🎙️</span>
          <h3 className="text-base font-bold text-foreground mb-1">Pas encore de sessions</h3>
          <p className="text-[12px] text-muted-foreground">Les métriques apparaîtront après la première conversation de {childName} avec Bobby.</p>
        </div>
      )}
    </div>
    );
  };
  // ═══════════════════════════════════════════════════════════════
  // RENDER: SESSION DETAIL
  // ═══════════════════════════════════════════════════════════════

  const renderSessionDetail = () => {
    const analysis = selectedAnalysis || analyses.find(a => a.session_id === selectedSession?.id) || null;
    const moodInfo = moodLabels[(analysis?.mood_score || "neutral")] || moodLabels.neutral;

    return (
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="bg-card rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">{formatDate(selectedSession!.started_at)}</h3>
              <p className="text-[11px] text-muted-foreground">{selectedSession!.child_name}, {selectedSession!.child_age} ans</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center py-2 bg-muted/50 rounded-xl">
              <Clock className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-[13px] font-bold text-foreground">{formatDuration(selectedSession!.duration_seconds)}</p>
              <p className="text-[9px] text-muted-foreground">Durée</p>
            </div>
            <div className="text-center py-2 bg-muted/50 rounded-xl">
              <MessageSquare className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-[13px] font-bold text-foreground">{selectedSession!.message_count}</p>
              <p className="text-[9px] text-muted-foreground">Messages</p>
            </div>
            <div className="text-center py-2 bg-muted/50 rounded-xl">
              <span className="text-base">{moodInfo.emoji}</span>
              <p className={`text-[13px] font-bold ${moodInfo.color}`}>{moodInfo.label}</p>
              <p className="text-[9px] text-muted-foreground">Humeur</p>
            </div>
          </div>
        </div>

        {/* ── Audio Player ── */}
        {analysis?.audio_path && (
          <div className="bg-card rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Mic className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-[13px] font-semibold text-foreground">Réécouter</h3>
            </div>
            
            <div className="mb-3">
              <div className="w-full h-1.5 bg-muted rounded-full cursor-pointer overflow-hidden"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pct = ((e.clientX - rect.left) / rect.width) * 100;
                  seekAudio(pct);
                }}>
                <div className="h-full bg-primary rounded-full transition-all duration-200" style={{ width: `${audioProgress}%` }} />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[9px] text-muted-foreground font-mono">
                  {audioDuration > 0 ? `${Math.floor((audioProgress / 100) * audioDuration / 60)}:${String(Math.floor((audioProgress / 100) * audioDuration % 60)).padStart(2, "0")}` : "0:00"}
                </span>
                <span className="text-[9px] text-muted-foreground font-mono">
                  {audioDuration > 0 ? `${Math.floor(audioDuration / 60)}:${String(Math.floor(audioDuration % 60)).padStart(2, "0")}` : "—"}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4">
              <button onClick={() => skipMessage(-1)}
                className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                <SkipBack className="w-4 h-4" />
              </button>
              <button onClick={() => playAudio(analysis.audio_path!)}
                className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-all shadow-sm">
                {playingAudio === analysis.audio_path
                  ? <Pause className="w-5 h-5" />
                  : <Play className="w-5 h-5 ml-0.5" />}
              </button>
              <button onClick={() => skipMessage(1)}
                className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-center gap-1.5 mt-3">
              {[0.75, 1, 1.25, 1.5, 2].map(speed => (
                <button key={speed} onClick={() => setAudioSpeed(speed)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${
                    audioSpeed === speed ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                  {speed}×
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Moments clés ── */}
        {keyMoments.length > 0 && (
          <Card title="⭐ Moments clés" icon={Star}>
            <div className="space-y-2">
              {keyMoments.map((moment, i) => {
                const emo = emotionLabels[moment.detected_emotion!] || { emoji: "💬", label: moment.detected_emotion, color: "bg-muted text-muted-foreground" };
                return (
                  <button key={i} onClick={() => jumpToMoment(moment.idx)}
                    className="w-full flex items-start gap-3 p-3 rounded-xl bg-muted/50 hover:bg-primary/8 transition-all text-left">
                    <span className="text-lg mt-0.5">{emo.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] text-foreground line-clamp-2 leading-relaxed">{moment.content}</p>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium mt-1 inline-block ${emo.color}`}>
                        {emo.label}
                      </span>
                    </div>
                    <Play className="w-3 h-3 text-primary mt-1 shrink-0" />
                  </button>
                );
              })}
            </div>
          </Card>
        )}

        {analyzing ? (
          <div className="bg-card rounded-2xl p-6 flex items-center justify-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-[13px] text-muted-foreground font-medium">Analyse en cours…</span>
          </div>
        ) : analysis ? (
          <>
            {analysis.summary && (
              <Card title="Résumé" icon={Brain}>
                <p className="text-[13px] text-foreground leading-relaxed">{analysis.summary}</p>
              </Card>
            )}

            {analysis.sociability_score != null && (
              <Card title="Comportement" icon={Activity}>
                <div className="flex justify-around py-2">
                  <ScoreGauge label="Sociabilité" score={analysis.sociability_score || 0} emoji="🤝" color="hsl(var(--primary))" />
                  <ScoreGauge label="Curiosité" score={analysis.curiosity_score || 0} emoji="🔍" color="hsl(36, 90%, 50%)" />
                  <ScoreGauge label="Stabilité" score={analysis.emotional_stability_score || 0} emoji="⚖️" color="hsl(var(--success))" />
                </div>
              </Card>
            )}

            {analysis.emotions && Object.keys(analysis.emotions).length > 0 && (
              <Card title="Émotions" icon={Heart}>
                <div className="space-y-2">
                  {Object.entries(analysis.emotions).filter(([, v]) => (v as number) > 0).sort(([, a], [, b]) => (b as number) - (a as number)).map(([key, value]) => {
                    const info = emotionScoreLabels[key] || { label: key, emoji: "❓" };
                    return (
                      <div key={key} className="flex items-center gap-2">
                        <span className="w-5 text-center text-sm">{info.emoji}</span>
                        <span className="text-[12px] text-foreground w-20 font-medium">{info.label}</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${value}%` }} />
                        </div>
                        <span className="text-[11px] text-muted-foreground w-8 text-right">{value as number}%</span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {analysis.extracted_interests && analysis.extracted_interests.length > 0 && (
              <Card title="Intérêts détectés" icon={Sparkles}>
                <div className="flex flex-wrap gap-2">
                  {analysis.extracted_interests.map((interest, i) => (
                    <span key={i} className="px-3 py-1 rounded-full bg-accent/15 text-accent-foreground text-[11px] font-medium">
                      ✨ {interest}
                    </span>
                  ))}
                </div>
              </Card>
            )}

            {analysis.topics_detected?.length > 0 && (
              <Card title="Sujets abordés">
                <div className="flex flex-wrap gap-2">
                  {analysis.topics_detected.map((t, i) => (
                    <span key={i} className="px-3 py-1 rounded-full bg-primary/8 text-primary text-[11px] font-medium">{t}</span>
                  ))}
                </div>
              </Card>
            )}

            {analysis.behavior_insights?.length > 0 && (
              <Card title="Observations">
                <ul className="space-y-2">
                  {analysis.behavior_insights.map((insight, i) => (
                    <li key={i} className="text-[12px] text-foreground flex items-start gap-2 leading-relaxed">
                      <span className="text-primary mt-0.5 text-xs">•</span>{insight}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <Card title="Engagement">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-muted-foreground">Niveau</p>
                  <p className="text-[13px] font-bold text-foreground capitalize">{analysis.engagement_level}</p>
                </div>
                {analysis.attention_span && (
                  <div>
                    <p className="text-[10px] text-muted-foreground">Attention</p>
                    <p className="text-[13px] font-bold text-foreground">{analysis.attention_span}</p>
                  </div>
                )}
              </div>
            </Card>

            {analysis.alerts?.length > 0 && (
              <div className="bg-destructive/5 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  <h3 className="text-[13px] font-semibold text-destructive">Alertes</h3>
                </div>
                {analysis.alerts.map((alert, i) => (
                  <p key={i} className="text-[12px] text-foreground mb-1">⚠️ {alert.message}</p>
                ))}
              </div>
            )}

            {sessionMessages.length > 0 && (
              <Card title="Transcription" icon={FileText}>
                <div className="max-h-80 overflow-y-auto space-y-2">
                  {sessionMessages.map((msg, i) => {
                    const isChild = msg.role === "user";
                    const isActive = i === activeMessageIdx && (playingAudio || ttsPlaying);
                    const isTtsSpeaking = ttsPlaying === msg.content;
                    return (
                      <div key={i} className={`flex ${isChild ? "justify-start" : "justify-end"} transition-all duration-200`}>
                        <div className={`max-w-[85%] rounded-2xl px-3 py-2 transition-all duration-200 ${
                          isActive ? "ring-2 ring-primary/40 shadow-sm" : ""
                        } ${
                          isChild ? "bg-muted/70" : "bg-primary/8"
                        }`}>
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[10px] font-medium text-muted-foreground">
                              {isChild ? `👦 ${settings.childName || childName}` : "🤖 Bobby"}
                            </span>
                            {msg.detected_emotion && (
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                                emotionLabels[msg.detected_emotion]?.color || "bg-muted text-muted-foreground"
                              }`}>
                                {emotionLabels[msg.detected_emotion]?.emoji} {emotionLabels[msg.detected_emotion]?.label || msg.detected_emotion}
                              </span>
                            )}
                            <button onClick={() => speakMessage(msg.content)}
                              className="ml-auto w-5 h-5 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary transition-colors">
                              {isTtsSpeaking ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                            </button>
                          </div>
                          <p className="text-[12px] text-foreground leading-relaxed">{msg.content}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            <button
              onClick={() => exportSessionPDF(selectedSession!, analysis)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-card text-primary text-[13px] font-semibold hover:bg-primary/8 transition-all">
              <Download className="w-4 h-4" /> Exporter le rapport
            </button>
          </>
        ) : (
          <button onClick={() => analyzeSession(selectedSession!)}
            className="w-full bg-primary text-primary-foreground rounded-2xl p-4 font-semibold text-[13px] hover:opacity-90 transition-all">
            🧠 Lancer l'analyse IA
          </button>
        )}

        <button
          onClick={() => setConfirmDialog({
            title: "Supprimer cette session ?",
            description: "Toutes les données de cette session (messages, analyse, audio) seront supprimées définitivement.",
            confirmLabel: "Supprimer",
            variant: "danger",
            onConfirm: () => { deleteSession(selectedSession!.id); setConfirmDialog(null); },
          })}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-destructive/5 text-destructive text-[13px] font-medium hover:bg-destructive/10 transition-all">
          <Trash2 className="w-4 h-4" /> Supprimer cette session
        </button>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER: SESSIONS LIST (grouped by day)
  // ═══════════════════════════════════════════════════════════════

  const renderSessionsList = () => (
    <div className="p-4">
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        <button onClick={() => setTagFilter(null)}
          className={`px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all ${!tagFilter ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
          Tous
        </button>
        {Object.entries(tagLabels).map(([key, info]) => (
          <button key={key} onClick={() => setTagFilter(tagFilter === key ? null : key)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all ${tagFilter === key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
            {info.emoji} {info.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : groupedSessions.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground"><p className="text-sm">Aucune session{tagFilter ? " avec ce tag" : " enregistrée"}.</p></div>
      ) : (
        <div className="space-y-4">
          {groupedSessions.map(group => (
            <div key={group.day}>
              {/* Day header */}
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                <h4 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {formatDayHeader(group.sessions[0].started_at)}
                </h4>
                <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {group.sessions.length}
                </span>
              </div>
              <div className="space-y-2">
                {group.sessions.map(session => {
                  const hasAnalysis = analyses.some(a => a.session_id === session.id);
                  const analysis = analyses.find(a => a.session_id === session.id);
                  const mood = moodLabels[(analysis?.mood_score || "neutral")] || moodLabels.neutral;
                  return (
                    <button key={session.id} onClick={() => analyzeSession(session)}
                      className="w-full bg-card rounded-2xl p-4 hover:bg-muted/50 transition-all text-left">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[13px] font-semibold text-foreground">
                          {new Date(session.started_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-muted-foreground">{formatDuration(session.duration_seconds)}</span>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] text-muted-foreground">{session.message_count} msg</span>
                        {hasAnalysis && <span className="text-sm">{mood.emoji}</span>}
                        {session.tags?.map(tag => {
                          const info = tagLabels[tag];
                          return info ? (
                            <span key={tag} className={`px-1.5 py-0.5 rounded-full text-[9px] font-medium ${info.color}`}>{info.emoji}</span>
                          ) : null;
                        })}
                        {hasAnalysis && <Brain className="w-3 h-3 text-primary ml-auto" />}
                      </div>
                      {analysis?.summary && <p className="text-[11px] text-muted-foreground mt-1.5 line-clamp-2">{analysis.summary}</p>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════
  // RENDER: PROFIL
  // ═══════════════════════════════════════════════════════════════

  const renderProfil = () => (
    <div className="p-4 space-y-3">
      <Card title="Profil de l'enfant" icon={User}>
        <div className="space-y-3">
          <div>
            <p className="text-[11px] text-muted-foreground mb-1">Prénom</p>
            <input type="text" value={settings.childName}
              onChange={(e) => updateSetting("childName", e.target.value)}
              placeholder="Prénom de l'enfant"
              className="w-full bg-muted rounded-xl px-4 py-2.5 text-base font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground mb-1">Âge</p>
            <div className="flex gap-2">
              {[5, 6, 7, 8, 9, 10, 11, 12].map(age => (
                <button key={age} onClick={() => updateSetting("childAge", age)}
                  className={`w-9 h-9 rounded-xl text-[13px] font-bold transition-all ${
                    settings.childAge === age ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-primary/10"
                  }`}>{age}</button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card title="Personnalité de Bobby" icon={Sparkles}>
        <div className="grid grid-cols-3 gap-2">
          {([
            ["calm", "😌", "Calme", "Doux et rassurant"],
            ["energetic", "⚡", "Énergique", "Vif et enthousiaste"],
            ["educational", "📚", "Éducatif", "Curieux et pédagogue"],
          ] as const).map(([val, emoji, label, desc]) => (
            <button key={val} onClick={() => updateSetting("personality", val)}
              className={`p-3 rounded-xl text-center transition-all ${
                settings.personality === val ? "bg-primary/10 ring-1 ring-primary/30" : "bg-muted/50 hover:bg-muted"
              }`}>
              <span className="text-lg block">{emoji}</span>
              <span className={`text-[11px] font-semibold block ${settings.personality === val ? "text-primary" : "text-foreground"}`}>{label}</span>
              <span className="text-[9px] text-muted-foreground">{desc}</span>
            </button>
          ))}
        </div>
      </Card>

      <Card title="Centres d'intérêt" icon={Heart}>
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {allInterests.map(([interest]) => (
              <span key={interest} className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium">
                {interest}
              </span>
            ))}
            {allInterests.length === 0 && (
              <p className="text-[11px] text-muted-foreground">Les intérêts seront détectés automatiquement pendant les sessions.</p>
            )}
          </div>
        </div>
      </Card>

      <Card title="Sujets à éviter" icon={Shield}>
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {settings.blockedTopics.map(t => (
              <button key={t} onClick={() => updateSetting("blockedTopics", settings.blockedTopics.filter(x => x !== t))}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-destructive/10 text-destructive text-[11px] font-medium hover:bg-destructive/20 transition-all">
                🚫 {t} <X className="w-3 h-3" />
              </button>
            ))}
          </div>
          <input type="text" value={newBlockedTopic}
            onChange={(e) => setNewBlockedTopic(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newBlockedTopic.trim()) {
                if (!settings.blockedTopics.includes(newBlockedTopic.trim())) {
                  updateSetting("blockedTopics", [...settings.blockedTopics, newBlockedTopic.trim()]);
                }
                setNewBlockedTopic("");
              }
            }}
            placeholder="Ex: violence, mort…"
            className="w-full px-4 py-2.5 rounded-xl bg-muted text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
        </div>
      </Card>

      {/* Save confirmation button */}
      <div className="sticky bottom-0 p-4 bg-gradient-to-t from-card via-card to-transparent">
        <button
          onClick={() => {
            onSettingsChange?.(settings);
            setSettingsSaved(true);
            setTimeout(() => setSettingsSaved(false), 2000);
          }}
          className={`w-full py-3.5 rounded-2xl text-[14px] font-bold transition-all active:scale-95 ${
            settingsSaved
              ? "bg-success text-success-foreground"
              : "bg-primary text-primary-foreground hover:opacity-90"
          }`}>
          {settingsSaved ? "✅ Préférences enregistrées !" : "💾 Enregistrer les préférences"}
        </button>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════
  // RENDER: RÉGLAGES (merged: Voix + Contenu + Limites)
  // ═══════════════════════════════════════════════════════════════

  const VOICE_MAP: Record<string, { label: string; emoji: string; desc: string }> = {
    child: { label: "Enfant", emoji: "🧒", desc: "Voix douce d'enfant" },
    female: { label: "Maman", emoji: "👩", desc: "Voix féminine chaleureuse" },
    male: { label: "Papa", emoji: "👨", desc: "Voix grave et rassurante" },
    sister: { label: "Sœur", emoji: "👧", desc: "Ado bienveillante, complice" },
    brother: { label: "Frère", emoji: "👦", desc: "Ado cool, encourageant" },
    custom: { label: "Personnaliser", emoji: "🎨", desc: "Bientôt disponible" },
  };

  const [previewPlaying, setPreviewPlaying] = useState<string | false>(false);

  const previewVoice = async (voiceType: string) => {
    if (previewPlaying || voiceType === "custom") return;
    setPreviewPlaying(voiceType);
    try {
      const { previewVoiceProfile } = await import("@/lib/voicePipeline");
      await previewVoiceProfile(voiceType as any);
    } catch (e) { console.warn("Preview error:", e); }
    finally { setPreviewPlaying(false); }
  };

  const renderReglages = () => (
    <div className="p-4 space-y-3">
      {/* Section selector */}
      <div className="flex gap-2 bg-card rounded-2xl p-1.5">
        {([
          ["voix", "🎤", "Voix"],
          ["contenu", "📚", "Contenu"],
          ["limites", "⏱️", "Limites"],
        ] as const).map(([key, emoji, label]) => (
          <button key={key} onClick={() => setReglagesSection(key)}
            className={`flex-1 py-2 rounded-xl text-[12px] font-semibold transition-all ${
              reglagesSection === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}>
            {emoji} {label}
          </button>
        ))}
      </div>

      {/* Voix section */}
      {reglagesSection === "voix" && (
        <>
          <Card title="Type de voix" icon={Mic}>
            <div className="grid grid-cols-2 gap-2">
              {(["child", "female", "male", "sister", "brother", "custom"] as const).map((type) => {
                const info = VOICE_MAP[type];
                const isCustom = type === "custom";
                const selected = settings.voiceType === type;
                const isThisPlaying = previewPlaying === type;
                return (
                  <div key={type} className={`relative rounded-xl transition-all duration-200 ${
                    isCustom ? "opacity-40 cursor-not-allowed bg-muted/30" :
                    selected ? "bg-primary/10 ring-2 ring-primary/40" : "bg-muted/50 hover:bg-muted"
                  }`}>
                    <button
                      onClick={() => !isCustom && updateSetting("voiceType", type)}
                      disabled={isCustom}
                      className="w-full p-3 text-left">
                      <div className="text-xl mb-1">{info.emoji}</div>
                      <h4 className="text-[12px] font-semibold text-foreground">{info.label}</h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{info.desc}</p>
                    </button>
                    {!isCustom && (
                      <button
                        onClick={() => previewVoice(type)}
                        disabled={!!previewPlaying}
                        className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                          isThisPlaying
                            ? "bg-primary text-primary-foreground animate-pulse"
                            : "bg-primary/15 text-primary hover:bg-primary hover:text-primary-foreground"
                        } disabled:opacity-40`}>
                        {isThisPlaying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                      </button>
                    )}
                    {isCustom && <Lock className="absolute top-3 right-3 w-4 h-4 text-muted-foreground" />}
                  </div>
                );
              })}
            </div>
          </Card>

          <Card title="Vitesse de la voix" icon={Zap}>
            <div className="grid grid-cols-3 gap-2">
              {([["slow", "🐢", "Lent"], ["normal", "🔊", "Normal"], ["fast", "⚡", "Rapide"]] as const).map(([val, emoji, label]) => (
                <button key={val} onClick={() => updateSetting("voiceSpeed", val)}
                  className={`p-3 rounded-xl text-center transition-all ${
                    settings.voiceSpeed === val ? "bg-primary/10 ring-1 ring-primary/30" : "bg-muted/50 hover:bg-muted"
                  }`}>
                  <span className="text-lg block">{emoji}</span>
                  <span className={`text-[11px] font-semibold block ${settings.voiceSpeed === val ? "text-primary" : "text-foreground"}`}>{label}</span>
                </button>
              ))}
            </div>
          </Card>

          <Card title="Couleur de Bobby" icon={Sparkles}>
            <div className="grid grid-cols-3 gap-2">
              {BOBBY_COLORS.map((c) => {
                const selected = settings.bobbyColor === c.id;
                return (
                  <button key={c.id} onClick={() => updateSetting("bobbyColor", c.id)}
                    className={`flex items-center gap-2 p-3 rounded-xl transition-all ${
                      selected ? "ring-2 ring-primary/50 bg-primary/10" : "bg-muted/50 hover:bg-muted"
                    }`}>
                    <div className="w-6 h-6 rounded-full shrink-0 shadow-inner"
                      style={{ backgroundColor: `hsl(${c.hsl})` }} />
                    <span className={`text-[11px] font-semibold ${selected ? "text-primary" : "text-foreground"}`}>{c.label}</span>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card>
            <SettingRow icon={Camera} title="Suivi du visage" desc="Bobby suit le visage de l'enfant">
              <Toggle value={settings.enableCamera} onChange={async (v) => {
                if (v) {
                  try {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 320, height: 240 } });
                    stream.getTracks().forEach(t => t.stop());
                    updateSetting("enableCamera", true);
                  } catch { alert("Impossible d'accéder à la caméra."); }
                } else { updateSetting("enableCamera", false); }
              }} />
            </SettingRow>
          </Card>

          <Card title="Effets sonores" icon={settings.sfxVolume === 0 ? VolumeX : Volume2}>
            <div className="flex items-center gap-3">
              <button onClick={() => updateSetting("sfxVolume", settings.sfxVolume === 0 ? 0.7 : 0)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${settings.sfxVolume === 0 ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"}`}>
                {settings.sfxVolume === 0 ? "Off" : "On"}
              </button>
              <input type="range" min="0" max="100" value={Math.round(settings.sfxVolume * 100)}
                onChange={(e) => updateSetting("sfxVolume", Number(e.target.value) / 100)}
                className="flex-1 h-1.5 rounded-full appearance-none bg-muted accent-primary" />
              <span className="text-[11px] text-muted-foreground w-10 text-right">{Math.round(settings.sfxVolume * 100)}%</span>
            </div>
          </Card>

          <Card title="Mode offline" icon={Download}>
            <p className="text-[11px] text-muted-foreground mb-3">
              Télécharge toutes les voix Piper pour garantir le fonctionnement sans internet (~200 Mo).
            </p>
            {piperDone ? (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                <span className="text-lg">✅</span>
                <span className="text-[12px] font-semibold text-foreground">Toutes les voix sont prêtes !</span>
              </div>
            ) : piperDownloading ? (
              <div className="space-y-2">
                {(["female", "male", "child", "sister", "brother"] as const).map((profile) => {
                  const pct = piperProgress[profile] ?? 0;
                  const labels: Record<string, string> = { female: "Féminine", male: "Masculine", child: "Enfant", sister: "Grande sœur", brother: "Grand frère" };
                  return (
                    <div key={profile} className="flex items-center gap-2">
                      <span className="text-[11px] font-medium text-foreground w-20 shrink-0">{labels[profile]}</span>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary transition-all duration-300"
                          style={{ width: `${Math.round(pct * 100)}%` }} />
                      </div>
                      <span className="text-[10px] text-muted-foreground w-10 text-right">
                        {pct >= 1 ? "✅" : `${Math.round(pct * 100)}%`}
                      </span>
                    </div>
                  );
                })}
                <div className="flex items-center gap-2 mt-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                  <span className="text-[11px] text-muted-foreground">Téléchargement en cours…</span>
                </div>
              </div>
            ) : (
              <button
                onClick={async () => {
                  setPiperDownloading(true);
                  setPiperDone(false);
                  const profiles = ["female", "male", "child", "sister", "brother"] as const;
                  for (const profile of profiles) {
                    try {
                      await preloadPiperVoice(profile, (p) => {
                        setPiperProgress((prev) => ({ ...prev, [profile]: p }));
                      });
                      setPiperProgress((prev) => ({ ...prev, [profile]: 1 }));
                    } catch {
                      console.warn(`[ParentMode] Failed to download Piper voice: ${profile}`);
                    }
                  }
                  setPiperDownloading(false);
                  setPiperDone(true);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all active:scale-95">
                <Download className="w-4 h-4" />
                Télécharger toutes les voix
              </button>
            )}
          </Card>
        </>
      )}

      {/* Contenu section */}
      {reglagesSection === "contenu" && (
        <>
          <Card title="Modes de contenu" icon={BookOpen}>
            <div className="grid grid-cols-2 gap-2">
              {([
                ["freeChat", "💬", "Discussion libre", "Bobby bavarde librement"],
                ["educational", "📚", "Éducatif", "Apprentissage ludique"],
                ["games", "🎮", "Jeux", "Quiz, devinettes, défis"],
                ["stories", "📖", "Histoires", "Contes et aventures"],
              ] as const).map(([key, emoji, label, desc]) => {
                const active = settings.contentModes[key as keyof typeof settings.contentModes];
                return (
                  <button key={key}
                    onClick={() => updateNested("contentModes", key, !active)}
                    className={`relative p-3 rounded-xl text-left transition-all duration-200 ${
                      active ? "bg-primary/10 ring-1 ring-primary/30" : "bg-muted/50 hover:bg-muted"
                    }`}>
                    <div className="text-xl mb-1">{emoji}</div>
                    <h4 className="text-[12px] font-semibold text-foreground">{label}</h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{desc}</p>
                    <div className={`absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                      active ? "bg-primary text-primary-foreground" : "bg-muted-foreground/20"
                    }`}>
                      {active && <span className="text-[10px] font-bold">✓</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card title="Thèmes d'histoires" icon={Sparkles}>
            <div className="grid grid-cols-3 gap-2">
              {ALL_THEMES.map(theme => {
                const active = settings.enabledThemes.includes(theme.id);
                return (
                  <button key={theme.id} onClick={() => toggleTheme(theme.id)}
                    className={`p-3 rounded-xl text-center transition-all ${
                      active ? "bg-primary/10 ring-1 ring-primary/30" : "bg-muted/50 hover:bg-muted"
                    }`}>
                    <span className="text-xl block mb-1">{theme.label.split(" ")[0]}</span>
                    <span className={`text-[10px] font-medium ${active ? "text-primary" : "text-muted-foreground"}`}>
                      {theme.label.split(" ").slice(1).join(" ") || theme.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card title="Durée des histoires" icon={Clock}>
            <div className="grid grid-cols-3 gap-2">
              {([["courte", "⚡", "Courte", "~3 min"], ["moyenne", "📖", "Moyenne", "~7 min"], ["longue", "📚", "Longue", "~12 min"]] as const).map(([val, emoji, label, sub]) => (
                <button key={val} onClick={() => updateSetting("storyDuration", val)}
                  className={`p-3 rounded-xl text-center transition-all ${
                    settings.storyDuration === val ? "bg-primary/10 ring-1 ring-primary/30" : "bg-muted/50 hover:bg-muted"
                  }`}>
                  <span className="text-lg block">{emoji}</span>
                  <span className={`text-[11px] font-semibold block ${settings.storyDuration === val ? "text-primary" : "text-foreground"}`}>{label}</span>
                  <span className="text-[9px] text-muted-foreground">{sub}</span>
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <SettingRow icon={Sparkles} title="Histoires interactives" desc="L'enfant fait des choix dans l'histoire">
              <Toggle value={settings.storyInteractive} onChange={(v) => updateSetting("storyInteractive", v)} />
            </SettingRow>
          </Card>
        </>
      )}

      {/* Limites section */}
      {reglagesSection === "limites" && (
        <>
          <Card title="Limite journalière" icon={Timer}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-foreground font-medium">Durée max par jour</span>
                <span className="text-lg font-bold text-primary">{settings.timeLimitMinutes || 60} min</span>
              </div>
              <input type="range" min="10" max="120" step="5" value={settings.timeLimitMinutes || 60}
                onChange={(e) => updateSetting("timeLimitMinutes", Number(e.target.value))}
                className="w-full h-2 rounded-full appearance-none bg-muted accent-primary" />
              <div className="flex justify-between text-[9px] text-muted-foreground">
                <span>10 min</span><span>60 min</span><span>120 min</span>
              </div>
              {todayDuration > 0 && (
                <div className="mt-2 pt-2 border-t border-border">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] text-muted-foreground">Aujourd'hui</span>
                    <span className="text-[10px] font-mono text-foreground">{formatDuration(todayDuration)} / {settings.timeLimitMinutes || 60} min</span>
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${todayDuration / 60 > (settings.timeLimitMinutes || 60) ? "bg-destructive" : "bg-primary"}`}
                      style={{ width: `${Math.min(100, (todayDuration / 60 / (settings.timeLimitMinutes || 60)) * 100)}%` }} />
                  </div>
                </div>
              )}
            </div>
          </Card>
          <Card>
            <SettingRow icon={Timer} title="Arrêt automatique" desc="Bobby s'arrête quand la limite est atteinte">
              <Toggle value={settings.autoStop} onChange={(v) => updateSetting("autoStop", v)} />
            </SettingRow>
          </Card>
          <Card title="Mode nuit" icon={Moon}>
            <div className="space-y-3">
              <SettingRow icon={Moon} title="Activer le mode nuit" desc="Bobby ne répond plus pendant la nuit">
                <Toggle value={settings.nightMode.active} onChange={(v) => updateNested("nightMode", "active", v)} />
              </SettingRow>
              {settings.nightMode.active && (
                <div className="flex items-center gap-3 pt-1 px-1">
                  <div className="flex-1">
                    <p className="text-[10px] text-muted-foreground mb-1 font-medium">Début</p>
                    <input type="time" value={settings.nightMode.startHour}
                      onChange={(e) => updateNested("nightMode", "startHour", e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-muted text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
                  </div>
                  <Sun className="w-4 h-4 text-muted-foreground mt-4" />
                  <div className="flex-1">
                    <p className="text-[10px] text-muted-foreground mb-1 font-medium">Fin</p>
                    <input type="time" value={settings.nightMode.endHour}
                      onChange={(e) => updateNested("nightMode", "endHour", e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-muted text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
                  </div>
                </div>
              )}
            </div>
          </Card>
          <Card title="Interactions" icon={Hand}>
            <div className="space-y-0.5">
              {([
                ["wakeWord", Mic, "Mot de réveil", "Dire \"Bobby\" pour activer"],
                ["tap", Hand, "Toucher", "Toucher l'écran pour activer"],
                ["interruption", AlertTriangle, "Interruption", "L'enfant peut interrompre Bobby"],
              ] as const).map(([key, IconComp, label, desc]) => (
                <SettingRow key={key} icon={IconComp} title={label} desc={desc}>
                  <Toggle
                    value={settings.interactions[key as keyof typeof settings.interactions]}
                    onChange={(v) => updateNested("interactions", key, v)}
                  />
                </SettingRow>
              ))}
            </div>
          </Card>
        </>
      )}
      {/* Save confirmation button */}
      <div className="sticky bottom-0 p-4 bg-gradient-to-t from-card via-card to-transparent">
        <button
          onClick={() => {
            onSettingsChange?.(settings);
            setSettingsSaved(true);
            setTimeout(() => setSettingsSaved(false), 2000);
          }}
          className={`w-full py-3.5 rounded-2xl text-[14px] font-bold transition-all active:scale-95 ${
            settingsSaved
              ? "bg-success text-success-foreground"
              : "bg-primary text-primary-foreground hover:opacity-90"
          }`}>
          {settingsSaved ? "✅ Réglages enregistrés !" : "💾 Enregistrer les réglages"}
        </button>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════
  // RENDER: NOUVEAUTÉS (Mises à jour + Suggestions)
  // ═══════════════════════════════════════════════════════════════

  const [suggestionText, setSuggestionText] = useState("");
  const [suggestionSent, setSuggestionSent] = useState(false);

  const handleSuggestionSubmit = () => {
    if (!suggestionText.trim()) return;
    // Store suggestion in console for now (could be saved to DB later)
    console.log("[Suggestion utilisateur]", suggestionText.trim());
    setSuggestionText("");
    setSuggestionSent(true);
    setTimeout(() => setSuggestionSent(false), 3000);
  };

  const renderNouveautes = () => (
    <div className="p-4 space-y-3">
      {/* Version banner */}
      <div className="bg-gradient-to-br from-primary/15 to-primary/5 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="text-[13px] font-bold text-foreground">Bobby v2.0</h3>
          <span className="text-[9px] px-2 py-0.5 bg-primary/20 text-primary rounded-full font-semibold">Dernière mise à jour</span>
        </div>
        <p className="text-[11px] text-muted-foreground">10 avril 2026</p>
      </div>

      {/* 🎤 Voix */}
      <Card title="🎤 Voix émotionnelles V2" icon={Mic}>
        <div className="space-y-2">
          {[
            { emoji: "🧒", name: "Enfant (Lily)", desc: "Cartoon authentique, expressif, joyeux — stability 40%, style 70%" },
            { emoji: "👩", name: "Maman (Matilda)", desc: "Ultra apaisante, maternelle, lente — stability 85%, speed -12%" },
            { emoji: "👨", name: "Papa (George)", desc: "Calme, protecteur, posé — stability 90%, style minimal" },
          ].map((v) => (
            <div key={v.name} className="flex items-start gap-3 p-2.5 rounded-xl bg-muted/40">
              <span className="text-xl">{v.emoji}</span>
              <div>
                <h4 className="text-[12px] font-semibold text-foreground">{v.name}</h4>
                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{v.desc}</p>
              </div>
            </div>
          ))}
          <div className="flex items-start gap-3 p-2.5 rounded-xl bg-primary/5 border border-primary/10">
            <span className="text-xl">🎭</span>
            <div>
              <h4 className="text-[12px] font-semibold text-primary">8 émotions dynamiques</h4>
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                Joyeux, triste, effrayé, excité, calme, curieux, en colère, ennuyé — la voix s'adapte automatiquement
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* 📖 Histoires */}
      <Card title="📖 Histoires & Personnages" icon={BookOpen}>
        <div className="space-y-2">
          {[
            { emoji: "👑", label: "Princesse", tag: "Conte" },
            { emoji: "🏴‍☠️", label: "Pirate", tag: "Aventure" },
            { emoji: "🚀", label: "Espace", tag: "Sci-Fi" },
            { emoji: "🐉", label: "Animaux", tag: "Nature" },
            { emoji: "✨", label: "Magie", tag: "Fantaisie" },
            { emoji: "🧠", label: "Éducatif", tag: "Apprentissage" },
          ].map((t) => (
            <div key={t.label} className="flex items-center gap-3 py-1.5">
              <span className="text-lg">{t.emoji}</span>
              <span className="text-[12px] font-medium text-foreground flex-1">{t.label}</span>
              <span className="text-[9px] px-2 py-0.5 bg-muted rounded-full text-muted-foreground font-medium">{t.tag}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 p-2.5 rounded-xl bg-muted/40">
          <p className="text-[10px] text-muted-foreground">
            🧒 <strong className="text-foreground">Bobby</strong> — personnage principal, ami imaginaire vivant dans un jouet
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            🎵 <strong className="text-foreground">Zik</strong> — ami imaginaire de Bobby, un peu coquin
          </p>
        </div>
      </Card>

      {/* ⚡ Nouvelles fonctionnalités */}
      <Card title="⚡ Nouvelles fonctionnalités" icon={Zap}>
        <div className="space-y-2.5">
          {[
            { emoji: "🌙", title: "Mode calme automatique", desc: "Voix plus douce quand le mode nuit ou personnalité calme est activé" },
            { emoji: "⚡", title: "Vitesse de voix réelle", desc: "Le réglage Lent/Normal/Rapide modifie la vitesse ElevenLabs en temps réel" },
            { emoji: "🧠", title: "Mémoire enfant", desc: "Bobby se souvient des thèmes favoris et préférences entre les sessions" },
            { emoji: "🎙️", title: "Deepgram STT", desc: "Reconnaissance vocale en temps réel pour une écoute fluide" },
            { emoji: "📊", title: "Analyses émotionnelles", desc: "Scores de sociabilité, curiosité et stabilité émotionnelle par session" },
            { emoji: "🔒", title: "Sécurité renforcée", desc: "Filtrage contenu, code PIN, mot safe, sujets bloqués" },
          ].map((f) => (
            <div key={f.title} className="flex items-start gap-3">
              <span className="text-lg mt-0.5">{f.emoji}</span>
              <div>
                <h4 className="text-[12px] font-semibold text-foreground">{f.title}</h4>
                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* 💡 Suggérer une idée */}
      <Card title="💡 Suggérer une idée" icon={Heart}>
        <p className="text-[10px] text-muted-foreground mb-3 leading-tight">
          Vous avez une idée pour améliorer Bobby ? Partagez-la avec nous !
        </p>
        <textarea
          value={suggestionText}
          onChange={(e) => setSuggestionText(e.target.value)}
          placeholder="Ex: Ajouter une voix en anglais, un mode comptine..."
          rows={3}
          className="w-full px-4 py-2.5 rounded-xl bg-muted text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none"
        />
        <button
          onClick={handleSuggestionSubmit}
          disabled={!suggestionText.trim() || suggestionSent}
          className={`mt-2 w-full py-2.5 rounded-xl text-[12px] font-semibold transition-all ${
            suggestionSent
              ? "bg-green-500/20 text-green-600"
              : suggestionText.trim()
                ? "bg-primary text-primary-foreground hover:opacity-90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
          }`}>
          {suggestionSent ? "✅ Merci pour votre idée !" : "Envoyer ma suggestion"}
        </button>
      </Card>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════
  // RENDER: CONFIDENTIALITÉ (merged: Sécurité + Données)
  // ═══════════════════════════════════════════════════════════════

  const renderConfidentialite = () => {
    const dataCategories = [
      { id: "conversations", emoji: "💬", label: "Conversations", desc: "Messages texte", count: sessions.reduce((s, x) => s + x.message_count, 0) },
      { id: "audio", emoji: "🎙️", label: "Enregistrements", desc: "Fichiers audio", count: analyses.filter(a => a.audio_path).length },
      { id: "analyses", emoji: "📊", label: "Analyses IA", desc: "Résumés, scores", count: analyses.length },
      { id: "memories", emoji: "🧠", label: "Mémoire", desc: "Préférences", count: 1 },
    ];

    return (
      <div className="p-4 space-y-3">
        {/* ── PIN ── */}
        <Card title="Code PIN parental" icon={Lock}>
          <p className="text-[10px] text-muted-foreground mb-3 leading-tight">
            Protège l'accès au Mode Parent avec un code à 4 chiffres
          </p>
          <div className="flex gap-2 items-center">
            <input type="password" maxLength={4} inputMode="numeric" pattern="[0-9]*"
              value={settings.parentPin}
              onChange={(e) => { const val = e.target.value.replace(/\D/g, "").slice(0, 4); updateSetting("parentPin", val); }}
              placeholder="● ● ● ●"
              className="flex-1 px-4 py-2.5 rounded-xl bg-muted text-sm text-foreground text-center tracking-[0.5em] placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all font-mono" />
            {settings.parentPin.length === 4 && (
              <span className="text-[11px] text-primary font-medium flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> Actif</span>
            )}
          </div>
          {settings.parentPin.length === 4 && (
            <button onClick={() => updateSetting("parentPin", "")} className="mt-2 text-[11px] text-destructive hover:underline">
              Supprimer le code PIN
            </button>
          )}
        </Card>

        {/* ── Filtrage ── */}
        <Card title="Niveau de filtrage" icon={Shield}>
          <div className="space-y-2">
            {([
              ["standard", "🟢", "Standard", "Contenu adapté aux enfants"],
              ["strict", "🔒", "Strict", "Filtre renforcé, exclusivement positif"],
            ] as const).map(([val, emoji, label, desc]) => (
              <button key={val} onClick={() => updateSetting("contentFilter", val)}
                className={`w-full p-3 rounded-xl text-left transition-all ${
                  settings.contentFilter === val ? "bg-primary/10 ring-1 ring-primary/30" : "bg-muted/50 hover:bg-muted"
                }`}>
                <div className="flex items-center gap-3">
                  <span className="text-xl">{emoji}</span>
                  <div>
                    <h4 className="text-[12px] font-semibold text-foreground">{label}</h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* ── Protections ── */}
        <Card title="Protections" icon={Shield}>
          <div className="space-y-1">
            <SettingRow icon={Shield} title="Mode ultra-safe" desc="Protection maximale activée">
              <Toggle value={settings.ultraSafe} onChange={(v) => updateSetting("ultraSafe", v)} />
            </SettingRow>
            <SettingRow icon={Lock} title="Bloquer infos personnelles" desc="Empêche le partage de données personnelles">
              <Toggle value={settings.blockPersonalInfo} onChange={(v) => updateSetting("blockPersonalInfo", v)} />
            </SettingRow>
            <SettingRow icon={Shield} title="Bloquer les liens externes" desc="Bobby ne mentionne aucun site web">
              <Toggle value={settings.blockExternalLinks} onChange={(v) => updateSetting("blockExternalLinks", v)} />
            </SettingRow>
          </div>
        </Card>

        {/* ── Mot de sécurité ── */}
        <Card title="Mot de sécurité" icon={AlertTriangle}>
          <p className="text-[10px] text-muted-foreground mb-3 leading-tight">
            Si l'enfant dit ce mot, Bobby réagit immédiatement
          </p>
          <input type="text" value={settings.safeWord}
            onChange={(e) => updateSetting("safeWord", e.target.value.slice(0, 30))}
            placeholder="Ex: 'au secours', 'aide-moi'…"
            className="w-full px-4 py-2.5 rounded-xl bg-muted text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all mb-3" />
          {settings.safeWord.trim() && (
            <div className="grid grid-cols-3 gap-2">
              {([
                ["pause", "⏸️", "Pause"],
                ["alert", "🔔", "Alerte"],
                ["stop", "🛑", "Stop"],
              ] as const).map(([val, emoji, label]) => (
                <button key={val} onClick={() => updateSetting("safeWordAction", val)}
                  className={`p-3 rounded-xl text-center transition-all ${
                    settings.safeWordAction === val ? "bg-primary/10 ring-1 ring-primary/30" : "bg-muted/50 hover:bg-muted"
                  }`}>
                  <span className="text-lg block">{emoji}</span>
                  <span className={`text-[10px] font-semibold ${settings.safeWordAction === val ? "text-primary" : "text-foreground"}`}>{label}</span>
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* ── Collecte ── */}
        <Card title="Collecte de données" icon={Eye}>
          <div className="space-y-1">
            <SettingRow icon={Mic} title="Enregistrer les conversations" desc="Sauvegarde audio pour réécoute">
              <Toggle value={settings.recordConversations} onChange={(v) => updateSetting("recordConversations", v)} />
            </SettingRow>
            <SettingRow icon={EyeOff} title="Mode privé" desc="Analyse seule, sans audio">
              <Toggle value={settings.privacyMode} onChange={(v) => updateSetting("privacyMode", v)} />
            </SettingRow>
          </div>
        </Card>

        {/* ── Données stockées ── */}
        <Card title="Données stockées" icon={BarChart3}>
          <div className="grid grid-cols-2 gap-2">
            {dataCategories.map(cat => (
              <div key={cat.id} className="p-3 rounded-xl bg-muted/50">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-lg">{cat.emoji}</span>
                  <span className="text-[11px] font-mono font-bold text-primary bg-primary/8 px-2 py-0.5 rounded-full">{cat.count}</span>
                </div>
                <h4 className="text-[12px] font-semibold text-foreground">{cat.label}</h4>
                <p className="text-[9px] text-muted-foreground">{cat.desc}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* ── Conservation ── */}
        <Card title="Conservation" icon={Calendar}>
          <div className="grid grid-cols-2 gap-2">
            {([
              ["7j", "🗓️", "7 jours"],
              ["30j", "📅", "30 jours"],
              ["90j", "📆", "90 jours"],
              ["forever", "♾️", "Indéfini"],
            ] as const).map(([val, emoji, label]) => (
              <button key={val} onClick={() => updateSetting("dataRetention", val)}
                className={`p-3 rounded-xl text-center transition-all ${
                  settings.dataRetention === val ? "bg-primary/10 ring-1 ring-primary/30" : "bg-muted/50 hover:bg-muted"
                }`}>
                <span className="text-xl block mb-1">{emoji}</span>
                <span className={`text-[11px] font-semibold ${settings.dataRetention === val ? "text-primary" : "text-foreground"}`}>{label}</span>
              </button>
            ))}
          </div>
        </Card>

        {/* ── Droits RGPD ── */}
        <Card title="Vos droits (RGPD)" icon={FileText}>
          <div className="grid grid-cols-2 gap-2">
            {([
              ["access", "👁️", "Accès", "Voir vos données"],
              ["export", "📥", "Portabilité", "Export JSON"],
              ["rectify", "✏️", "Rectification", "Corriger"],
              ["delete", "🗑️", "Effacement", "Supprimer"],
            ] as const).map(([id, emoji, label, desc]) => (
              <button key={id}
                onClick={() => {
                  if (id === "export") {
                    const allData = {
                      exportDate: new Date().toISOString(), childName,
                      settings: { ...settings, parentPin: "[MASQUÉ]" },
                      sessions: sessions.map(s => {
                        const analysis = analyses.find(a => a.session_id === s.id);
                        return { id: s.id, date: s.started_at, ended: s.ended_at, duration: s.duration_seconds, messages: s.message_count,
                          emotions: s.detected_emotions, topics: s.topics, tags: s.tags, summary: analysis?.summary,
                          transcription: analysis?.full_transcription,
                          scores: analysis ? { sociability: analysis.sociability_score, curiosity: analysis.curiosity_score, stability: analysis.emotional_stability_score } : null,
                          interests: analysis?.extracted_interests, insights: analysis?.behavior_insights,
                        };
                      }),
                    };
                    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url; a.download = `bobby-rgpd-export-${childName}-${new Date().toISOString().slice(0, 10)}.json`;
                    a.click(); URL.revokeObjectURL(url);
                  } else if (id === "access") { setActiveTab("sessions"); }
                  else if (id === "delete") {
                    setConfirmDialog({
                      title: "Supprimer TOUTES les données ?",
                      description: "Cette action est IRRÉVERSIBLE. Toutes les sessions, analyses, messages et mémoires de Bobby seront effacés.",
                      confirmLabel: "Tout supprimer",
                      variant: "danger",
                      onConfirm: () => {
                        Promise.all([
                          supabase.from("conversation_analyses").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
                          supabase.from("session_messages").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
                          supabase.from("child_sessions").delete().eq("child_name", childName),
                          supabase.from("child_memories").delete().eq("child_name", childName),
                        ]).then(() => loadData());
                        setConfirmDialog(null);
                      },
                    });
                  } else if (id === "rectify") { setActiveTab("profil"); }
                }}
                className="p-3 rounded-xl text-left transition-all bg-muted/50 hover:bg-muted active:scale-95">
                <span className="text-xl block mb-1">{emoji}</span>
                <h4 className="text-[12px] font-semibold text-foreground">{label}</h4>
                <p className="text-[9px] text-muted-foreground">{desc}</p>
              </button>
            ))}
          </div>
        </Card>

        {/* ── Suppression sélective ── */}
        <Card title="Suppression sélective" icon={Trash2}>
          <div className="space-y-2">
            {[
              { emoji: "🎙️", label: "Supprimer les audio", desc: "Garde les analyses", action: () => {
                setConfirmDialog({
                  title: "Supprimer les enregistrements ?",
                  description: "Tous les fichiers audio seront supprimés. Les analyses textuelles seront conservées.",
                  confirmLabel: "Supprimer",
                  variant: "danger",
                  onConfirm: () => {
                    supabase.storage.from("conversation-audio").list().then(({ data }) => {
                      if (data?.length) supabase.storage.from("conversation-audio").remove(data.map(f => f.name));
                    });
                    setConfirmDialog(null);
                  },
                });
              }},
              { emoji: "📊", label: "Supprimer les analyses", desc: "Garde les sessions", action: () => {
                setConfirmDialog({
                  title: "Supprimer les analyses ?",
                  description: "Toutes les analyses IA seront supprimées. Les sessions et messages seront conservés.",
                  confirmLabel: "Supprimer",
                  variant: "danger",
                  onConfirm: () => {
                    supabase.from("conversation_analyses").delete().neq("id", "00000000-0000-0000-0000-000000000000").then(() => loadData());
                    setConfirmDialog(null);
                  },
                });
              }},
              { emoji: "🧠", label: "Réinitialiser la mémoire", desc: "Bobby oublie les préférences", action: () => {
                setConfirmDialog({
                  title: "Réinitialiser la mémoire ?",
                  description: "Bobby oubliera toutes les préférences et intérêts de l'enfant qu'il a appris.",
                  confirmLabel: "Réinitialiser",
                  variant: "warning",
                  onConfirm: () => {
                    supabase.from("child_memories").delete().eq("child_name", childName).then(() => loadData());
                    setConfirmDialog(null);
                  },
                });
              }},
            ].map(item => (
              <button key={item.label} onClick={item.action}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-destructive/5 transition-all text-left">
                <span className="text-lg">{item.emoji}</span>
                <div className="flex-1">
                  <h4 className="text-[12px] font-semibold text-foreground">{item.label}</h4>
                  <p className="text-[9px] text-muted-foreground">{item.desc}</p>
                </div>
                <Trash2 className="w-4 h-4 text-destructive" />
              </button>
            ))}
          </div>
        </Card>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════
  // TAB TRANSITION ANIMATION
  // ═══════════════════════════════════════════════════════════════

  const tabIds = tabs.map(t => t.id);
  const prevTabRef = useRef(activeTab);
  const [animClass, setAnimClass] = useState("");
  const [displayedTab, setDisplayedTab] = useState(activeTab);

  useEffect(() => {
    if (activeTab === prevTabRef.current) return;
    const prevIdx = tabIds.indexOf(prevTabRef.current);
    const nextIdx = tabIds.indexOf(activeTab);
    const direction = nextIdx > prevIdx ? "right" : "left";
    setAnimClass(direction === "right" ? "tab-exit-left" : "tab-exit-right");
    const t = setTimeout(() => {
      setDisplayedTab(activeTab);
      setAnimClass(direction === "right" ? "tab-enter-right" : "tab-enter-left");
      const t2 = setTimeout(() => setAnimClass(""), 280);
      return () => clearTimeout(t2);
    }, 150);
    prevTabRef.current = activeTab;
    return () => clearTimeout(t);
  }, [activeTab]);

  // ═══════════════════════════════════════════════════════════════
  // RENDER: MAIN
  // ═══════════════════════════════════════════════════════════════

  const renderTabContent = () => {
    if (selectedSession) return renderSessionDetail();
    switch (displayedTab) {
      case "dashboard": return renderDashboard();
      case "sessions": return renderSessionsList();
      case "activites": return (
        <ContentCategories
          childName={childName}
          onSelectCategory={() => {}}
          onBack={() => setActiveTab("dashboard")}
        />
      );
      case "profil": return renderProfil();
      case "reglages": return renderReglages();
      case "histoires": return <StoryLibrary childName={childName} voiceProfile={settings.voiceType || "female"} />;
      case "confidentialite": return renderConfidentialite();
      default: return renderDashboard();
    }
  };

  const [lightMode, setLightMode] = useState(() => {
    const stored = localStorage.getItem("parent-light");
    return stored === null ? true : stored === "true";
  });

  const toggleLight = () => {
    setLightMode(v => {
      localStorage.setItem("parent-light", String(!v));
      return !v;
    });
  };

  return (
    <div className={`min-h-screen bg-background max-w-lg mx-auto flex flex-col transition-colors duration-300 ${lightMode ? "parent-light" : ""}`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-card border-b border-border">
        <button
          onClick={selectedSession ? () => { setSelectedSession(null); setSelectedAnalysis(null); setSessionMessages([]); setPlayingAudio(null); setAudioProgress(0); setActiveMessageIdx(-1); if (audioRef.current) audioRef.current.pause(); if (progressInterval.current) clearInterval(progressInterval.current); } : onClose}
          className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <div className="flex-1">
          <h2 className="text-base font-bold text-foreground">Mode Parent</h2>
          <p className="text-[11px] text-muted-foreground">
            {selectedSession ? formatDate(selectedSession.started_at) : `${childName}`}
          </p>
        </div>
        {!selectedSession && (
          <div className="flex items-center gap-1.5">
            <button onClick={toggleLight}
              className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-all">
              {lightMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
            <button onClick={loadData} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Tab bar */}
      {!selectedSession && (
        <div className="flex border-b border-border bg-card">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-0 flex flex-col items-center gap-0.5 py-2.5 px-1 text-[10px] font-medium transition-all duration-200 ${
                activeTab === tab.id ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
              }`}>
              <tab.icon className={`w-4 h-4 transition-transform duration-200 ${activeTab === tab.id ? "scale-110" : ""}`} />
              <span className="truncate">{tab.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className={`tab-content-wrapper ${animClass}`}>
          {renderTabContent()}
        </div>
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={!!confirmDialog}
        title={confirmDialog?.title || ""}
        description={confirmDialog?.description || ""}
        confirmLabel={confirmDialog?.confirmLabel}
        variant={confirmDialog?.variant}
        onConfirm={() => confirmDialog?.onConfirm()}
        onCancel={() => setConfirmDialog(null)}
      />
    </div>
  );
};

export default ParentMode;
