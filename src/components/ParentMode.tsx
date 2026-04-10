import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  ArrowLeft, Clock, MessageSquare, Heart, Brain, Loader2, RefreshCw,
  Mic, BookOpen, Timer, Sparkles, Shield, Camera, Volume2, VolumeX,
  Play, Pause, AlertTriangle, TrendingUp, Trash2, ChevronRight,
  BarChart3, Calendar, User, Zap, Moon, Sun, Hand, Lock,
  Download, ToggleLeft, Settings, Eye, EyeOff
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ───────────────────────────────────────────────────────────

interface ParentModeProps {
  childName: string;
  onClose: () => void;
  parentSettings?: ParentSettings;
  onSettingsChange?: (settings: ParentSettings) => void;
}

export interface ParentSettings {
  // Profile
  personality: "balanced" | "calm" | "energetic" | "educational";
  childAge: number;
  // Voice
  voiceSpeed: "normal" | "slow" | "fast";
  voicePitch: number;
  sfxVolume: number;
  enableCamera: boolean;
  // Content modes
  contentModes: {
    freeChat: boolean;
    educational: boolean;
    games: boolean;
    stories: boolean;
  };
  // Stories
  enabledThemes: string[];
  storyDuration: "courte" | "moyenne" | "longue";
  storyInteractive: boolean;
  // Security
  contentFilter: "standard" | "strict";
  blockedTopics: string[];
  ultraSafe: boolean;
  // Limits
  timeLimitMinutes: number | null;
  autoStop: boolean;
  nightMode: {
    active: boolean;
    startHour: string;
    endHour: string;
  };
  // Interactions
  interactions: {
    wakeWord: boolean;
    tap: boolean;
    interruption: boolean;
  };
  // Data
  recordConversations: boolean;
}

export const DEFAULT_PARENT_SETTINGS: ParentSettings = {
  personality: "balanced",
  childAge: 7,
  voiceSpeed: "normal",
  voicePitch: 1.0,
  sfxVolume: 0.7,
  enableCamera: false,
  contentModes: { freeChat: true, educational: true, games: true, stories: true },
  enabledThemes: ["princesse", "pirate", "espace", "animaux", "éducatif"],
  storyDuration: "moyenne",
  storyInteractive: true,
  contentFilter: "standard",
  blockedTopics: [],
  ultraSafe: true,
  timeLimitMinutes: null,
  autoStop: true,
  nightMode: { active: false, startHour: "20:00", endHour: "07:00" },
  interactions: { wakeWord: true, tap: true, interruption: true },
  recordConversations: true,
};

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

  const updateNested = <K extends keyof ParentSettings>(
    key: K,
    subKey: string,
    value: any
  ) => {
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
    if (sessionsRes.data) setSessions(sessionsRes.data);
    if (analysesRes.data) setAnalyses(analysesRes.data as any);
    setLoading(false);
  };

  const analyzeSession = async (session: Session) => {
    setSelectedSession(session);
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

  // Today's sessions
  const today = new Date().toDateString();
  const todaySessions = sessions.filter(s => new Date(s.started_at).toDateString() === today);
  const todayDuration = todaySessions.reduce((acc, s) => acc + (s.duration_seconds || 0), 0);
  const dominantMood = Object.entries(emotionCounts).sort(([, a], [, b]) => b - a)[0];

  // ─── Presets ──────────────────────────────────────────────────

  const applyPreset = (name: string) => {
    let next = { ...settings };
    switch (name) {
      case "calm":
        next.voiceSpeed = "slow";
        next.personality = "calm";
        next.storyDuration = "longue";
        next.sfxVolume = 0.3;
        break;
      case "game":
        next.contentModes = { ...next.contentModes, games: true };
        next.personality = "energetic";
        next.voiceSpeed = "fast";
        break;
      case "night":
        next.nightMode = { ...next.nightMode, active: true };
        next.personality = "calm";
        next.voiceSpeed = "slow";
        next.sfxVolume = 0.2;
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

            {analysis.full_transcription && (
              <details className="bg-card rounded-2xl border border-border overflow-hidden">
                <summary className="p-4 text-sm font-bold text-foreground cursor-pointer hover:bg-muted/50 transition-colors">
                  📝 Voir la transcription complète
                </summary>
                <div className="px-4 pb-4 max-h-64 overflow-y-auto">
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{analysis.full_transcription}</pre>
                </div>
              </details>
            )}
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
      <h3 className="text-sm font-bold text-foreground mb-3">Toutes les sessions</h3>
      {loading ? (
        <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground"><p className="text-sm">Aucune session enregistrée.</p></div>
      ) : (
        <div className="space-y-2">
          {sessions.map(session => {
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
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{session.message_count} msg</span>
                  {hasAnalysis && <span className="text-sm">{mood.emoji}</span>}
                  {session.detected_emotions?.slice(0, 3).map((e, i) => {
                    const info = emotionLabels[e] || { label: e, color: "bg-muted text-muted-foreground", emoji: "❓" };
                    return <span key={i} className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${info.color}`}>{info.label}</span>;
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
            <input
              type="text"
              value={newBlockedTopic}
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
            <button
              onClick={() => {
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
      <Card title="Enregistrement" icon={Mic}>
        <SettingRow icon={Mic} title="Enregistrer les conversations" desc="Sauvegarde audio pour réécoute">
          <Toggle value={settings.recordConversations} onChange={(v) => updateSetting("recordConversations", v)} />
        </SettingRow>
      </Card>

      <Card title="Gestion des données" icon={Lock}>
        <div className="space-y-3">
          <button
            onClick={async () => {
              const sessData = sessions.map(s => ({
                date: s.started_at,
                duration: s.duration_seconds,
                messages: s.message_count,
                emotions: s.detected_emotions,
                topics: s.topics,
              }));
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
          onClick={selectedSession ? () => { setSelectedSession(null); setSelectedAnalysis(null); } : onClose}
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
