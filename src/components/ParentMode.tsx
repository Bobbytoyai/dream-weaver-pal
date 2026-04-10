import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  ArrowLeft, Clock, MessageSquare, Heart, Brain, Loader2, RefreshCw,
  Mic, BookOpen, Timer, Sparkles, Shield, Camera, Volume2, VolumeX,
  Play, Pause, AlertTriangle, TrendingUp, Trash2, ChevronRight,
  BarChart3, Calendar, User, Zap, Moon, Sun, Hand, Lock,
  Download, ToggleLeft, Settings, Eye, EyeOff, FileText, Tag
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { supabase } from "@/integrations/supabase/client";

import { ParentSettings, DEFAULT_PARENT_SETTINGS } from "./parentSettings";
export { ParentSettings, DEFAULT_PARENT_SETTINGS };

// ─── Types ───────────────────────────────────────────────────────────

interface ParentModeProps {
  childName: string;
  onClose: () => void;
  parentSettings?: ParentSettings;
  onSettingsChange?: (settings: ParentSettings) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────

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
  positive: { label: "Positif", color: "text-green-500", emoji: "🟢" },
  neutral: { label: "Neutre", color: "text-yellow-500", emoji: "🟡" },
  low: { label: "Bas", color: "text-red-400", emoji: "🔴" },
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

// ─── Toggle Component ─────────────────────────────────────────────

const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
  <button onClick={() => onChange(!value)}
    className={`w-12 h-7 rounded-full transition-all ${value ? "bg-primary" : "bg-muted"}`}>
    <div className={`w-5 h-5 rounded-full bg-card shadow transition-transform ${value ? "translate-x-6" : "translate-x-1"}`} />
  </button>
);

// ─── Setting Row ──────────────────────────────────────────────────

const SettingRow = ({ icon: Icon, title, desc, children }: {
  icon: any; title: string; desc?: string; children: React.ReactNode;
}) => (
  <div className="flex items-center justify-between py-3">
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <Icon className="w-5 h-5 text-primary shrink-0" />
      <div className="min-w-0">
        <h4 className="text-sm font-bold text-foreground">{title}</h4>
        {desc && <p className="text-xs text-muted-foreground truncate">{desc}</p>}
      </div>
    </div>
    <div className="shrink-0 ml-3">{children}</div>
  </div>
);

// ─── Section Card ─────────────────────────────────────────────────

const Card = ({ title, icon: Icon, children }: { title?: string; icon?: any; children: React.ReactNode }) => (
  <div className="bg-card rounded-2xl p-4 border border-border">
    {title && (
      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon className="w-5 h-5 text-primary" />}
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
      </div>
    )}
    {children}
  </div>
);

// ─── Score Gauge ──────────────────────────────────────────────────

const ScoreGauge = ({ label, score, emoji, color }: { label: string; score: number; emoji: string; color: string }) => (
  <div className="flex flex-col items-center gap-1">
    <div className="relative w-16 h-16">
      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
        <path d="M18 2.0845a15.9155 15.9155 0 010 31.831 15.9155 15.9155 0 010-31.831"
          fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
        <path d="M18 2.0845a15.9155 15.9155 0 010 31.831 15.9155 15.9155 0 010-31.831"
          fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={`${score}, 100`}
          strokeLinecap="round" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-lg">{emoji}</span>
    </div>
    <span className="text-[10px] text-muted-foreground font-bold text-center">{label}</span>
    <span className="text-sm font-extrabold text-foreground">{score}</span>
  </div>
);

// ─── Tab config ───────────────────────────────────────────────────

type Tab = "dashboard" | "sessions" | "profil" | "voix" | "contenu" | "securite" | "limites" | "donnees";

const tabs: { id: Tab; icon: any; label: string }[] = [
  { id: "dashboard", icon: BarChart3, label: "Tableau" },
  { id: "sessions", icon: MessageSquare, label: "Sessions" },
  { id: "profil", icon: User, label: "Profil" },
  { id: "voix", icon: Mic, label: "Voix" },
  { id: "contenu", icon: BookOpen, label: "Contenu" },
  { id: "securite", icon: Shield, label: "Sécurité" },
  { id: "limites", icon: Timer, label: "Limites" },
  { id: "donnees", icon: Lock, label: "Données" },
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
  const [newBlockedTopic, setNewBlockedTopic] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
      supabase.from("child_sessions").select("*").eq("child_name", childName).order("started_at", { ascending: false }).limit(50),
      supabase.from("conversation_analyses").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    if (sessionsRes.data) setSessions(sessionsRes.data as any);
    if (analysesRes.data) setAnalyses(analysesRes.data as any);
    setLoading(false);
  };

  const analyzeSession = async (session: Session) => {
    setSelectedSession(session);
    // Load messages for transcription view
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

  const playAudio = async (audioPath: string) => {
    if (playingAudio === audioPath) { audioRef.current?.pause(); setPlayingAudio(null); return; }
    const { data } = await supabase.storage.from("conversation-audio").createSignedUrl(audioPath, 3600);
    if (data?.signedUrl) {
      if (audioRef.current) audioRef.current.pause();
      const audio = new Audio(data.signedUrl);
      audioRef.current = audio;
      audio.onended = () => setPlayingAudio(null);
      audio.play();
      setPlayingAudio(audioPath);
    }
  };

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
        lines.push(`SCORES COMPORTEMENTAUX`, `───────`);
        lines.push(`  🤝 Sociabilité : ${analysis.sociability_score}/100`);
        lines.push(`  🔍 Curiosité : ${analysis.curiosity_score}/100`);
        lines.push(`  ⚖️ Stabilité : ${analysis.emotional_stability_score}/100`);
        lines.push(``);
      }

      if (analysis.extracted_interests?.length) {
        lines.push(`CENTRES D'INTÉRÊT`, `───────`, `  ${analysis.extracted_interests.join(", ")}`, ``);
      }

      if (analysis.topics_detected?.length) {
        lines.push(`SUJETS ABORDÉS`, `───────`, `  ${analysis.topics_detected.join(", ")}`, ``);
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
  const avgEmotions = recentAnalyses.length > 0
    ? Object.keys(emotionScoreLabels).reduce((acc, key) => {
        const sum = recentAnalyses.reduce((s, a) => s + ((a.emotions as any)?.[key] || 0), 0);
        acc[key] = Math.round(sum / recentAnalyses.length);
        return acc;
      }, {} as Record<string, number>)
    : {};

  const allAlerts = analyses.flatMap(a => (a.alerts || []).map(alert => ({
    ...alert, date: a.created_at, sessionId: a.session_id,
  })));

  const allTopics = analyses.flatMap(a => a.topics_detected || []);
  const topicCounts = allTopics.reduce((acc, t) => { acc[t] = (acc[t] || 0) + 1; return acc; }, {} as Record<string, number>);
  const topTopics = Object.entries(topicCounts).sort(([, a], [, b]) => b - a).slice(0, 8);

  const today = new Date().toDateString();
  const todaySessions = sessions.filter(s => new Date(s.started_at).toDateString() === today);
  const todayDuration = todaySessions.reduce((acc, s) => acc + (s.duration_seconds || 0), 0);
  const dominantMood = Object.entries(emotionCounts).sort(([, a], [, b]) => b - a)[0];

  // Avg behavioral scores
  const avgScores = useMemo(() => {
    const scored = analyses.filter(a => a.sociability_score != null);
    if (scored.length === 0) return null;
    return {
      sociability: Math.round(scored.reduce((s, a) => s + (a.sociability_score || 0), 0) / scored.length),
      curiosity: Math.round(scored.reduce((s, a) => s + (a.curiosity_score || 0), 0) / scored.length),
      stability: Math.round(scored.reduce((s, a) => s + (a.emotional_stability_score || 0), 0) / scored.length),
    };
  }, [analyses]);

  // All interests aggregated
  const allInterests = useMemo(() => {
    const counts: Record<string, number> = {};
    analyses.forEach(a => {
      (a.extracted_interests || []).forEach(i => { counts[i] = (counts[i] || 0) + 1; });
    });
    return Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 12);
  }, [analyses]);

  // 7-day emotion evolution
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
      "😊 Joie": d.count > 0 ? Math.round(d.joy / d.count) : null,
      "🧐 Curiosité": d.count > 0 ? Math.round(d.curiosity / d.count) : null,
      "😤 Frustration": d.count > 0 ? Math.round(d.frustration / d.count) : null,
      "😰 Peur": d.count > 0 ? Math.round(d.fear / d.count) : null,
      "😢 Tristesse": d.count > 0 ? Math.round(d.sadness / d.count) : null,
      "🤩 Excitation": d.count > 0 ? Math.round(d.excitement / d.count) : null,
    }));
  }, [analyses]);

  // Radar chart data for behavioral scores
  const radarData = useMemo(() => {
    if (!avgScores) return [];
    return [
      { subject: "Sociabilité", value: avgScores.sociability },
      { subject: "Curiosité", value: avgScores.curiosity },
      { subject: "Stabilité", value: avgScores.stability },
    ];
  }, [avgScores]);

  // Filtered sessions
  const filteredSessions = useMemo(() => {
    if (!tagFilter) return sessions;
    return sessions.filter(s => s.tags?.includes(tagFilter));
  }, [sessions, tagFilter]);

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

  const renderDashboard = () => (
    <div className="p-4 space-y-4">
      {/* Quick summary */}
      <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl p-4 border border-primary/20">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Aujourd'hui</h3>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="text-center">
            <p className="text-2xl font-extrabold text-primary">{todaySessions.length}</p>
            <p className="text-[10px] text-muted-foreground">Sessions</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-extrabold text-primary">{formatDuration(todayDuration)}</p>
            <p className="text-[10px] text-muted-foreground">Temps</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-extrabold text-foreground">
              {dominantMood ? emotionLabels[dominantMood[0]]?.emoji || "—" : "—"}
            </p>
            <p className="text-[10px] text-muted-foreground">Humeur</p>
          </div>
        </div>
        {topTopics.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {topTopics.slice(0, 4).map(([topic]) => (
              <span key={topic} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">{topic}</span>
            ))}
          </div>
        )}
      </div>

      {/* Quick presets */}
      <Card title="Modes rapides" icon={Zap}>
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: "calm", label: "😌 Mode calme", desc: "Voix douce, rythme lent" },
            { id: "game", label: "🎮 Mode jeu", desc: "Énergique, fun" },
            { id: "night", label: "🌙 Mode nuit", desc: "Ultra doux, apaisant" },
            { id: "education", label: "📚 Mode éducatif", desc: "Apprentissage ludique" },
          ].map(preset => (
            <button key={preset.id} onClick={() => applyPreset(preset.id)}
              className="text-left p-3 rounded-xl bg-muted hover:bg-primary/10 hover:border-primary/30 border border-transparent transition-all">
              <span className="text-sm font-bold text-foreground block">{preset.label}</span>
              <span className="text-[10px] text-muted-foreground">{preset.desc}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Alerts */}
      {allAlerts.length > 0 && (
        <div className="bg-destructive/5 rounded-2xl p-4 border border-destructive/20">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <h3 className="text-sm font-bold text-destructive">Alertes</h3>
          </div>
          <div className="space-y-2">
            {allAlerts.slice(0, 5).map((alert, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="text-destructive mt-0.5">⚠️</span>
                <div>
                  <p className="text-foreground">{alert.message}</p>
                  <p className="text-[10px] text-muted-foreground">{formatDate(alert.date)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Behavioral scores */}
      {avgScores && (
        <Card title="Score comportemental" icon={Brain}>
          <div className="flex justify-around py-2">
            <ScoreGauge label="Sociabilité" score={avgScores.sociability} emoji="🤝" color="hsl(var(--primary))" />
            <ScoreGauge label="Curiosité" score={avgScores.curiosity} emoji="🔍" color="#f59e0b" />
            <ScoreGauge label="Stabilité" score={avgScores.stability} emoji="⚖️" color="#22c55e" />
          </div>
        </Card>
      )}

      {/* Emotion averages */}
      {Object.keys(avgEmotions).length > 0 && (
        <Card title="Émotions moyennes" icon={Heart}>
          <div className="space-y-2">
            {Object.entries(avgEmotions).filter(([, v]) => v > 0).sort(([, a], [, b]) => b - a).map(([key, value]) => {
              const info = emotionScoreLabels[key] || { label: key, emoji: "❓" };
              return (
                <div key={key} className="flex items-center gap-2">
                  <span className="w-6 text-center">{info.emoji}</span>
                  <span className="text-xs text-foreground w-20">{info.label}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${value}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground w-8 text-right">{value}%</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* 7-day emotion chart */}
      {emotionChartData.some(d => d["😊 Joie"] !== null) && (
        <Card title="Évolution émotionnelle (7 jours)" icon={TrendingUp}>
          <div className="w-full h-52 -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={emotionChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} domain={[0, 100]} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "12px" }} />
                <Line type="monotone" dataKey="😊 Joie" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                <Line type="monotone" dataKey="🧐 Curiosité" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                <Line type="monotone" dataKey="🤩 Excitation" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                <Line type="monotone" dataKey="😤 Frustration" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                <Line type="monotone" dataKey="😰 Peur" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                <Line type="monotone" dataKey="😢 Tristesse" stroke="#64748b" strokeWidth={2} dot={{ r: 3 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {[
              { label: "Joie", color: "#22c55e" }, { label: "Curiosité", color: "#3b82f6" },
              { label: "Excitation", color: "#f59e0b" }, { label: "Frustration", color: "#ef4444" },
              { label: "Peur", color: "#8b5cf6" }, { label: "Tristesse", color: "#64748b" },
            ].map(e => (
              <span key={e.label} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: e.color }} />
                {e.label}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Interests cloud */}
      {allInterests.length > 0 && (
        <Card title="Centres d'intérêt" icon={Sparkles}>
          <div className="flex flex-wrap gap-2">
            {allInterests.map(([interest, count]) => (
              <span key={interest} className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold"
                style={{ fontSize: `${Math.min(14, 10 + count * 1.5)}px` }}>
                {interest} <span className="opacity-50">×{count}</span>
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* All-time stats */}
      <Card title="Statistiques globales" icon={TrendingUp}>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-xl font-extrabold text-primary">{totalSessions}</p>
            <p className="text-[10px] text-muted-foreground">Sessions</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-extrabold text-primary">{totalMessages}</p>
            <p className="text-[10px] text-muted-foreground">Messages</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-extrabold text-foreground">{formatDuration(totalDuration)}</p>
            <p className="text-[10px] text-muted-foreground">Temps total</p>
          </div>
        </div>
      </Card>

      {totalSessions === 0 && !loading && (
        <div className="text-center py-8 text-muted-foreground">
          <Brain className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Aucune donnée disponible.</p>
          <p className="text-xs mt-1">Les analyses apparaîtront après les premières conversations.</p>
        </div>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════
  // RENDER: SESSION DETAIL
  // ═══════════════════════════════════════════════════════════════

  const renderSessionDetail = () => {
    const analysis = selectedAnalysis || analyses.find(a => a.session_id === selectedSession?.id);
    const moodInfo = moodLabels[(analysis?.mood_score || "neutral")] || moodLabels.neutral;

    return (
      <div className="p-4 space-y-4">
        {/* Session tags */}
        {selectedSession?.tags && selectedSession.tags.length > 0 && (
          <div className="flex gap-2">
            {selectedSession.tags.map(tag => {
              const info = tagLabels[tag] || { label: tag, emoji: "🏷️", color: "bg-muted text-muted-foreground" };
              return (
                <span key={tag} className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${info.color}`}>
                  {info.emoji} {info.label}
                </span>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card rounded-2xl p-3 text-center border border-border">
            <Clock className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="text-xs text-muted-foreground">Durée</p>
            <p className="text-sm font-bold text-foreground">{formatDuration(selectedSession!.duration_seconds)}</p>
          </div>
          <div className="bg-card rounded-2xl p-3 text-center border border-border">
            <MessageSquare className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="text-xs text-muted-foreground">Messages</p>
            <p className="text-sm font-bold text-foreground">{selectedSession!.message_count}</p>
          </div>
          <div className="bg-card rounded-2xl p-3 text-center border border-border">
            <span className="text-lg">{moodInfo.emoji}</span>
            <p className="text-xs text-muted-foreground">Humeur</p>
            <p className={`text-sm font-bold ${moodInfo.color}`}>{moodInfo.label}</p>
          </div>
        </div>

        {analysis?.audio_path && (
          <Card title="Réécouter" icon={Mic}>
            <button onClick={() => playAudio(analysis.audio_path!)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-all">
              {playingAudio === analysis.audio_path
                ? <><Pause className="w-4 h-4" /> Pause</>
                : <><Play className="w-4 h-4" /> Écouter</>}
            </button>
          </Card>
        )}

        {analyzing ? (
          <Card><div className="flex items-center gap-3"><Loader2 className="w-5 h-5 animate-spin text-primary" /><span className="text-sm text-muted-foreground">Analyse en cours…</span></div></Card>
        ) : analysis ? (
          <>
            {analysis.summary && (
              <Card title="Résumé" icon={Brain}>
                <p className="text-sm text-foreground leading-relaxed">{analysis.summary}</p>
              </Card>
            )}

            {/* Behavioral scores for this session */}
            {analysis.sociability_score != null && (
              <Card title="Score comportemental" icon={Brain}>
                <div className="flex justify-around py-2">
                  <ScoreGauge label="Sociabilité" score={analysis.sociability_score || 0} emoji="🤝" color="hsl(var(--primary))" />
                  <ScoreGauge label="Curiosité" score={analysis.curiosity_score || 0} emoji="🔍" color="#f59e0b" />
                  <ScoreGauge label="Stabilité" score={analysis.emotional_stability_score || 0} emoji="⚖️" color="#22c55e" />
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
                        <span className="text-xs text-foreground w-20">{info.label}</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${value}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground w-8 text-right">{value as number}%</span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Extracted interests */}
            {analysis.extracted_interests && analysis.extracted_interests.length > 0 && (
              <Card title="Centres d'intérêt détectés" icon={Sparkles}>
                <div className="flex flex-wrap gap-2">
                  {analysis.extracted_interests.map((interest, i) => (
                    <span key={i} className="px-3 py-1 rounded-full bg-accent/30 text-accent-foreground text-xs font-bold">
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
                    <span key={i} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">{t}</span>
                  ))}
                </div>
              </Card>
            )}

            {analysis.behavior_insights?.length > 0 && (
              <Card title="Observations">
                <ul className="space-y-1.5">
                  {analysis.behavior_insights.map((insight, i) => (
                    <li key={i} className="text-sm text-foreground flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>{insight}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <Card title="Engagement">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-muted-foreground">Niveau</p>
                  <p className="text-sm font-bold text-foreground capitalize">{analysis.engagement_level}</p>
                </div>
                {analysis.attention_span && (
                  <div>
                    <p className="text-[10px] text-muted-foreground">Attention</p>
                    <p className="text-sm font-bold text-foreground">{analysis.attention_span}</p>
                  </div>
                )}
              </div>
            </Card>

            {analysis.alerts?.length > 0 && (
              <div className="bg-destructive/5 rounded-2xl p-4 border border-destructive/20">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  <h3 className="text-sm font-bold text-destructive">Alertes</h3>
                </div>
                {analysis.alerts.map((alert, i) => (
                  <p key={i} className="text-sm text-foreground">⚠️ {alert.message}</p>
                ))}
              </div>
            )}

            {/* Speaker-highlighted transcription */}
            {sessionMessages.length > 0 && (
              <Card title="Transcription" icon={FileText}>
                <div className="max-h-72 overflow-y-auto space-y-2">
                  {sessionMessages.map((msg, i) => {
                    const isChild = msg.role === "user";
                    return (
                      <div key={i} className={`flex ${isChild ? "justify-start" : "justify-end"}`}>
                        <div className={`max-w-[85%] rounded-2xl px-3 py-2 ${
                          isChild
                            ? "bg-accent/20 border border-accent/30"
                            : "bg-primary/10 border border-primary/20"
                        }`}>
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[10px] font-bold text-muted-foreground">
                              {isChild ? `👦 ${childName}` : "🤖 Bobby"}
                            </span>
                            {msg.detected_emotion && (
                              <span className="text-[10px]">
                                {emotionLabels[msg.detected_emotion]?.emoji || ""}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-foreground leading-relaxed">{msg.content}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Export button */}
            <button
              onClick={() => exportSessionPDF(selectedSession!, analysis)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary/10 text-primary text-sm font-bold hover:bg-primary/20 transition-all">
              <Download className="w-4 h-4" /> Exporter le rapport
            </button>
          </>
        ) : (
          <button onClick={() => analyzeSession(selectedSession!)}
            className="w-full bg-primary text-primary-foreground rounded-2xl p-4 font-bold text-sm hover:opacity-90 transition-all">
            🧠 Lancer l'analyse IA
          </button>
        )}

        <button
          onClick={() => {
            if (confirm("Supprimer cette session et toutes ses données ?")) deleteSession(selectedSession!.id);
          }}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-destructive/10 text-destructive text-sm font-bold hover:bg-destructive/20 transition-all">
          <Trash2 className="w-4 h-4" /> Supprimer cette session
        </button>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER: SESSIONS LIST
  // ═══════════════════════════════════════════════════════════════

  const renderSessionsList = () => (
    <div className="p-4">
      {/* Tag filter */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        <button onClick={() => setTagFilter(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${!tagFilter ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
          Tous
        </button>
        {Object.entries(tagLabels).map(([key, info]) => (
          <button key={key} onClick={() => setTagFilter(tagFilter === key ? null : key)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${tagFilter === key ? "bg-primary text-primary-foreground" : info.color}`}>
            {info.emoji} {info.label}
          </button>
        ))}
      </div>

      <h3 className="text-sm font-bold text-foreground mb-3">
        {tagFilter ? `Sessions "${tagLabels[tagFilter]?.label}"` : "Toutes les sessions"} ({filteredSessions.length})
      </h3>
      {loading ? (
        <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : filteredSessions.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground"><p className="text-sm">Aucune session{tagFilter ? " avec ce tag" : " enregistrée"}.</p></div>
      ) : (
        <div className="space-y-2">
          {filteredSessions.map(session => {
            const hasAnalysis = analyses.some(a => a.session_id === session.id);
            const analysis = analyses.find(a => a.session_id === session.id);
            const mood = moodLabels[(analysis?.mood_score || "neutral")] || moodLabels.neutral;
            return (
              <button key={session.id} onClick={() => analyzeSession(session)}
                className="w-full bg-card rounded-2xl p-4 border border-border hover:border-primary transition-all text-left">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-bold text-foreground">{formatDate(session.started_at)}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{formatDuration(session.duration_seconds)}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">{session.message_count} msg</span>
                  {hasAnalysis && <span className="text-sm">{mood.emoji}</span>}
                  {session.tags?.map(tag => {
                    const info = tagLabels[tag];
                    return info ? (
                      <span key={tag} className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${info.color}`}>
                        {info.emoji}
                      </span>
                    ) : null;
                  })}
                  {hasAnalysis && <Brain className="w-3 h-3 text-primary ml-auto" />}
                </div>
                {analysis?.summary && <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{analysis.summary}</p>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════
  // RENDER: PROFIL
  // ═══════════════════════════════════════════════════════════════

  const renderProfil = () => (
    <div className="p-4 space-y-4">
      <Card title="Profil de l'enfant" icon={User}>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Prénom</p>
            <p className="text-lg font-extrabold text-foreground">{childName}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Âge</p>
            <div className="flex gap-2">
              {[5, 6, 7, 8, 9, 10, 11, 12].map(age => (
                <button key={age} onClick={() => updateSetting("childAge", age)}
                  className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${settings.childAge === age ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {age}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card title="Personnalité de Bobby" icon={Sparkles}>
        <div className="space-y-2">
          {([
            ["balanced", "⚖️ Équilibré", "Mode par défaut, chaleureux"],
            ["calm", "😌 Plus calme", "Doux, réconfortant, lent"],
            ["energetic", "⚡ Plus énergique", "Fun, rapide, enthousiaste"],
            ["educational", "📚 Éducatif", "Intègre des faits amusants"],
          ] as const).map(([val, label, desc]) => (
            <button key={val} onClick={() => updateSetting("personality", val)}
              className={`w-full text-left p-3 rounded-xl transition-all ${settings.personality === val ? "bg-primary/10 border border-primary/30" : "bg-muted"}`}>
              <span className="text-sm font-bold text-foreground">{label}</span>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </button>
          ))}
        </div>
      </Card>

      {/* Interests from analyses */}
      {allInterests.length > 0 && (
        <Card title="Centres d'intérêt détectés" icon={Sparkles}>
          <div className="flex flex-wrap gap-2">
            {allInterests.map(([interest, count]) => (
              <span key={interest} className="px-3 py-1 rounded-full bg-accent/20 text-accent-foreground text-xs font-bold">
                {interest} <span className="opacity-50">×{count}</span>
              </span>
            ))}
          </div>
        </Card>
      )}

      {settings.enabledThemes.length > 0 && (
        <Card title="Thèmes favoris">
          <div className="flex flex-wrap gap-2">
            {settings.enabledThemes.map(t => {
              const theme = ALL_THEMES.find(th => th.id === t);
              return <span key={t} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">{theme?.label || t}</span>;
            })}
          </div>
        </Card>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════
  // RENDER: VOIX
  // ═══════════════════════════════════════════════════════════════

  const renderVoix = () => (
    <div className="p-4 space-y-4">
      <Card title="Vitesse de la voix" icon={Mic}>
        <div className="flex gap-2">
          {([["slow", "🐢 Lent"], ["normal", "🔊 Normal"], ["fast", "⚡ Rapide"]] as const).map(([val, label]) => (
            <button key={val} onClick={() => updateSetting("voiceSpeed", val)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${settings.voiceSpeed === val ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {label}
            </button>
          ))}
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
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${settings.sfxVolume === 0 ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"}`}>
            {settings.sfxVolume === 0 ? "Off" : "On"}
          </button>
          <input type="range" min="0" max="100" value={Math.round(settings.sfxVolume * 100)}
            onChange={(e) => updateSetting("sfxVolume", Number(e.target.value) / 100)}
            className="flex-1 h-2 rounded-full appearance-none bg-muted accent-primary" />
          <span className="text-xs text-muted-foreground w-10 text-right">{Math.round(settings.sfxVolume * 100)}%</span>
        </div>
      </Card>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════
  // RENDER: CONTENU
  // ═══════════════════════════════════════════════════════════════

  const renderContenu = () => (
    <div className="p-4 space-y-4">
      <Card title="Modes de contenu" icon={BookOpen}>
        <div className="space-y-1">
          {([
            ["freeChat", "💬 Discussion libre", "Bobby bavarde librement"],
            ["educational", "📚 Éducatif", "Apprentissage ludique"],
            ["games", "🎮 Jeux", "Devinettes, quiz, défis"],
            ["stories", "📖 Histoires", "Contes et aventures"],
          ] as const).map(([key, label, desc]) => (
            <div key={key} className="flex items-center justify-between py-2.5">
              <div>
                <span className="text-sm font-bold text-foreground">{label}</span>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <Toggle
                value={settings.contentModes[key as keyof typeof settings.contentModes]}
                onChange={(v) => updateNested("contentModes", key, v)}
              />
            </div>
          ))}
        </div>
      </Card>
      <Card title="Thèmes d'histoires" icon={Sparkles}>
        <div className="space-y-2">
          {ALL_THEMES.map(theme => (
            <button key={theme.id} onClick={() => toggleTheme(theme.id)}
              className={`w-full flex items-center justify-between p-3 rounded-xl text-sm font-bold transition-all ${
                settings.enabledThemes.includes(theme.id) ? "bg-primary/10 text-primary border border-primary/30" : "bg-muted text-muted-foreground"
              }`}>
              <span>{theme.label}</span>
              <span className="text-xs">{settings.enabledThemes.includes(theme.id) ? "✓" : "—"}</span>
            </button>
          ))}
        </div>
      </Card>
      <Card title="Durée des histoires">
        <div className="flex gap-2">
          {([["courte", "⚡ Courte"], ["moyenne", "📖 Moyenne"], ["longue", "📚 Longue"]] as const).map(([val, label]) => (
            <button key={val} onClick={() => updateSetting("storyDuration", val)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${settings.storyDuration === val ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {label}
            </button>
          ))}
        </div>
      </Card>
      <Card>
        <SettingRow icon={Sparkles} title="Histoires interactives" desc="L'enfant fait des choix dans l'histoire">
          <Toggle value={settings.storyInteractive} onChange={(v) => updateSetting("storyInteractive", v)} />
        </SettingRow>
      </Card>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════
  // RENDER: SÉCURITÉ
  // ═══════════════════════════════════════════════════════════════

  const renderSecurite = () => (
    <div className="p-4 space-y-4">
      <Card title="Niveau de filtrage" icon={Shield}>
        <div className="space-y-2">
          {([
            ["standard", "🟢 Standard", "Contenu adapté aux enfants"],
            ["strict", "🔒 Strict", "Filtre renforcé, exclusivement positif"],
          ] as const).map(([val, label, desc]) => (
            <button key={val} onClick={() => updateSetting("contentFilter", val)}
              className={`w-full text-left p-3 rounded-xl transition-all ${settings.contentFilter === val ? "bg-primary/10 border border-primary/30" : "bg-muted"}`}>
              <span className="text-sm font-bold text-foreground">{label}</span>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </button>
          ))}
        </div>
      </Card>
      <Card>
        <SettingRow icon={Shield} title="Mode ultra-safe" desc="Protection maximale activée">
          <Toggle value={settings.ultraSafe} onChange={(v) => updateSetting("ultraSafe", v)} />
        </SettingRow>
      </Card>
      <Card title="Sujets bloqués" icon={EyeOff}>
        <div className="space-y-3">
          {settings.blockedTopics.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {settings.blockedTopics.map(topic => (
                <button key={topic} onClick={() => updateSetting("blockedTopics", settings.blockedTopics.filter(t => t !== topic))}
                  className="flex items-center gap-1 px-3 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-bold hover:bg-destructive/20 transition-all">
                  {topic} ✕
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input type="text" value={newBlockedTopic}
              onChange={(e) => setNewBlockedTopic(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newBlockedTopic.trim()) {
                  updateSetting("blockedTopics", [...settings.blockedTopics, newBlockedTopic.trim()]);
                  setNewBlockedTopic("");
                }
              }}
              placeholder="Ajouter un sujet…"
              className="flex-1 px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
            />
            <button onClick={() => {
                if (newBlockedTopic.trim()) {
                  updateSetting("blockedTopics", [...settings.blockedTopics, newBlockedTopic.trim()]);
                  setNewBlockedTopic("");
                }
              }}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-all">
              +
            </button>
          </div>
        </div>
      </Card>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════
  // RENDER: LIMITES
  // ═══════════════════════════════════════════════════════════════

  const renderLimites = () => (
    <div className="p-4 space-y-4">
      <Card title="Limite de temps journalier" icon={Timer}>
        <div className="flex gap-2 flex-wrap">
          {([null, 10, 20, 30, 60] as const).map(val => (
            <button key={String(val)} onClick={() => updateSetting("timeLimitMinutes", val)}
              className={`py-2 px-4 rounded-xl text-sm font-bold transition-all ${settings.timeLimitMinutes === val ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {val === null ? "∞ Illimité" : `${val} min`}
            </button>
          ))}
        </div>
      </Card>
      <Card>
        <SettingRow icon={Clock} title="Arrêt automatique" desc="Arrêt après 40s de silence">
          <Toggle value={settings.autoStop} onChange={(v) => updateSetting("autoStop", v)} />
        </SettingRow>
      </Card>
      <Card title="Mode nuit" icon={Moon}>
        <div className="space-y-3">
          <SettingRow icon={Moon} title="Activer le mode nuit" desc="Bobby ne répond plus pendant la nuit">
            <Toggle value={settings.nightMode.active} onChange={(v) => updateNested("nightMode", "active", v)} />
          </SettingRow>
          {settings.nightMode.active && (
            <div className="flex items-center gap-3 pt-2">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">Début</p>
                <input type="time" value={settings.nightMode.startHour}
                  onChange={(e) => updateNested("nightMode", "startHour", e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground outline-none focus:border-primary" />
              </div>
              <Sun className="w-4 h-4 text-muted-foreground mt-4" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">Fin</p>
                <input type="time" value={settings.nightMode.endHour}
                  onChange={(e) => updateNested("nightMode", "endHour", e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground outline-none focus:border-primary" />
              </div>
            </div>
          )}
        </div>
      </Card>
      <Card title="Interactions" icon={Hand}>
        <div className="space-y-1">
          {([
            ["wakeWord", "🎤 Mot de réveil", "Dire \"Bobby\" pour activer"],
            ["tap", "👆 Toucher", "Toucher l'écran pour activer"],
            ["interruption", "✋ Interruption", "L'enfant peut interrompre Bobby"],
          ] as const).map(([key, label, desc]) => (
            <div key={key} className="flex items-center justify-between py-2.5">
              <div>
                <span className="text-sm font-bold text-foreground">{label}</span>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <Toggle
                value={settings.interactions[key as keyof typeof settings.interactions]}
                onChange={(v) => updateNested("interactions", key, v)}
              />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════
  // RENDER: DONNÉES
  // ═══════════════════════════════════════════════════════════════

  const renderDonnees = () => (
    <div className="p-4 space-y-4">
      <Card title="Confidentialité" icon={Eye}>
        <div className="space-y-1">
          <SettingRow icon={Mic} title="Enregistrer les conversations" desc="Sauvegarde audio pour réécoute">
            <Toggle value={settings.recordConversations} onChange={(v) => updateSetting("recordConversations", v)} />
          </SettingRow>
          <SettingRow icon={EyeOff} title="Mode privé" desc="Garder seulement l'analyse, pas l'audio">
            <Toggle value={settings.privacyMode} onChange={(v) => updateSetting("privacyMode", v)} />
          </SettingRow>
        </div>
      </Card>

      <Card title="Gestion des données" icon={Lock}>
        <div className="space-y-3">
          <button
            onClick={async () => {
              const sessData = sessions.map(s => {
                const analysis = analyses.find(a => a.session_id === s.id);
                return {
                  date: s.started_at,
                  duration: s.duration_seconds,
                  messages: s.message_count,
                  emotions: s.detected_emotions,
                  topics: s.topics,
                  tags: s.tags,
                  summary: analysis?.summary,
                  scores: analysis ? {
                    sociability: analysis.sociability_score,
                    curiosity: analysis.curiosity_score,
                    stability: analysis.emotional_stability_score,
                  } : null,
                  interests: analysis?.extracted_interests,
                };
              });
              const blob = new Blob([JSON.stringify(sessData, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `bobby-data-${childName}-${new Date().toISOString().slice(0, 10)}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary/10 text-primary text-sm font-bold hover:bg-primary/20 transition-all">
            <Download className="w-4 h-4" /> Exporter les données
          </button>

          <button
            onClick={() => {
              if (confirm("Supprimer TOUT l'historique des conversations ? Cette action est irréversible.")) {
                Promise.all([
                  supabase.from("conversation_analyses").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
                  supabase.from("session_messages").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
                  supabase.from("child_sessions").delete().eq("child_name", childName),
                ]).then(() => loadData());
              }
            }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-destructive/10 text-destructive text-sm font-bold hover:bg-destructive/20 transition-all">
            <Trash2 className="w-4 h-4" /> Effacer tout l'historique
          </button>
        </div>
      </Card>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════
  // RENDER: MAIN
  // ═══════════════════════════════════════════════════════════════

  const renderTabContent = () => {
    if (selectedSession) return renderSessionDetail();
    switch (activeTab) {
      case "dashboard": return renderDashboard();
      case "sessions": return renderSessionsList();
      case "profil": return renderProfil();
      case "voix": return renderVoix();
      case "contenu": return renderContenu();
      case "securite": return renderSecurite();
      case "limites": return renderLimites();
      case "donnees": return renderDonnees();
      default: return renderDashboard();
    }
  };

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 bg-card border-b border-border">
        <button
          onClick={selectedSession ? () => { setSelectedSession(null); setSelectedAnalysis(null); setSessionMessages([]); } : onClose}
          className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-extrabold text-foreground">Mode Parent</h2>
          <p className="text-xs text-muted-foreground">
            {selectedSession ? formatDate(selectedSession.started_at) : `Contrôle de ${childName}`}
          </p>
        </div>
        {!selectedSession && (
          <button onClick={loadData} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Tab bar */}
      {!selectedSession && (
        <div className="flex border-b border-border bg-card overflow-x-auto">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-0 flex flex-col items-center gap-1 py-3 px-1 text-[10px] font-bold transition-all ${
                activeTab === tab.id ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
              }`}>
              <tab.icon className="w-4 h-4" />
              <span className="truncate">{tab.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default ParentMode;
