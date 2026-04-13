import { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from "react";
import { toast } from "sonner";
import {
  ArrowLeft, Clock, MessageSquare, Heart, Brain, Loader2, RefreshCw,
  Mic, BookOpen, Timer, Sparkles, Shield, Camera, Volume2, VolumeX,
  Play, Pause, AlertTriangle, TrendingUp, Trash2, ChevronRight, Gamepad2,
  BarChart3, Calendar, User, Zap, Moon, Sun, Hand, Lock, Search,
  Download, ToggleLeft, Settings, Eye, EyeOff, FileText, Tag, X, CloudUpload,
  SkipForward, SkipBack, Activity, Bell, ChevronDown, ChevronLeft, Star, Edit3
} from "lucide-react";
import { BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";
import { getInterestSnapshot, INTEREST_KEYWORDS_PUBLIC } from "@/lib/bobby/interestTracker";
import { supabase } from "@/integrations/supabase/client";
import StoryLibrary from "@/components/StoryLibrary";
import ContentCategories from "@/components/ContentCategories";
import BobbyStore from "@/components/BobbyStore";
import VoiceSettings from "@/components/parent/VoiceSettings";
import BobbyCustomizer from "@/components/parent/BobbyCustomizer";
import LimitsSettings from "@/components/parent/LimitsSettings";
// Piper TTS removed — ElevenLabs only
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  loadParentDashboardSnapshot,
  loadParentSessionMessages,
  requestParentSessionAnalysis,
  type ParentAnalysis as Analysis,
  type ParentSession as Session,
  type ParentSessionMessage,
} from "@/lib/bobby/parentDashboard";

import { ParentSettings, DEFAULT_PARENT_SETTINGS, BOBBY_COLORS } from "./parentSettings";
import { getSafetyAlertRecords, clearSafetyAlertRecords, type SafetyAlertRecord } from "@/lib/offlineEngine";
import { eventBus } from "@/lib/eventBus";
import {
  saveToCloud, restoreFromCloud, getCloudProfile, deleteCloudProfile,
  getLocalSyncCode, formatSyncTime,
  type CloudProfile,
} from "@/lib/bobby/cloudSync";
export type { ParentSettings };
export { DEFAULT_PARENT_SETTINGS };

// ─── Types ───────────────────────────────────────────────────────────

interface ParentModeProps {
  childName: string;
  onClose: () => void;
  parentSettings?: ParentSettings;
  onSettingsChange?: (settings: ParentSettings) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────
/** Replace generic AI references with "Bobby" in summaries */
function humanizeSummary(text: string): string {
  return text.replace(/\bl'IA\b/gi, "Bobby").replace(/\bl'intelligence artificielle\b/gi, "Bobby").replace(/\ble chatbot\b/gi, "Bobby").replace(/\ble bot\b/gi, "Bobby").replace(/\bl'assistant\b/gi, "Bobby");
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

const moodLabels: Record<string, { label: string; color: string; emoji: string }> = {
  positive: { label: "Positif", color: "text-success", emoji: "🟢" },
  neutral: { label: "Neutre", color: "text-muted-foreground", emoji: "🟡" },
  low: { label: "Bas", color: "text-destructive", emoji: "🔴" },
};

const tagLabels: Record<string, { label: string; emoji: string; color: string }> = {
  fun: { label: "Fun", emoji: "🎉", color: "bg-secondary/60 text-secondary-foreground" },
  learning: { label: "Apprendre", emoji: "📚", color: "bg-primary/15 text-primary" },
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
    className={`relative w-12 h-7 border-4 border-black transition-all duration-300 ${value ? "bg-foreground" : "bg-white"}`}>
    <div className={`w-4 h-4 bg-white border-2 border-black transition-all duration-300 ${value ? "translate-x-5 bg-[var(--retro-green)]" : "translate-x-0.5"}`} style={{ marginTop: "-2px" }} />
  </button>
);

const SettingRow = ({ icon: Icon, title, desc, children }: {
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

const Card = ({ title, icon: Icon, children, noPad, className: cx }: { title?: string; icon?: any; children: React.ReactNode; noPad?: boolean; className?: string }) => (
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

const ScoreGauge = ({ label, score, emoji, color, size = "md" }: { label: string; score: number; emoji: string; color: string; size?: "sm" | "md" | "lg" }) => {
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

const StatPill = ({ emoji, value, label }: { emoji: string; value: string | number; label: string }) => (
  <div className="flex flex-col items-center gap-0.5">
    <span className="text-xl">{emoji}</span>
    <span className="text-lg font-bold text-foreground">{value}</span>
    <span className="text-[10px] text-muted-foreground">{label}</span>
  </div>
);

// ─── Tab config (6 tabs) ────────────────────────────────────────

type Tab = "home" | "dashboard" | "sessions" | "activites" | "profil" | "reglages" | "confidentialite" | "cloud" | "personnalisation";

const tabs: { id: Tab; icon: any; label: string; emoji?: string }[] = [
  { id: "dashboard", icon: BarChart3, label: "Tableau", emoji: "📊" },
  { id: "sessions", icon: MessageSquare, label: "Sessions", emoji: "💬" },
  { id: "activites", icon: Gamepad2, label: "Activités", emoji: "🎮" },
  { id: "personnalisation", icon: Settings, label: "Personnaliser Bobby", emoji: "🎨" },
  { id: "cloud", icon: CloudUpload, label: "Cloud", emoji: "☁️" },
  { id: "reglages", icon: Settings, label: "Réglages", emoji: "⚙️" },
  { id: "confidentialite", icon: Shield, label: "Privé", emoji: "🔒" },
];

// ─── Main Component ───────────────────────────────────────────────

const ParentMode = ({ childName, onClose, parentSettings, onSettingsChange }: ParentModeProps) => {
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [safetyAlerts, setSafetyAlerts] = useState<SafetyAlertRecord[]>([]);
  const [showSafetyAlerts, setShowSafetyAlerts] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<Analysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [sessionMessages, setSessionMessages] = useState<ParentSessionMessage[]>([]);
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
  const [reglagesSection, setReglagesSection] = useState<"voix" | "limites" | "personnalisation" | "profil" | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string; description: string; confirmLabel?: string;
    variant?: "danger" | "warning"; onConfirm: () => void;
  } | null>(null);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressInterval = useRef<number | null>(null);
  const contentScrollRef = useRef<HTMLDivElement>(null);
  const [piperDownloading, setPiperDownloading] = useState(false);
  const [piperProgress, setPiperProgress] = useState<Record<string, number>>({});
  const [piperDone, setPiperDone] = useState(false);
  const [sessionSearch, setSessionSearch] = useState("");
  const [sessionFavFilter, setSessionFavFilter] = useState(false);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [parentAlerts, setParentAlerts] = useState<Array<{ id: string; session_id: string; child_name: string; alert_type: string; severity: string; message: string; context: string | null; is_read: boolean; created_at: string }>>([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  // Bobby Store now manages its own state via Supabase (see BobbyStore.tsx)

  // Bobby Cloud sync state
  const [cloudProfile, setCloudProfile] = useState<CloudProfile | null>(null);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [cloudRestoreCode, setCloudRestoreCode] = useState("");
  const [cloudCopied, setCloudCopied] = useState(false);
  const [pendingNameChange, setPendingNameChange] = useState<string | null>(null);

  const unreadAlertCount = parentAlerts.filter(a => !a.is_read).length;
  // Always use settings.childName as the display name — it's the source of truth
  const displayName = settings.childName || childName;

  useEffect(() => { loadData(); loadAlerts(); loadCloudProfile(); }, []);

  // Scroll to top on tab/section change
  useEffect(() => {
    contentScrollRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [activeTab, reglagesSection, selectedSession]);

  const loadAlerts = async () => {
    try {
      const { data } = await supabase
        .from("parent_alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (data) setParentAlerts(data as any);
    } catch (e) { console.warn("Failed to load alerts:", e); }
  };

  const loadCloudProfile = async () => {
    const profile = await getCloudProfile();
    setCloudProfile(profile);
  };

  const handleCloudSave = async () => {
    setCloudLoading(true);
    try {
      const result = await saveToCloud(displayName, settings);
      if (result.success && result.profile) {
        setCloudProfile(result.profile);
        toast.success(result.isNew ? "☁️ Profil Bobby Cloud créé !" : "☁️ Synchronisé avec Bobby Cloud !");
      } else {
        toast.error("Erreur de synchronisation", { description: result.error });
      }
    } finally { setCloudLoading(false); }
  };

  const handleCloudRestore = async () => {
    if (!cloudRestoreCode.trim()) return;
    setCloudLoading(true);
    try {
      const result = await restoreFromCloud(cloudRestoreCode);
      if (result.success && result.profile) {
        setCloudProfile(result.profile);
        // Restore parent settings
        const restored = result.profile.parent_settings;
        if (restored && typeof restored === "object") {
          // Keep local childName/childAge priority
          const merged = {
            ...DEFAULT_PARENT_SETTINGS,
            ...restored,
            childName: displayName,
            childAge: settings.childAge,
            contentModes: { ...DEFAULT_PARENT_SETTINGS.contentModes, ...(restored as any).contentModes },
            nightMode: { ...DEFAULT_PARENT_SETTINGS.nightMode, ...(restored as any).nightMode },
            interactions: { ...DEFAULT_PARENT_SETTINGS.interactions, ...(restored as any).interactions },
          };
          setSettings(merged as ParentSettings);
          onSettingsChange?.(merged as ParentSettings);
        }
        setCloudRestoreCode("");
        toast.success("☁️ Profil restauré depuis Bobby Cloud !");
      } else {
        toast.error("Code introuvable", { description: result.error });
      }
    } finally { setCloudLoading(false); }
  };

  const handleCloudDelete = async () => {
    setCloudLoading(true);
    const ok = await deleteCloudProfile();
    setCloudLoading(false);
    if (ok) {
      setCloudProfile(null);
      toast.success("Profil Bobby Cloud supprimé");
    }
  };

  const markAlertRead = async (alertId: string) => {
    await supabase.from("parent_alerts").update({ is_read: true }).eq("id", alertId);
    setParentAlerts(prev => prev.map(a => a.id === alertId ? { ...a, is_read: true } : a));
  };

  const markAllRead = async () => {
    const unread = parentAlerts.filter(a => !a.is_read);
    if (unread.length === 0) return;
    await supabase.from("parent_alerts").update({ is_read: true }).in("id", unread.map(a => a.id));
    setParentAlerts(prev => prev.map(a => ({ ...a, is_read: true })));
  };

  // Load safety alerts from localStorage on mount + real-time via eventBus
  useEffect(() => {
    setSafetyAlerts(getSafetyAlertRecords());

    const handleStorage = () => setSafetyAlerts(getSafetyAlertRecords());
    window.addEventListener("storage", handleStorage);

    // Real-time alert listener via eventBus
    const unsub = eventBus.on("SAFETY_ALERT", (event: any) => {
      // Refresh alerts list
      setSafetyAlerts(getSafetyAlertRecords());
      setShowSafetyAlerts(true);

      // Immediate toast notification
      const severityLabels: Record<string, string> = {
        CRITICAL: "🚨 ALERTE CRITIQUE",
        HIGH: "⚠️ Alerte importante",
        MEDIUM: "🔔 Alerte",
      };
      const label = severityLabels[event.severity] || "🔔 Alerte";
      toast.error(`${label} — ${event.childName}`, {
        description: `Catégorie: ${event.category} • "${event.fullText?.slice(0, 80)}…"`,
        duration: 15000,
        action: {
          label: "Voir",
          onClick: () => {
            setActiveTab("dashboard");
            setShowSafetyAlerts(true);
          },
        },
      });
    });

    return () => {
      window.removeEventListener("storage", handleStorage);
      unsub();
    };
  }, []);

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
    const snapshot = await loadParentDashboardSnapshot(50);
    setSessions(snapshot.sessions.filter(s => s.message_count > 0));
    setAnalyses(snapshot.analyses);
    setLoading(false);
  };

  const analyzeSession = async (session: Session) => {
    setSelectedSession(session);
    setSessionMessages(await loadParentSessionMessages(session.id));

    const existing = analyses.find(a => a.session_id === session.id);
    // Show existing analysis if it has actual AI data (summary)
    if (existing?.summary) { setSelectedAnalysis(existing); return; }
    setAnalyzing(true);
    try {
      const analysis = await requestParentSessionAnalysis(session.id);
      if (analysis) {
        setSelectedAnalysis(analysis);
        loadData(); // Refresh to pick up merged audio_path + AI data
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
    await supabase.storage.from("conversation-audio").remove([`${sessionId}.webm`, `${sessionId}.mp4`]);
    loadData();
    setSelectedSession(null);
    setSelectedAnalysis(null);
  };

  // v4.2: Skip audio ±10 seconds
  const skipAudio = (seconds: number) => {
    if (!audioRef.current || !audioDuration) return;
    const newTime = Math.max(0, Math.min(audioDuration, audioRef.current.currentTime + seconds));
    audioRef.current.currentTime = newTime;
    setAudioProgress((newTime / audioDuration) * 100);
  };

  // v4.2: Toggle favorite
  const toggleFavorite = async (session: Session) => {
    const newVal = !session.is_favorite;
    await supabase.from("child_sessions").update({ is_favorite: newVal }).eq("id", session.id);
    setSessions(prev => prev.map(s => s.id === session.id ? { ...s, is_favorite: newVal } : s));
    if (selectedSession?.id === session.id) setSelectedSession({ ...selectedSession, is_favorite: newVal });
  };

  // v4.2: Save parent note
  const saveParentNote = async (sessionId: string, note: string) => {
    const trimmed = note.trim() || null;
    await supabase.from("child_sessions").update({ parent_note: trimmed }).eq("id", sessionId);
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, parent_note: trimmed } : s));
    if (selectedSession?.id === sessionId) setSelectedSession({ ...selectedSession, parent_note: trimmed });
    setEditingNote(null);
  };

  const exportSessionPDF = (session: Session, analysis: Analysis | null) => {
    const lines: string[] = [
      `RAPPORT DE SESSION — ${displayName}`,
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
    a.download = `rapport-${displayName}-${new Date(session.started_at).toISOString().slice(0, 10)}.txt`;
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

  // Scores evolution over last 7 days for line chart
  const scoresEvolutionData = useMemo(() => {
    const scored = analyses.filter(a => a.sociability_score != null);
    if (scored.length < 2) return [];
    const days: { name: string; Sociabilité: number | null; Curiosité: number | null; Stabilité: number | null; hasData: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("fr-FR", { weekday: "short" }).slice(0, 3);
      const dayAnalyses = scored.filter(a => {
        const session = sessions.find(s => s.id === a.session_id);
        return session?.started_at?.startsWith(key);
      });
      if (dayAnalyses.length > 0) {
        days.push({
          name: label,
          Sociabilité: Math.round(dayAnalyses.reduce((s, a) => s + (a.sociability_score || 0), 0) / dayAnalyses.length),
          Curiosité: Math.round(dayAnalyses.reduce((s, a) => s + (a.curiosity_score || 0), 0) / dayAnalyses.length),
          Stabilité: Math.round(dayAnalyses.reduce((s, a) => s + (a.emotional_stability_score || 0), 0) / dayAnalyses.length),
          hasData: true,
        });
      } else {
        days.push({ name: label, Sociabilité: null, Curiosité: null, Stabilité: null, hasData: false });
      }
    }
    return days;
  }, [analyses, sessions]);

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
      Joie: d.count > 0 ? Math.round(d.joy / d.count) : 0,
      Curiosité: d.count > 0 ? Math.round(d.curiosity / d.count) : 0,
      Excitation: d.count > 0 ? Math.round(d.excitement / d.count) : 0,
      Frustration: d.count > 0 ? Math.round(d.frustration / d.count) : 0,
      Peur: d.count > 0 ? Math.round(d.fear / d.count) : 0,
      Tristesse: d.count > 0 ? Math.round(d.sadness / d.count) : 0,
      hasData: d.count > 0,
    }));
  }, [analyses]);

  // Session duration per day (line chart data)
  const sessionDurationChartData = useMemo(() => {
    const days: { date: string; label: string; totalMin: number; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" });
      days.push({ date: dateStr, label, totalMin: 0, count: 0 });
    }
    for (const s of sessions) {
      if (!s.duration_seconds || s.duration_seconds <= 0) continue;
      const sDate = s.started_at.slice(0, 10);
      const day = days.find(d => d.date === sDate);
      if (!day) continue;
      day.totalMin += s.duration_seconds / 60;
      day.count++;
    }
    return days.map(d => ({
      name: d.label,
      minutes: Math.round(d.totalMin),
      sessions: d.count,
      hasData: d.count > 0,
    }));
  }, [sessions]);

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
    let list = sessions;
    if (tagFilter) list = list.filter(s => s.tags?.includes(tagFilter));
    if (sessionFavFilter) list = list.filter(s => s.is_favorite);
    if (sessionSearch.trim()) {
      const q = sessionSearch.toLowerCase();
      list = list.filter(s => {
        const analysis = analyses.find(a => a.session_id === s.id);
        return (
          s.ai_summary?.toLowerCase().includes(q) ||
          s.tags?.some(t => t.toLowerCase().includes(q)) ||
          s.topics?.some(t => t.toLowerCase().includes(q)) ||
          analysis?.summary?.toLowerCase().includes(q) ||
          analysis?.topics_detected?.some(t => t.toLowerCase().includes(q)) ||
          analysis?.extracted_interests?.some(i => i.toLowerCase().includes(q))
        );
      });
    }
    return list;
  }, [sessions, tagFilter, sessionFavFilter, sessionSearch, analyses]);

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
        insights.push(`${info.emoji} ${displayName} est principalement ${info.label.toLowerCase()} (${topVal}%) dans ses échanges.`);
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
  }, [recentAnalyses, avgEmotions, allInterests, engagementDist, avgScores, displayName]);

  // v4.0: Daily AI summary
  const dailySummary = useMemo(() => {
    if (todaySessions.length === 0) return null;
    const todayAnalyses = recentAnalyses.filter(a => {
      const s = sessions.find(s => s.id === a.session_id);
      return s && new Date(s.started_at).toDateString() === new Date().toDateString();
    });
    if (todayAnalyses.length === 0 && todaySessions.length > 0) {
      return `${displayName} a eu ${todaySessions.length} session${todaySessions.length > 1 ? "s" : ""} aujourd'hui (${formatDuration(todayDuration)}).`;
    }
    const summaries = todayAnalyses.map(a => a.summary).filter(Boolean);
    if (summaries.length === 0) return null;
    // Take only first 2 sentences from the combined text
    const full = summaries.join(" ");
    const sentences = full.match(/[^.!?]+[.!?]+/g) || [full];
    return humanizeSummary(sentences.slice(0, 2).join(" ").trim());
  }, [todaySessions, recentAnalyses, sessions, displayName, todayDuration]);

  // v4.0: Parent recommendations based on data
  const parentRecommendations = useMemo(() => {
    const recs: { emoji: string; text: string }[] = [];
    if (recentAnalyses.length === 0) return recs;

    // Recommend based on interests
    if (allInterests.length > 0) {
      const topInterest = allInterests[0][0];
      recs.push({ emoji: "🎨", text: `Proposez une activité créative autour de « ${topInterest} » pour prolonger sa curiosité.` });
    }

    // Recommend based on low engagement
    if (engagementDist.low > engagementDist.high) {
      recs.push({ emoji: "💡", text: `L'engagement est un peu faible. Essayez les jeux interactifs ou les histoires personnalisées.` });
    }

    // Recommend based on emotional state
    if (avgScores) {
      if (avgScores.stability < 40) {
        recs.push({ emoji: "🤗", text: `Les émotions varient beaucoup. Un moment calme ensemble pourrait aider à stabiliser l'humeur.` });
      }
      if (avgScores.sociability > 70) {
        recs.push({ emoji: "👫", text: `${displayName} est très sociable ! Invitez un ami à jouer avec Bobby ensemble.` });
      }
      if (avgScores.curiosity > 70) {
        recs.push({ emoji: "📚", text: `Curiosité élevée ! Activez le mode éducatif pour explorer de nouveaux sujets.` });
      }
    }

    // Recommend based on usage patterns
    const avgDur = totalDuration / Math.max(totalSessions, 1);
    if (avgDur > 900) { // >15min avg
      recs.push({ emoji: "⏰", text: `Les sessions sont longues (${formatDuration(Math.round(avgDur))} en moyenne). Pensez à activer une limite de temps.` });
    }

    // Always suggest at least one
    if (recs.length === 0) {
      recs.push({ emoji: "✨", text: `Continuez ainsi ! ${displayName} utilise Bobby de manière équilibrée.` });
    }

    return recs.slice(0, 4);
  }, [recentAnalyses, allInterests, engagementDist, avgScores, displayName, totalDuration, totalSessions]);

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

  // ─── Full Session Playback (YouTube-style) ─────────────────────
  const [fullPlaybackActive, setFullPlaybackActive] = useState(false);
  const [fullPlaybackIdx, setFullPlaybackIdx] = useState(0);
  const [fullPlaybackPaused, setFullPlaybackPaused] = useState(false);
  const [fullPlaybackSpeed, setFullPlaybackSpeed] = useState(1);
  const [fullPlaybackLoading, setFullPlaybackLoading] = useState(false);
  const fullPlaybackRef = useRef<{ cancelled: boolean; audio: HTMLAudioElement | null }>({ cancelled: false, audio: null });

  const startFullPlayback = useCallback((fromIdx = 0) => {
    setFullPlaybackActive(true);
    setFullPlaybackIdx(fromIdx);
    setFullPlaybackPaused(false);
    fullPlaybackRef.current.cancelled = false;
  }, []);

  const stopFullPlayback = useCallback(() => {
    fullPlaybackRef.current.cancelled = true;
    fullPlaybackRef.current.audio?.pause();
    fullPlaybackRef.current.audio = null;
    setFullPlaybackActive(false);
    setFullPlaybackPaused(false);
    setFullPlaybackLoading(false);
    setActiveMessageIdx(-1);
  }, []);

  const toggleFullPlaybackPause = useCallback(() => {
    if (fullPlaybackPaused) {
      fullPlaybackRef.current.audio?.play();
      setFullPlaybackPaused(false);
    } else {
      fullPlaybackRef.current.audio?.pause();
      setFullPlaybackPaused(true);
    }
  }, [fullPlaybackPaused]);

  // Effect: drive sequential TTS playback
  useEffect(() => {
    if (!fullPlaybackActive || fullPlaybackPaused || fullPlaybackRef.current.cancelled) return;
    if (sessionMessages.length === 0) { stopFullPlayback(); return; }
    if (fullPlaybackIdx >= sessionMessages.length) { stopFullPlayback(); return; }

    let cancelled = false;
    const playNext = async () => {
      const msg = sessionMessages[fullPlaybackIdx];
      if (!msg?.content) { if (!cancelled) setFullPlaybackIdx(i => i + 1); return; }

      setActiveMessageIdx(fullPlaybackIdx);
      setFullPlaybackLoading(true);

      try {
        const { fetchTTSAudio } = await import("@/lib/voicePipeline");
        // Use different voice for child vs Bobby
        const voice = msg.role === "user" ? "child" : "female";
        const url = await fetchTTSAudio(msg.content.slice(0, 500), undefined, voice);
        if (cancelled || fullPlaybackRef.current.cancelled) return;
        if (url === "__silent__") { setFullPlaybackIdx(i => i + 1); return; }

        const audio = new Audio(url);
        audio.playbackRate = fullPlaybackSpeed;
        fullPlaybackRef.current.audio = audio;
        setFullPlaybackLoading(false);

        await new Promise<void>((resolve) => {
          audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
          audio.onerror = () => { URL.revokeObjectURL(url); resolve(); };
          audio.play().catch(() => resolve());
        });

        if (!cancelled && !fullPlaybackRef.current.cancelled) {
          setFullPlaybackIdx(i => i + 1);
        }
      } catch {
        setFullPlaybackLoading(false);
        if (!cancelled) setFullPlaybackIdx(i => i + 1);
      }
    };

    playNext();
    return () => { cancelled = true; };
  }, [fullPlaybackActive, fullPlaybackIdx, fullPlaybackPaused, sessionMessages, fullPlaybackSpeed]);

  // Update speed on existing playback audio
  useEffect(() => {
    if (fullPlaybackRef.current.audio) {
      fullPlaybackRef.current.audio.playbackRate = fullPlaybackSpeed;
    }
  }, [fullPlaybackSpeed]);

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
      const { fetchTTSAudio } = await import("@/lib/voicePipeline");
      const url = await fetchTTSAudio(text.slice(0, 500), undefined, "female");
      if (url === "__silent__") {
        setTtsPlaying(null);
        return;
      }
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
    <div className="p-4 space-y-4" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif" }}>

      {/* ═══ 1. KPI HERO — retro grid ═══ */}
      <div className="grid grid-cols-3 gap-3 animate-fadeInUp" style={{ animationDelay: "0.05s" }}>
        {[
          { value: totalSessions, label: "Sessions", emoji: "💬", bg: "var(--retro-blue)" },
          { value: totalMessages, label: "Messages", emoji: "📝", bg: "var(--retro-green)" },
          { value: formatDuration(totalDuration), label: "Temps total", emoji: "⏱️", bg: "var(--retro-purple)" },
          { value: todaySessions.length, label: "Aujourd'hui", emoji: "📅", bg: "var(--retro-yellow)" },
          { value: avgMessagesPerSession, label: "Msg/session", emoji: "📊", bg: "var(--retro-red)" },
          { value: `${recentAnalyses.length}/${totalSessions}`, label: "Analysées", emoji: "🔬", bg: "#e5e5e5" },
        ].map((kpi) => (
          <div key={kpi.label} className="retro-card p-2.5 text-center" style={{ backgroundColor: kpi.bg }}>
            <span className="text-[24px] block mb-0.5 drop-shadow-sm">{kpi.emoji}</span>
            <p className="text-[17px] font-black text-gray-800 leading-none truncate">{kpi.value}</p>
            <p className="text-[9px] text-gray-600 font-bold mt-0.5 truncate">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* ═══ 2. RÉSUMÉ DU JOUR ═══ */}
      {dailySummary && (
        <div className="retro-card p-5 animate-fadeInUp" style={{ animationDelay: "0.1s", backgroundColor: 'var(--retro-blue)' }}>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 bg-black flex items-center justify-center"><span className="text-white text-sm">📋</span></div>
            <h3 className="text-[17px] font-black text-gray-800">Résumé du jour</h3>
          </div>
          <p className="text-[15px] text-gray-700 leading-relaxed font-bold">{dailySummary}</p>
        </div>
      )}

      {/* ═══ 3. RECOMMANDATIONS ═══ */}
      {parentRecommendations.length > 0 && (
        <div className="retro-card retro-card-tilt-2 p-5" style={{ backgroundColor: 'var(--retro-yellow)' }}>
          <div className="flex items-center gap-2.5 mb-3">
            <span className="text-2xl">✨</span>
            <h3 className="text-[17px] font-black text-foreground uppercase">Recommandations</h3>
          </div>
          <div className="space-y-2">
            {parentRecommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-3 p-3 border-2 border-black bg-white">
                <span className="text-xl mt-0.5">{rec.emoji}</span>
                <p className="text-[14px] text-foreground/80 leading-relaxed font-bold">{rec.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ CENTRES D'INTÉRÊT RADAR ═══ */}
      {(() => {
        const liveSnapshot = getInterestSnapshot();
        const dbCounts: Record<string, number> = {};
        analyses.forEach(a => {
          (a.extracted_interests || []).forEach((interest: string) => {
            dbCounts[interest.toLowerCase()] = (dbCounts[interest.toLowerCase()] || 0) + 1;
          });
          (a.topics_detected || []).forEach((topic: string) => {
            dbCounts[topic.toLowerCase()] = (dbCounts[topic.toLowerCase()] || 0) + 0.5;
          });
        });
        const categoryScores: Record<string, number> = {};
        const kwMap = INTEREST_KEYWORDS_PUBLIC;
        Object.entries(kwMap).forEach(([cat, info]) => {
          let score = 0;
          const live = liveSnapshot.topInterests.find(t => t.topic === cat);
          if (live) score += live.score;
          info.keywords.forEach(kw => {
            Object.entries(dbCounts).forEach(([dbKey, count]) => {
              if (dbKey.includes(kw) || kw.includes(dbKey)) score += count;
            });
          });
          if (score > 0) categoryScores[cat] = Math.round(score * 10) / 10;
        });
        const radarData = Object.entries(categoryScores)
          .sort((a, b) => b[1] - a[1]).slice(0, 8)
          .map(([cat, score]) => ({
            subject: `${kwMap[cat]?.emoji || "📌"} ${cat.charAt(0).toUpperCase() + cat.slice(1)}`,
            score: Math.min(score, 100),
            fullMark: Math.max(...Object.values(categoryScores), 10),
          }));
        if (radarData.length < 3) return null;
        return (
          <div className="retro-card retro-card-tilt-3 p-4" style={{ backgroundColor: 'var(--retro-blue)' }}>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="text-2xl">🎯</span>
              <h3 className="text-[17px] font-black text-foreground uppercase">Intérêts de {displayName}</h3>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="65%">
                <PolarGrid stroke="rgba(0,0,0,0.15)" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "hsl(var(--foreground))", fontWeight: 900 }} />
                <PolarRadiusAxis tick={false} axisLine={false} />
                <Radar name="Intérêt" dataKey="score" stroke="hsl(var(--foreground))" fill="hsl(var(--foreground))" fillOpacity={0.15} strokeWidth={2.5} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        );
      })()}

      {/* ═══ ALERTES BOBBY SÉCURITÉ ═══ */}
      {safetyAlerts.length > 0 && showSafetyAlerts && (
        <div className="retro-card p-3 border-4 border-black" style={{ backgroundColor: 'var(--retro-red)' }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🛡️</span>
            <h3 className="text-[14px] font-black text-foreground uppercase">Alertes Sécurité</h3>
            <span className="ml-auto text-[9px] px-2 py-0.5 border-2 border-black bg-white text-foreground font-black">{safetyAlerts.length}</span>
          </div>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {safetyAlerts.slice(0, 10).map((alert, i) => (
              <div key={i} className="flex items-start gap-2 p-2 border-2 border-black bg-white">
                <span className="text-sm mt-0.5">{alert.severity === "CRITICAL" ? "🔴" : "🟡"}</span>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-black text-foreground">{alert.category.replace(/_/g, " ")}</span>
                  <p className="text-[10px] text-foreground/70 font-bold">«{alert.keyword}»</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={() => { clearSafetyAlertRecords(); setSafetyAlerts([]); }}
              className="flex-1 text-[10px] font-black py-1.5 border-2 border-black bg-white text-foreground uppercase">Effacer</button>
            <button onClick={() => setShowSafetyAlerts(false)}
              className="flex-1 text-[10px] font-black py-1.5 border-2 border-black bg-foreground text-background uppercase">Fermer</button>
          </div>
        </div>
      )}
      {safetyAlerts.length > 0 && !showSafetyAlerts && (
        <button onClick={() => setShowSafetyAlerts(true)}
          className="w-full flex items-center justify-center gap-2 py-2 border-4 border-black bg-[var(--retro-red)] text-foreground text-[12px] font-black uppercase"
          style={{ boxShadow: "3px 3px 0px rgba(0,0,0,0.2)" }}>
          🛡️ {safetyAlerts.length} alerte{safetyAlerts.length > 1 ? "s" : ""}
        </button>
      )}

      {/* ═══ ALERTES SMART ═══ */}
      {smartAlerts.length > 0 && (
        <div className="retro-card p-3" style={{ backgroundColor: 'var(--retro-orange)' }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🔔</span>
            <h3 className="text-[14px] font-black text-foreground uppercase">Alertes</h3>
            <span className="ml-auto text-[9px] px-2 py-0.5 border-2 border-black bg-white text-foreground font-black">{smartAlerts.length}</span>
          </div>
          <div className="space-y-1.5">
            {smartAlerts.map((alert, i) => (
              <div key={i} className="flex items-start gap-2 p-2 border-2 border-black bg-white">
                <span className="text-sm">{alert.severity === "critical" ? "🔴" : "🟡"}</span>
                <p className="text-[12px] text-foreground leading-relaxed font-bold">{alert.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ SCORES COMPORTEMENTAUX — 3 cols compact ═══ */}
      {avgScores && (
        <div className="retro-card retro-card-tilt-4 p-3" style={{ backgroundColor: 'var(--retro-green)' }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🧠</span>
            <h3 className="text-[15px] font-black text-foreground uppercase">Développement</h3>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-2">
            <ScoreGauge label="Sociabilité" score={avgScores.sociability} emoji="🤝" color="hsl(var(--foreground))" size="lg" />
            <ScoreGauge label="Curiosité" score={avgScores.curiosity} emoji="🔍" color="hsl(var(--foreground))" size="lg" />
            <ScoreGauge label="Stabilité" score={avgScores.stability} emoji="⚖️" color="hsl(var(--foreground))" size="lg" />
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2 border-t-2 border-black/15">
            <div>
              <p className="text-[11px] text-foreground/60 font-black mb-1 uppercase">Engagement</p>
              <div className="flex gap-0.5 h-3 overflow-hidden border border-black">
                {recentAnalyses.length > 0 ? (
                  <>
                    <div className="bg-foreground" style={{ width: `${(engagementDist.high / recentAnalyses.length) * 100}%` }} />
                    <div className="bg-foreground/40" style={{ width: `${(engagementDist.medium / recentAnalyses.length) * 100}%` }} />
                    <div className="bg-white" style={{ width: `${(engagementDist.low / recentAnalyses.length) * 100}%` }} />
                  </>
                ) : <div className="bg-white w-full" />}
              </div>
              <div className="flex justify-between mt-0.5">
                <span className="text-[9px] text-foreground/60 font-black">🔥{engagementDist.high}</span>
                <span className="text-[9px] text-foreground/60 font-black">👍{engagementDist.medium}</span>
                <span className="text-[9px] text-foreground/60 font-black">💤{engagementDist.low}</span>
              </div>
            </div>
            <div>
              <p className="text-[11px] text-foreground/60 font-black mb-1 uppercase">Humeur</p>
              <div className="flex gap-0.5 h-3 overflow-hidden border border-black">
                {recentAnalyses.length > 0 ? (
                  <>
                    <div className="bg-foreground/80" style={{ width: `${(moodDist.positive / recentAnalyses.length) * 100}%` }} />
                    <div className="bg-foreground/30" style={{ width: `${(moodDist.neutral / recentAnalyses.length) * 100}%` }} />
                    <div className="bg-[var(--retro-red)]" style={{ width: `${(moodDist.low / recentAnalyses.length) * 100}%` }} />
                  </>
                ) : <div className="bg-white w-full" />}
              </div>
              <div className="flex justify-between mt-0.5">
                <span className="text-[9px] text-foreground/60 font-black">🟢{moodDist.positive}</span>
                <span className="text-[9px] text-foreground/60 font-black">🟡{moodDist.neutral}</span>
                <span className="text-[9px] text-foreground/60 font-black">🔴{moodDist.low}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ ÉMOTIONS — 3 cols compact ═══ */}
      {Object.keys(avgEmotions).length > 0 && (
        <div className="retro-card retro-card-tilt-5 p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">💖</span>
            <h3 className="text-[15px] font-black text-foreground uppercase">Émotions</h3>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(avgEmotions).filter(([, v]) => v > 0).sort(([, a], [, b]) => b - a).slice(0, 6).map(([key, value], ei) => {
              const info = emotionScoreLabels[key] || { label: key, emoji: "❓" };
              const retroBgs = ["var(--retro-green)", "var(--retro-blue)", "var(--retro-yellow)", "var(--retro-red)", "var(--retro-purple)", "var(--retro-orange)"];
              return (
                <div key={key} className="border-2 border-black p-2 text-center" style={{ backgroundColor: retroBgs[ei % retroBgs.length] }}>
                  <span className="text-[20px] block">{info.emoji}</span>
                  <p className="text-[16px] font-black text-foreground leading-tight">{value}%</p>
                  <p className="text-[9px] text-foreground/60 font-black uppercase">{info.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ ÉVOLUTION 7 JOURS — compact chart ═══ */}
      {emotionChartData.some(d => d.hasData) && (
        <div className="retro-card retro-card-tilt-6 p-5">
          <div className="flex items-center gap-2.5 mb-3">
            <span className="text-2xl">📈</span>
            <h3 className="text-[17px] font-black text-foreground uppercase">Évolution (7j)</h3>
          </div>
          <div className="w-full h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={emotionChartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(var(--foreground))", fontWeight: 900 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 8, fill: "hsl(var(--foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "rgba(0,0,0,0.05)" }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const dataPoint = emotionChartData.find(d => d.name === label);
                    if (!dataPoint?.hasData) return null;
                    return (
                      <div className="border-2 border-black bg-white p-2" style={{ boxShadow: "3px 3px 0px rgba(0,0,0,0.2)" }}>
                        <p className="text-[10px] font-black text-foreground mb-1">{label}</p>
                        {payload.filter(p => p.dataKey !== "hasData" && (p.value as number) > 0).sort((a, b) => (b.value as number) - (a.value as number)).map(p => {
                          const cfg = emotionConfig[p.name as string] || { emoji: "❓", color: "#888" };
                          return (
                            <div key={p.name} className="flex items-center gap-1 py-0.5">
                              <span className="text-[9px]">{cfg.emoji}</span>
                              <span className="text-[9px] text-foreground flex-1 font-bold">{p.name}</span>
                              <span className="text-[10px] font-black" style={{ color: cfg.color }}>{p.value}%</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }}
                />
                <Bar dataKey="Joie" fill="hsl(145, 65%, 42%)" radius={[0, 0, 0, 0]} maxBarSize={10} />
                <Bar dataKey="Curiosité" fill="hsl(210, 80%, 55%)" radius={[0, 0, 0, 0]} maxBarSize={10} />
                <Bar dataKey="Excitation" fill="hsl(36, 90%, 50%)" radius={[0, 0, 0, 0]} maxBarSize={10} />
                <Bar dataKey="Frustration" fill="hsl(0, 75%, 55%)" radius={[0, 0, 0, 0]} maxBarSize={10} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 mt-1">
            {Object.entries(emotionConfig).slice(0, 4).map(([label, cfg]) => (
              <span key={label} className="flex items-center gap-1 text-[9px] text-foreground/60 font-black">
                <span className="w-2 h-2" style={{ backgroundColor: cfg.color }} /> {cfg.emoji} {label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ═══ TEMPS DE SESSION ═══ */}
      {sessionDurationChartData.some(d => d.hasData) && (
        <div className="retro-card retro-card-tilt-1 p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">⏱️</span>
            <h3 className="text-[14px] font-black text-foreground uppercase">Temps (7j)</h3>
          </div>
          <div className="w-full h-36">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sessionDurationChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(var(--foreground))", fontWeight: 900 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 8, fill: "hsl(var(--foreground))" }} axisLine={false} tickLine={false} unit=" min" />
                <Line type="monotone" dataKey="minutes" stroke="hsl(var(--foreground))" strokeWidth={2.5}
                  dot={{ r: 3, fill: "hsl(var(--foreground))", stroke: "hsl(var(--background))", strokeWidth: 2 }} connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ═══ DERNIÈRE SESSION — compact ═══ */}
      {lastSession && (
        <div className="retro-card retro-card-tilt-2 p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🕐</span>
            <h3 className="text-[14px] font-black text-foreground uppercase">Dernière session</h3>
            <span className="ml-auto text-[9px] text-foreground/60 font-black">{formatDate(lastSession.started_at)}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-2">
            {[
              { v: lastSession.message_count, l: "messages" },
              { v: formatDuration(lastSession.duration_seconds), l: "durée" },
              { v: lastAnalysis ? (lastAnalysis.engagement_level === "high" ? "🔥" : "👍") : "—", l: "engagement" },
            ].map(s => (
              <div key={s.l} className="text-center p-2 border-2 border-black bg-white">
                <p className="text-[14px] font-black text-foreground">{s.v}</p>
                <p className="text-[8px] text-foreground/60 font-black uppercase">{s.l}</p>
              </div>
            ))}
          </div>
          {lastAnalysis?.summary && (
            <div className="border-2 border-black bg-[var(--retro-yellow)] p-2">
              <p className="text-[11px] text-foreground/70 leading-relaxed font-bold">
                {(() => { const s = humanizeSummary(lastAnalysis.summary).match(/[^.!?]+[.!?]+/g); return s ? s.slice(0, 2).join(" ").trim() : humanizeSummary(lastAnalysis.summary); })()}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ═══ ÉTAT VIDE ═══ */}
      {!hasData && (
        <div className="retro-card p-6 text-center">
          <span className="text-5xl block mb-2">🎙️</span>
          <h3 className="text-lg font-black text-foreground mb-1 uppercase">Pas encore de sessions</h3>
          <p className="text-[12px] text-foreground/60 font-bold">Les métriques apparaîtront après la première conversation de {displayName} avec Bobby.</p>
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
      <div className="p-4 space-y-4" style={{ fontFamily: "'Nunito', sans-serif" }}>
        {/* ── Hero Header — retro ── */}
        <div className="retro-card p-5" style={{ backgroundColor: 'var(--retro-blue)' }}>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 border-4 border-black bg-white flex items-center justify-center">
              <MessageSquare className="w-7 h-7 text-gray-800" />
            </div>
            <div className="flex-1">
              <h3 className="text-[18px] font-black text-gray-800 uppercase">{formatDate(selectedSession!.started_at)}</h3>
              <p className="text-[13px] text-gray-600 font-bold">{selectedSession!.child_name}, {selectedSession!.child_age} ans</p>
            </div>
            <button onClick={() => toggleFavorite(selectedSession!)}
              className={`w-11 h-11 border-2 border-black flex items-center justify-center transition-all ${
                selectedSession!.is_favorite ? "bg-primary text-primary-foreground" : "bg-white text-gray-800 hover:bg-muted"
              }`}>
              <Star className={`w-5 h-5 ${selectedSession!.is_favorite ? "fill-current" : ""}`} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center py-3 border-2 border-black bg-white">
              <span className="text-2xl block mb-1">⏱️</span>
              <p className="text-[16px] font-black text-gray-800">{formatDuration(selectedSession!.duration_seconds)}</p>
              <p className="text-[11px] text-gray-600 font-bold">Durée</p>
            </div>
            <div className="text-center py-3 border-2 border-black bg-white">
              <span className="text-2xl block mb-1">💬</span>
              <p className="text-[16px] font-black text-gray-800">{selectedSession!.message_count}</p>
              <p className="text-[11px] text-gray-600 font-bold">Messages</p>
            </div>
            <div className="text-center py-3 border-2 border-black bg-white">
              <span className="text-2xl block mb-1">{moodInfo.emoji}</span>
              <p className="text-[16px] font-black text-gray-800">{moodInfo.label}</p>
              <p className="text-[11px] text-gray-600 font-bold">Humeur</p>
            </div>
          </div>
        </div>

        {/* Audio player moved to bottom of page */}

        {keyMoments.length > 0 && (
          <div className="retro-card p-5" style={{ backgroundColor: 'var(--retro-yellow)' }}>
            <div className="flex items-center gap-2.5 mb-4">
              <span className="text-2xl">⭐</span>
              <h3 className="text-[16px] font-black text-gray-800 uppercase">Moments clés</h3>
            </div>
            <div className="space-y-2.5">
              {keyMoments.map((moment, i) => {
                const emo = emotionLabels[moment.detected_emotion!] || { emoji: "💬", label: moment.detected_emotion, color: "bg-muted text-muted-foreground" };
                return (
                  <button key={i} onClick={() => jumpToMoment(moment.idx)}
                    className="w-full flex items-start gap-3 p-3.5 border-2 border-black bg-white hover:bg-muted transition-all text-left">
                    <span className="text-xl mt-0.5">{emo.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] text-gray-800 line-clamp-2 leading-relaxed font-bold">{moment.content}</p>
                      <span className={`text-[11px] px-2 py-0.5 font-bold mt-1.5 inline-block border border-black ${emo.color}`}>
                        {emo.label}
                      </span>
                    </div>
                    <Play className="w-4 h-4 text-gray-800 mt-1.5 shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {analyzing ? (
          <div className="retro-card p-8 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-gray-800" />
            <span className="text-[15px] text-gray-600 font-black">Analyse en cours…</span>
          </div>
        ) : analysis ? (
          <>
            {analysis.summary && (
              <div className="retro-card p-5" style={{ backgroundColor: 'var(--retro-green)' }}>
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-8 h-8 bg-black flex items-center justify-center"><span className="text-white text-sm">📝</span></div>
                  <h3 className="text-[16px] font-black text-gray-800 uppercase">Résumé</h3>
                </div>
                <p className="text-[15px] text-gray-700 leading-relaxed font-bold">
                  {(() => { const s = humanizeSummary(analysis.summary!).match(/[^.!?]+[.!?]+/g); return s ? s.slice(0, 2).join(" ").trim() : humanizeSummary(analysis.summary!); })()}
                </p>
              </div>
            )}

            {/* ── Scores grid — retro squares ── */}
            <div className="grid grid-cols-3 gap-2">
              {analysis.sociability_score != null && (
                <>
                  <div className="retro-card p-3 flex flex-col items-center gap-1 justify-center" style={{ backgroundColor: 'var(--retro-blue)' }}>
                    <span className="text-2xl">🤝</span>
                    <span className="text-2xl font-black text-gray-800">{analysis.sociability_score}</span>
                    <span className="text-[11px] font-bold text-gray-600">Sociabilité</span>
                  </div>
                  <div className="retro-card p-3 flex flex-col items-center gap-1 justify-center" style={{ backgroundColor: 'var(--retro-yellow)' }}>
                    <span className="text-2xl">🔍</span>
                    <span className="text-2xl font-black text-gray-800">{analysis.curiosity_score || 0}</span>
                    <span className="text-[11px] font-bold text-gray-600">Curiosité</span>
                  </div>
                  <div className="retro-card p-3 flex flex-col items-center gap-1 justify-center" style={{ backgroundColor: 'var(--retro-green)' }}>
                    <span className="text-2xl">⚖️</span>
                    <span className="text-2xl font-black text-gray-800">{analysis.emotional_stability_score || 0}</span>
                    <span className="text-[11px] font-bold text-gray-600">Stabilité</span>
                  </div>
                </>
              )}
              <div className="retro-card p-3 flex flex-col items-center gap-1 justify-center" style={{ backgroundColor: 'var(--retro-purple)' }}>
                <span className="text-2xl">{analysis.engagement_level === "high" ? "🔥" : analysis.engagement_level === "medium" ? "👍" : "💤"}</span>
                <span className="text-xl font-black text-gray-800 capitalize">{
                  analysis.engagement_level === "high" ? "Élevé" : analysis.engagement_level === "medium" ? "Moyen" : "Faible"
                }</span>
                <span className="text-[11px] font-bold text-gray-600">Engagement</span>
              </div>
              {analysis.attention_span && (
                <div className="retro-card p-3 flex flex-col items-center gap-1 justify-center" style={{ backgroundColor: 'var(--retro-red)' }}>
                  <span className="text-2xl">{analysis.attention_span === "long" ? "🟢" : analysis.attention_span === "moyen" ? "🟡" : "🔴"}</span>
                  <span className="text-xl font-black text-gray-800 capitalize">{
                    analysis.attention_span === "long" ? "Longue" : analysis.attention_span === "moyen" ? "Moyenne" : "Courte"
                  }</span>
                  <span className="text-[11px] font-bold text-gray-600">Attention</span>
                </div>
              )}
            </div>

            {/* ── Emotions — colorful pills ── */}
            {analysis.emotions && Object.keys(analysis.emotions).length > 0 && (
              <div className="retro-card p-5">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-8 h-8 bg-black flex items-center justify-center"><span className="text-white text-sm">💛</span></div>
                  <h3 className="text-[16px] font-black text-foreground uppercase">Émotions</h3>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {Object.entries(analysis.emotions).filter(([, v]) => (v as number) > 0).sort(([, a], [, b]) => (b as number) - (a as number)).map(([key, value]) => {
                    const info = emotionScoreLabels[key] || { label: key, emoji: "❓" };
                    return (
                      <div key={key} className="flex items-center gap-2.5 px-4 py-2.5 border-2 border-black bg-white">
                        <span className="text-xl">{info.emoji}</span>
                        <span className="text-[14px] font-black text-gray-800">{info.label}</span>
                        <span className="text-[14px] text-primary font-black">{value as number}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Interests + Topics ── */}
            {(analysis.extracted_interests?.length > 0 || analysis.topics_detected?.length > 0) && (
              <div className="grid grid-cols-2 gap-3">
                {analysis.extracted_interests?.length > 0 && (
                  <div className="retro-card p-4" style={{ backgroundColor: 'var(--retro-purple)' }}>
                    <h4 className="text-[15px] font-black text-gray-800 mb-3 uppercase">✨ Intérêts</h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.extracted_interests.map((interest, i) => (
                        <span key={i} className="px-3 py-1.5 border-2 border-black bg-white text-[13px] font-bold text-gray-800">{interest}</span>
                      ))}
                    </div>
                  </div>
                )}
                {analysis.topics_detected?.length > 0 && (
                  <div className="retro-card p-4" style={{ backgroundColor: 'var(--retro-blue)' }}>
                    <h4 className="text-[15px] font-black text-gray-800 mb-3 uppercase">💬 Sujets</h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.topics_detected.map((t, i) => (
                        <span key={i} className="px-3 py-1.5 border-2 border-black bg-white text-[13px] font-bold text-gray-800">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Observations ── */}
            {analysis.behavior_insights?.length > 0 && (
              <div className="retro-card p-5">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-8 h-8 bg-black flex items-center justify-center"><span className="text-white text-sm">🔎</span></div>
                  <h3 className="text-[16px] font-black text-foreground uppercase">Observations</h3>
                </div>
                <ul className="space-y-3">
                  {analysis.behavior_insights.map((insight, i) => (
                    <li key={i} className="text-[14px] text-foreground flex items-start gap-3 leading-relaxed font-bold">
                      <span className="w-2 h-2 bg-black mt-2 shrink-0" />{insight}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* ── Alerts ── */}
            {analysis.alerts?.length > 0 && (
              <div className="retro-card p-5" style={{ backgroundColor: 'var(--retro-red)' }}>
                <div className="flex items-center gap-2.5 mb-3">
                  <AlertTriangle className="w-6 h-6 text-gray-800" />
                  <h3 className="text-[16px] font-black text-gray-800 uppercase">Alertes</h3>
                </div>
                {analysis.alerts.map((alert, i) => (
                  <p key={i} className="text-[14px] text-gray-800 mb-2 font-bold">⚠️ {alert.message}</p>
                ))}
              </div>
            )}

            {/* ── Transcription — Apple iMessage style ── */}
            {sessionMessages.length > 0 && (
              <div className="retro-card p-5">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-8 h-8 bg-black flex items-center justify-center"><span className="text-white text-sm">📖</span></div>
                  <h3 className="text-[16px] font-black text-foreground uppercase">Transcription</h3>
                  <span className="ml-auto text-[12px] text-foreground/60 font-black bg-white px-2.5 py-1 border-2 border-black">{sessionMessages.length} msgs</span>
                </div>
                <div className="max-h-[500px] overflow-y-auto space-y-3 py-1">
                  {sessionMessages.map((msg, i) => {
                    const isChild = msg.role === "user";
                    const isActive = i === activeMessageIdx && (playingAudio || ttsPlaying);
                    const isTtsSpeaking = ttsPlaying === msg.content;
                    const time = new Date(msg.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
                    return (
                      <div key={i} className={`flex ${isChild ? "justify-start" : "justify-end"}`}>
                        <div className={`max-w-[82%] relative group ${
                          isActive ? "scale-[1.02]" : ""
                        } transition-transform duration-200`}>
                          <div className={`px-4 py-3 border-2 border-black ${
                            isChild
                              ? "bg-white"
                              : "bg-[var(--retro-blue)]"
                          } ${isActive ? "ring-2 ring-foreground/30" : ""}`}
                            style={{ boxShadow: "2px 2px 0px rgba(0,0,0,0.15)" }}>
                            <p className="text-[14px] text-foreground leading-[1.5] font-bold">{msg.content}</p>
                          </div>
                          <div className={`flex items-center gap-2 mt-1.5 px-1.5 ${isChild ? "" : "justify-end"}`}>
                            <span className="text-[11px] text-foreground/50 font-black">{isChild ? `👦 ${displayName}` : "🤖 Bobby"}</span>
                            <span className="text-[10px] text-foreground/40 font-bold">{time}</span>
                            {msg.detected_emotion && (
                              <span className="text-[10px] px-2 py-0.5 border border-black bg-white font-black">
                                {emotionLabels[msg.detected_emotion]?.emoji}
                              </span>
                            )}
                            <button onClick={() => speakMessage(msg.content)}
                              className="opacity-0 group-hover:opacity-100 w-7 h-7 border border-black flex items-center justify-center text-foreground/60 hover:bg-[var(--retro-yellow)] transition-all">
                              {isTtsSpeaking ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Timeline émotionnelle ── */}
            {sessionMessages.filter(m => m.detected_emotion && m.role === "user").length > 0 && (
              <div className="retro-card p-5">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-8 h-8 bg-black flex items-center justify-center"><span className="text-white text-sm">📈</span></div>
                  <h3 className="text-[16px] font-black text-foreground uppercase">Timeline émotionnelle</h3>
                </div>
                <div className="flex items-center gap-1 overflow-x-auto pb-2">
                  {sessionMessages.map((msg, i) => {
                    if (msg.role !== "user" || !msg.detected_emotion) return null;
                    const emo = emotionLabels[msg.detected_emotion] || { emoji: "💬", color: "bg-muted text-muted-foreground" };
                    const totalUserMsgs = sessionMessages.filter(m => m.role === "user").length;
                    const userIdx = sessionMessages.filter((m, j) => j < i && m.role === "user").length;
                    const timeStr = totalUserMsgs > 0 && selectedSession?.duration_seconds
                      ? `${Math.floor((userIdx / totalUserMsgs) * (selectedSession.duration_seconds / 60))}:${String(Math.floor((userIdx / totalUserMsgs) * selectedSession.duration_seconds % 60)).padStart(2, "0")}`
                      : "";
                    return (
                        <button key={i} onClick={() => jumpToMoment(i)}
                          className="flex flex-col items-center px-1.5 py-1.5 border border-black hover:bg-[var(--retro-yellow)] transition-all min-w-[36px]">
                          <span className="text-base">{emo.emoji}</span>
                          <span className="text-[9px] text-foreground/60 font-mono font-black">{timeStr}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Audio Player — clean, ABOVE Note parent ── */}
            {(analysis?.audio_path || sessionMessages.length > 0) && (
              <div className="retro-card p-5" style={{ backgroundColor: 'var(--retro-blue)' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 border-2 border-black flex items-center justify-center ${
                    playingAudio || fullPlaybackActive ? "bg-[var(--retro-yellow)]" : "bg-white"
                  }`}>
                    <span className="text-xl">🎧</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[15px] font-black text-foreground uppercase">
                      {playingAudio || fullPlaybackActive ? "🔴 Lecture en cours" : "Réécouter"}
                    </h3>
                    <p className="text-[11px] text-foreground/60 font-bold truncate">
                      {playingAudio && activeMessageIdx >= 0
                        ? `Message ${activeMessageIdx + 1}/${sessionMessages.length}`
                        : `${sessionMessages.length} messages`
                      }
                    </p>
                  </div>
                </div>
                {analysis?.audio_path && (
                  <div className="mb-4">
                    <input type="range" min={0} max={100} step={0.1} value={audioProgress}
                      onChange={(e) => seekAudio(parseFloat(e.target.value))}
                      className="w-full h-2 rounded-full appearance-none cursor-pointer bg-muted/40
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-md
                        [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0"
                      style={{ background: `linear-gradient(to right, hsl(var(--primary)) ${audioProgress}%, hsl(var(--muted)) ${audioProgress}%)` }}
                    />
                    <div className="flex justify-between mt-1.5">
                      <span className="text-[10px] text-muted-foreground font-mono font-bold">
                        {audioDuration > 0 && isFinite(audioDuration) ? `${Math.floor((audioProgress / 100) * audioDuration / 60)}:${String(Math.floor((audioProgress / 100) * audioDuration % 60)).padStart(2, "0")}` : "0:00"}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono font-bold">
                        {audioDuration > 0 && isFinite(audioDuration) ? `${Math.floor(audioDuration / 60)}:${String(Math.floor(audioDuration % 60)).padStart(2, "0")}` : "—"}
                      </span>
                    </div>
                  </div>
                )}
                {!analysis?.audio_path && sessionMessages.length > 0 && (() => {
                  const totalDur = selectedSession?.duration_seconds || sessionMessages.length * 8;
                  const progressPct = fullPlaybackActive ? ((fullPlaybackIdx) / Math.max(1, sessionMessages.length)) * 100 : 0;
                  const elapsedSec = Math.round((progressPct / 100) * totalDur);
                  return (
                  <div className="mb-4 relative">
                    <input type="range" min={0} max={100} step={0.5} value={progressPct}
                      onChange={(e) => {
                        const pct = parseFloat(e.target.value) / 100;
                        const idx = Math.round(pct * (sessionMessages.length - 1));
                        const clampedIdx = Math.max(0, Math.min(sessionMessages.length - 1, idx));
                        if (fullPlaybackActive) {
                          fullPlaybackRef.current.audio?.pause();
                          fullPlaybackRef.current.audio = null;
                          setFullPlaybackPaused(false);
                          setFullPlaybackIdx(clampedIdx);
                        } else {
                          startFullPlayback(clampedIdx);
                        }
                      }}
                      className={`w-full h-2 rounded-full appearance-none cursor-pointer bg-muted/40
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-md
                        [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0
                        ${fullPlaybackLoading ? "opacity-60" : ""}`}
                      style={{ background: fullPlaybackLoading
                        ? `repeating-linear-gradient(90deg, hsl(var(--primary)/0.4) 0%, hsl(var(--primary)) 50%, hsl(var(--primary)/0.4) 100%)`
                        : `linear-gradient(to right, hsl(var(--primary)) ${progressPct}%, hsl(var(--muted)) ${progressPct}%)` }}
                    />
                    {fullPlaybackLoading && (
                      <div className="absolute inset-x-0 top-0 h-2 rounded-full overflow-hidden pointer-events-none">
                        <div className="h-full w-1/3 bg-primary/40 rounded-full animate-pulse"
                          style={{ marginLeft: `${Math.max(0, progressPct - 10)}%` }} />
                      </div>
                    )}
                    <div className="flex justify-between mt-1.5">
                      <span className="text-[10px] text-muted-foreground font-mono font-bold">
                        {fullPlaybackLoading && <Loader2 className="w-3 h-3 inline-block mr-1 animate-spin" />}
                        {`${Math.floor(elapsedSec / 60)}:${String(Math.floor(elapsedSec % 60)).padStart(2, "0")}`}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono font-bold">
                        {`${Math.floor(totalDur / 60)}:${String(Math.floor(totalDur % 60)).padStart(2, "0")}`}
                      </span>
                    </div>
                  </div>
                  );
                })()}
                <div className="flex items-center justify-center gap-3">
                  {analysis?.audio_path ? (
                    <>
                      <button onClick={() => skipAudio(-10)}
                        className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground hover:bg-muted/70 transition-all active:scale-90">
                        <SkipBack className="w-4 h-4" />
                      </button>
                      <button onClick={() => playAudio(analysis.audio_path!)}
                        className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex items-center justify-center hover:opacity-90 transition-all shadow-lg shadow-primary/25 active:scale-95">
                        {playingAudio === analysis.audio_path ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
                      </button>
                      <button onClick={() => skipAudio(10)}
                        className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground hover:bg-muted/70 transition-all active:scale-90">
                        <SkipForward className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      {!fullPlaybackActive ? (
                        <button onClick={() => startFullPlayback(0)}
                          className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex items-center justify-center hover:opacity-90 transition-all shadow-lg shadow-primary/25 active:scale-95">
                          <Play className="w-6 h-6 ml-0.5" />
                        </button>
                      ) : (
                        <>
                          <button onClick={() => { if (fullPlaybackIdx > 0) setFullPlaybackIdx(i => Math.max(0, i - 1)); }}
                            className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground hover:bg-muted/70 transition-all active:scale-90">
                            <SkipBack className="w-4 h-4" />
                          </button>
                          <button onClick={toggleFullPlaybackPause}
                            className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex items-center justify-center hover:opacity-90 transition-all shadow-lg shadow-primary/25 active:scale-95">
                            {fullPlaybackLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : fullPlaybackPaused ? <Play className="w-6 h-6 ml-0.5" /> : <Pause className="w-6 h-6" />}
                          </button>
                          <button onClick={() => { if (fullPlaybackIdx < sessionMessages.length - 1) setFullPlaybackIdx(i => i + 1); }}
                            className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground hover:bg-muted/70 transition-all active:scale-90">
                            <SkipForward className="w-4 h-4" />
                          </button>
                          <button onClick={stopFullPlayback}
                            className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center text-destructive hover:bg-destructive/20 transition-all border border-destructive/15">
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-center gap-2 mt-3">
                  {[0.75, 1, 1.25, 1.5, 2].map(speed => (
                    <button key={speed} onClick={() => { if (analysis?.audio_path) setAudioSpeed(speed); else setFullPlaybackSpeed(speed); }}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all ${
                        (analysis?.audio_path ? audioSpeed : fullPlaybackSpeed) === speed
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted/70"
                      }`}>
                      {speed}×
                    </button>
                  ))}
                </div>
                {/* Karaoke-style transcription — scrolling messages with active highlight */}
                {(playingAudio || fullPlaybackActive) && sessionMessages.length > 0 && (
                  <div className="mt-3 max-h-36 overflow-y-auto rounded-2xl bg-muted/20 border border-border/10 scroll-smooth">
                    {sessionMessages.map((msg, i) => {
                      const isActive = i === activeMessageIdx || (fullPlaybackActive && i === fullPlaybackIdx);
                      const isPast = i < (fullPlaybackActive ? fullPlaybackIdx : activeMessageIdx);
                      return (
                        <div key={i}
                          ref={el => { if (isActive && el) el.scrollIntoView({ behavior: "smooth", block: "center" }); }}
                          onClick={() => {
                            if (analysis?.audio_path) {
                              const pct = (i / sessionMessages.length) * 100;
                              seekAudio(pct);
                              setActiveMessageIdx(i);
                            } else if (fullPlaybackActive) {
                              setFullPlaybackIdx(i);
                            }
                          }}
                          className={`px-3 py-2 cursor-pointer transition-all duration-300 ${
                            isActive
                              ? "bg-primary/12 border-l-3 border-l-primary"
                              : isPast ? "opacity-40" : "opacity-70"
                          }`}>
                          <span className="text-[9px] font-black text-muted-foreground">
                            {msg.role === "user" ? `👦 ${displayName}` : "🤖 Bobby"}
                          </span>
                          <p className={`text-[11px] leading-snug mt-0.5 font-medium ${
                            isActive ? "text-foreground font-bold" : "text-foreground/70"
                          }`}>{msg.content?.slice(0, 120)}{(msg.content?.length || 0) > 120 ? "…" : ""}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Note du parent ── */}
            <div className="retro-card p-5">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 bg-black flex items-center justify-center"><span className="text-white text-sm">📝</span></div>
                <h3 className="text-[16px] font-black text-foreground uppercase">Note du parent</h3>
              </div>
              {editingNote === selectedSession!.id ? (
                <div className="space-y-3">
                  <textarea
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    placeholder="Ajoutez une note sur cette session…"
                    className="w-full bg-muted rounded-2xl px-4 py-3 text-[14px] text-foreground outline-none focus:ring-2 focus:ring-primary/30 resize-none h-24 font-medium"
                  />
                  <div className="flex gap-3">
                    <button onClick={() => saveParentNote(selectedSession!.id, noteText)}
                      className="flex-1 py-3 rounded-2xl bg-primary text-primary-foreground text-[14px] font-extrabold shadow-sm">
                      💾 Enregistrer
                    </button>
                    <button onClick={() => setEditingNote(null)}
                      className="px-5 py-3 rounded-2xl bg-muted text-muted-foreground text-[14px] font-bold">
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setEditingNote(selectedSession!.id); setNoteText(selectedSession!.parent_note || ""); }}
                  className="w-full text-left p-3 rounded-2xl hover:bg-muted/50 transition-all">
                  {selectedSession!.parent_note ? (
                    <p className="text-[14px] text-foreground leading-relaxed font-medium">{selectedSession!.parent_note}</p>
                  ) : (
                    <p className="text-[14px] text-muted-foreground italic font-medium">Appuyez pour ajouter une note…</p>
                  )}
                </button>
              )}
            </div>
          </>
        ) : (
          <button onClick={() => analyzeSession(selectedSession!)}
            className="w-full bg-primary text-primary-foreground border-4 border-black p-5 font-black text-[16px] hover:opacity-90 transition-all active:scale-95 uppercase">
            🧠 Lancer l'analyse IA
          </button>
        )}

        {/* ── 3 Action Buttons — colorful ── */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => exportSessionPDF(selectedSession!, selectedAnalysis)}
            className="flex flex-col items-center gap-2 py-4 border-4 border-black bg-white hover:bg-muted transition-all active:scale-95">
            <Download className="w-6 h-6 text-gray-800" />
            <span className="text-[13px] font-black text-gray-800 uppercase">Exporter</span>
          </button>
          <button
            onClick={async () => {
              const result = await saveToCloud(displayName, settings);
              if (result.success) {
                setCloudProfile(result.profile!);
                toast.success("☁️ Session sauvegardée dans Bobby Cloud", { description: `Code : ${result.profile!.sync_code}` });
              } else {
                toast.error("Erreur", { description: result.error });
              }
            }}
            className="flex flex-col items-center gap-2 py-4 border-4 border-black bg-white hover:bg-muted transition-all active:scale-95">
            <CloudUpload className="w-6 h-6 text-gray-800" />
            <span className="text-[13px] font-black text-gray-800 uppercase">Cloud</span>
          </button>
          <button
            onClick={() => setConfirmDialog({
              title: "Supprimer cette session ?",
              description: "Toutes les données de cette session (messages, analyse, audio) seront supprimées définitivement.",
              confirmLabel: "Supprimer",
              variant: "danger",
              onConfirm: () => { deleteSession(selectedSession!.id); setConfirmDialog(null); },
            })}
            className="flex flex-col items-center gap-2 py-4 border-4 border-black hover:bg-muted transition-all active:scale-95" style={{ backgroundColor: 'var(--retro-red)' }}>
            <Trash2 className="w-6 h-6 text-gray-800" />
            <span className="text-[13px] font-black text-gray-800 uppercase">Supprimer</span>
          </button>
        </div>

      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER: SESSIONS LIST (grouped by day)
  // ═══════════════════════════════════════════════════════════════

  const renderSessionsList = () => {
    // Build daily summaries
    const dailySummaries = groupedSessions.map(group => {
      const daySessions = group.sessions;
      const dayAnalyses = daySessions.map(s => analyses.find(a => a.session_id === s.id)).filter(Boolean) as Analysis[];
      const totalMessages = daySessions.reduce((sum, s) => sum + s.message_count, 0);
      const totalDuration = daySessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
      const allEmotions = daySessions.flatMap(s => s.detected_emotions || []);
      const topEmotions = [...new Set(allEmotions)].slice(0, 4);
      const allTopics = daySessions.flatMap(s => s.topics || []);
      const topTopics = [...new Set(allTopics)].slice(0, 5);
      const allTags = daySessions.flatMap(s => s.tags || []);
      const uniqueTags = [...new Set(allTags)];
      const hasFavorite = daySessions.some(s => s.is_favorite);
      const avgMood = dayAnalyses.length > 0
        ? dayAnalyses.map(a => a.mood_score || "neutral").reduce((best, m) => {
            const order = ["very_positive", "positive", "neutral", "negative", "very_negative"];
            return order.indexOf(m) < order.indexOf(best) ? m : best;
          }, "neutral" as string)
        : "neutral";
      const mood = moodLabels[avgMood] || moodLabels.neutral;
      const rawSummaries = dayAnalyses.map(a => a.summary).filter(Boolean);
      // Extract only the first sentence from each summary for a brief overview
      const briefParts = rawSummaries.map(s => {
        const sentences = s!.match(/[^.!?]+[.!?]+/g);
        return sentences ? sentences[0].trim() : s!.slice(0, 80).trim();
      });
      const daySummary = humanizeSummary(briefParts.slice(0, 3).join(" • "));
      const avgSociability = dayAnalyses.length > 0 ? Math.round(dayAnalyses.reduce((s, a) => s + (a.sociability_score ?? 0), 0) / dayAnalyses.length) : null;
      const avgCuriosity = dayAnalyses.length > 0 ? Math.round(dayAnalyses.reduce((s, a) => s + (a.curiosity_score ?? 0), 0) / dayAnalyses.length) : null;
      const avgStability = dayAnalyses.length > 0 ? Math.round(dayAnalyses.reduce((s, a) => s + (a.emotional_stability_score ?? 0), 0) / dayAnalyses.length) : null;

      return { ...group, totalMessages, totalDuration, topEmotions, topTopics, uniqueTags, hasFavorite, mood, daySummary, avgSociability, avgCuriosity, avgStability, dayAnalyses, daySessions };
    });

    // Build calendar data — which days have sessions
    const calendarDays: { date: Date; count: number; mood: string }[] = dailySummaries.map(d => ({
      date: new Date(d.daySessions[0].started_at),
      count: d.daySessions.length,
      mood: d.mood.emoji,
    }));

    // Current month view
    const now = new Date();
    const calMonth = now.getMonth();
    const calYear = now.getFullYear();
    const firstDay = new Date(calYear, calMonth, 1);
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const startDow = (firstDay.getDay() + 6) % 7; // Monday=0
    const monthName = firstDay.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

    const categoryCards: { key: string; emoji: string; label: string; bg: string; active: boolean; onClick: () => void }[] = [
      { key: "all", emoji: "📋", label: "Tous", bg: "from-primary/20 to-primary/10", active: !tagFilter && !sessionFavFilter, onClick: () => { setTagFilter(null); setSessionFavFilter(false); } },
      { key: "fav", emoji: "⭐", label: "Favoris", bg: "from-yellow-400/25 to-yellow-300/10", active: sessionFavFilter && !tagFilter, onClick: () => { setTagFilter(null); setSessionFavFilter(!sessionFavFilter); } },
      ...Object.entries(tagLabels).map(([key, info]) => ({
        key,
        emoji: info.emoji,
        label: info.label,
        bg: key === "fun" ? "from-pink-400/20 to-pink-300/10" : key === "learning" ? "from-blue-400/20 to-blue-300/10" : key === "emotion" ? "from-amber-400/20 to-amber-300/10" : "from-muted to-muted/50",
        active: tagFilter === key && !sessionFavFilter,
        onClick: () => { setSessionFavFilter(false); setTagFilter(tagFilter === key ? null : key); },
      })),
    ];

    return (
      <div className="p-4 space-y-4" style={{ fontFamily: "'Nunito', sans-serif" }}>
        {/* Search bar */}
        <div className="relative">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40" />
          <input type="text" value={sessionSearch} onChange={e => setSessionSearch(e.target.value)}
            placeholder="Rechercher…"
            className="w-full pl-11 pr-4 py-3 bg-white text-[15px] font-black text-foreground placeholder:text-foreground/40 border-4 border-black outline-none focus:ring-2 focus:ring-foreground/20 transition-all" />
        </div>

        {/* Category cards — retro grid */}
        <div className="grid grid-cols-6 gap-1.5 mt-2">
          {categoryCards.map((card, ci) => {
            const retroBgs = ["var(--retro-blue)", "var(--retro-yellow)", "var(--retro-red)", "var(--retro-blue)", "var(--retro-yellow)", "var(--retro-green)"];
            return (
              <button key={card.key} onClick={card.onClick}
                className={`relative px-1 py-2.5 flex flex-col items-center justify-center gap-1 transition-all duration-200 active:scale-90 border-2 border-black ${
                  card.active ? "ring-2 ring-foreground/20 scale-[1.03]" : "hover:translate-y-[-1px]"
                }`}
                style={{
                  backgroundColor: card.active ? retroBgs[ci % retroBgs.length] : "white",
                  boxShadow: card.active ? "3px 3px 0px rgba(0,0,0,0.25)" : "1px 1px 0px rgba(0,0,0,0.1)",
                  fontFamily: "'Nunito', sans-serif",
                }}>
                <span className="text-xl">{card.emoji}</span>
                <span className={`text-[9px] font-black leading-tight text-center uppercase ${card.active ? "text-foreground" : "text-foreground/60"}`}>{card.label}</span>
              </button>
            );
          })}
        </div>

        {/* Mini calendar — retro */}
        <div className="retro-card px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[14px] font-black text-foreground capitalize uppercase">{monthName}</h4>
            <span className="text-base">📅</span>
          </div>
          <div className="grid grid-cols-7 gap-px">
            {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
              <span key={i} className="text-[10px] font-black text-foreground/40 text-center py-1 uppercase">{d}</span>
            ))}
            {Array.from({ length: startDow }, (_, i) => (
              <div key={`e-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const dayNum = i + 1;
              const dayData = calendarDays.find(c => c.date.getDate() === dayNum && c.date.getMonth() === calMonth);
              const isToday = dayNum === now.getDate();
              return (
                <button key={dayNum} type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (dayData) {
                      const target = dailySummaries.find(d => {
                        const sd = new Date(d.daySessions[0].started_at);
                        return sd.getDate() === dayNum && sd.getMonth() === calMonth;
                      });
                      if (target) {
                        const el = document.getElementById(`day-${target.day}`);
                        if (el) {
                          el.scrollIntoView({ behavior: "smooth", block: "center" });
                          el.classList.add("ring-2", "ring-foreground");
                          setTimeout(() => el.classList.remove("ring-2", "ring-foreground"), 2000);
                        }
                      }
                    }
                  }}
                  className={`w-full aspect-square flex items-center justify-center text-[11px] font-black transition-all border ${
                    dayData
                      ? "bg-[var(--retro-blue)] text-foreground border-black hover:bg-[var(--retro-yellow)] cursor-pointer active:scale-90"
                      : isToday
                        ? "bg-white border-black text-foreground ring-1 ring-foreground/30"
                        : "text-foreground/30 border-transparent cursor-default"
                  }`}>
                  {dayNum}
                </button>
              );
            })}
          </div>
        </div>

        {/* Daily summaries list */}
        {loading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-foreground" /></div>
        ) : dailySummaries.length === 0 ? (
          <div className="text-center py-8 text-foreground/50"><p className="text-sm font-black">Aucune session{tagFilter || sessionSearch || sessionFavFilter ? " trouvée" : " enregistrée"}.</p></div>
        ) : (
          <div className="space-y-3">
            {dailySummaries.map((day, dayIdx) => {
              const tiltClass = `retro-card-tilt-${(dayIdx % 6) + 1}`;
              return (
                <div key={day.day} id={`day-${day.day}`} className={`retro-card ${tiltClass} p-5 space-y-4 transition-all`}>
                  {/* Day header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Calendar className="w-5 h-5 text-foreground" />
                      <h4 className="text-[17px] font-black text-foreground uppercase">{formatDayHeader(day.daySessions[0].started_at)}</h4>
                      {day.hasFavorite && <span className="text-base">⭐</span>}
                    </div>
                    <span className="text-3xl">{day.mood.emoji}</span>
                  </div>

                  {/* KPIs row */}
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { value: day.daySessions.length, label: `session${day.daySessions.length > 1 ? "s" : ""}`, bg: "var(--retro-blue)" },
                      { value: day.totalMessages, label: "messages", bg: "var(--retro-green)" },
                      { value: formatDuration(day.totalDuration), label: "durée", bg: "var(--retro-purple)" },
                    ].map(kpi => (
                      <div key={kpi.label} className="border-2 border-black p-3 text-center" style={{ backgroundColor: kpi.bg }}>
                        <p className="text-xl font-black text-foreground">{kpi.value}</p>
                        <p className="text-[11px] text-foreground/60 font-black uppercase">{kpi.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Summary */}
                  {day.daySummary && (
                    <div className="border-2 border-black bg-[var(--retro-yellow)] px-4 py-3">
                      <p className="text-[14px] text-foreground/70 leading-relaxed font-bold">💡 {day.daySummary}</p>
                    </div>
                  )}

                  {/* Scores mini */}
                  {day.avgSociability !== null && (
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "Sociabilité", score: day.avgSociability, emoji: "🤝", bg: "var(--retro-blue)" },
                        { label: "Curiosité", score: day.avgCuriosity, emoji: "🔍", bg: "var(--retro-yellow)" },
                        { label: "Stabilité", score: day.avgStability, emoji: "⚖️", bg: "var(--retro-green)" },
                      ].map(s => (
                        <div key={s.label} className="border-2 border-black p-2.5 flex flex-col items-center gap-1" style={{ backgroundColor: s.bg }}>
                          <span className="text-lg">{s.emoji}</span>
                          <div className="w-full h-2 bg-white border border-black overflow-hidden">
                            <div className="h-full bg-foreground transition-all" style={{ width: `${s.score}%` }} />
                          </div>
                          <span className="text-[13px] font-black text-foreground">{s.score}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tags */}
                  {(day.topTopics.length > 0 || day.topEmotions.length > 0) && (
                    <div className="flex flex-wrap gap-2">
                      {day.topTopics.map(t => (
                        <span key={t} className="px-3 py-1 border-2 border-black bg-[var(--retro-blue)] text-foreground text-[12px] font-black">#{t}</span>
                      ))}
                      {day.topEmotions.map(e => (
                        <span key={e} className="px-3 py-1 border-2 border-black bg-[var(--retro-purple)] text-foreground text-[12px] font-black">{e}</span>
                      ))}
                    </div>
                  )}

                  {/* Expand sessions */}
                  <div className="border-t-2 border-black/20 pt-3">
                    <details className="group">
                      <summary className="text-[14px] text-foreground font-black cursor-pointer flex items-center gap-1.5 hover:opacity-70 uppercase">
                        <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90" />
                        Voir les {day.daySessions.length} session{day.daySessions.length > 1 ? "s" : ""}
                      </summary>
                      <div className="mt-3 space-y-2">
                        {day.daySessions.map(session => {
                          const analysis = analyses.find(a => a.session_id === session.id);
                          const sMood = moodLabels[(analysis?.mood_score || "neutral")] || moodLabels.neutral;
                          return (
                            <button key={session.id} onClick={() => analyzeSession(session)}
                              className="w-full text-left bg-white border-2 border-black p-4 hover:bg-[var(--retro-blue)]/30 transition-all flex items-center gap-3"
                              style={{ boxShadow: "2px 2px 0px rgba(0,0,0,0.15)" }}>
                              <span className="text-lg">{sMood.emoji}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-[14px] font-black text-foreground">
                                    {new Date(session.started_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                                  </span>
                                  <span className="text-[12px] text-foreground/60 font-bold">{formatDuration(session.duration_seconds)} • {session.message_count} msg</span>
                                </div>
                                {analysis?.summary && <p className="text-[12px] text-foreground/50 mt-1 truncate font-bold">{humanizeSummary(analysis.summary)}</p>}
                              </div>
                              <ChevronRight className="w-4 h-4 text-foreground/40 shrink-0" />
                            </button>
                          );
                        })}
                      </div>
                    </details>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER: PROFIL
  // ═══════════════════════════════════════════════════════════════

  const renderProfil = () => (
    <div className="p-4 space-y-3" style={{ fontFamily: "'Nunito', sans-serif" }}>
      {/* Back button when accessed from Réglages */}
      {reglagesSection === "profil" && (
        <button onClick={() => setReglagesSection(null)} className="flex items-center gap-1.5 text-primary text-[13px] font-bold mb-1">
          <ArrowLeft className="w-4 h-4" /> Retour aux réglages
        </button>
      )}
      {/* Avatar + Name + Age — compact hero card */}
      <div className="retro-card retro-card-tilt-1 p-4" style={{ backgroundColor: 'var(--retro-blue)' }}>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 border-4 border-black bg-white flex items-center justify-center text-4xl shrink-0">
            👤
          </div>
          <div className="flex-1 min-w-0">
            <input type="text" value={settings.childName}
              onChange={(e) => updateSetting("childName", e.target.value)}
              placeholder="Prénom"
              className="w-full bg-transparent text-xl font-black text-foreground outline-none placeholder:text-foreground/40 border-b-2 border-black pb-1 focus:border-foreground transition-colors uppercase" />
            <p className="text-[11px] text-foreground/60 mt-1 font-bold">Profil enfant</p>
            {settings.childName.trim() !== "" && settings.childName.trim() !== childName && (
              <button
                onClick={() => setPendingNameChange(settings.childName.trim())}
                className="mt-2 w-full py-2 border-2 border-black bg-foreground text-background text-[13px] font-black active:scale-95 transition-all uppercase"
                style={{ boxShadow: "3px 3px 0px rgba(0,0,0,0.2)" }}>
                Enregistrer le prénom
              </button>
            )}
          </div>
        </div>
        <div className="flex gap-1.5 mt-3 overflow-x-auto">
          {[4, 5, 6, 7, 8, 9, 10, 11, 12].map(age => (
            <button key={age} onClick={() => updateSetting("childAge", age)}
              className={`shrink-0 w-10 h-10 border-2 border-black text-[13px] font-black transition-all duration-200 active:scale-90 ${
                settings.childAge === age
                  ? "bg-foreground text-background"
                  : "bg-white text-foreground/60 hover:bg-[var(--retro-yellow)]"
              }`}>{age}</button>
          ))}
          <span className="self-center text-[10px] text-foreground/60 ml-1 shrink-0 font-black">ans</span>
        </div>
      </div>

      {/* Personality — square cards grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {([
          ["calm", "😌", "Calme", "Doux et rassurant", "var(--retro-blue)"],
          ["energetic", "⚡", "Énergique", "Vif et enthousiaste", "var(--retro-yellow)"],
          ["educational", "📚", "Éducatif", "Curieux et savant", "var(--retro-green)"],
          ["balanced", "🎯", "Équilibré", "Un peu de tout", "var(--retro-purple)"],
        ] as const).map(([val, emoji, label, desc, bg]) => (
          <button key={val} onClick={() => updateSetting("personality", val)}
            className={`retro-card p-3 text-center transition-all duration-200 active:scale-95 ${
              settings.personality === val
                ? "ring-2 ring-foreground/30"
                : ""
            }`}
            style={{ backgroundColor: bg }}>
            <span className="text-2xl block mb-1">{emoji}</span>
            <span className="text-[12px] font-black block text-foreground uppercase">{label}</span>
            <span className="text-[9px] text-foreground/60 leading-tight font-bold">{desc}</span>
          </button>
        ))}
      </div>

      {/* Interests — compact colored pills */}
      <div className="retro-card retro-card-tilt-2 p-3" style={{ backgroundColor: 'var(--retro-green)' }}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-base">💡</span>
          <h4 className="text-[12px] font-black text-foreground uppercase">Centres d'intérêt détectés</h4>
        </div>
        {allInterests.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {allInterests.map(([interest], i) => {
              const retroBgs = ["var(--retro-blue)", "var(--retro-red)", "var(--retro-yellow)", "var(--retro-orange)", "var(--retro-purple)", "#e5e5e5"];
              return (
                <span key={interest} className="px-2.5 py-1 border-2 border-black text-[10px] font-black text-foreground"
                  style={{ backgroundColor: retroBgs[i % retroBgs.length] }}>
                  {interest}
                </span>
              );
            })}
          </div>
        ) : (
          <p className="text-[10px] text-foreground/50 italic font-bold">Détection auto pendant les sessions 🔍</p>
        )}
      </div>

      {/* Blocked topics — compact */}
      <div className="retro-card retro-card-tilt-3 p-3" style={{ backgroundColor: 'var(--retro-red)' }}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-base">🚫</span>
          <h4 className="text-[12px] font-black text-foreground uppercase">Sujets bloqués</h4>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {settings.blockedTopics.map(t => (
            <button key={t} onClick={() => updateSetting("blockedTopics", settings.blockedTopics.filter(x => x !== t))}
              className="flex items-center gap-1 px-2.5 py-1 border-2 border-black bg-white text-foreground text-[10px] font-black hover:bg-foreground hover:text-background transition-all active:scale-95">
              {t} <X className="w-2.5 h-2.5" />
            </button>
          ))}
          {settings.blockedTopics.length === 0 && (
            <span className="text-[10px] text-foreground/50 italic font-bold">Aucun sujet bloqué</span>
          )}
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
          placeholder="Ajouter un sujet…"
          className="w-full px-3 py-2 bg-white text-[11px] text-foreground placeholder:text-foreground/40 border-4 border-black outline-none font-bold" />
      </div>

      {/* Save button */}
      <div className="pt-1 pb-2">
        <button
          onClick={() => {
            onSettingsChange?.(settings);
            setSettingsSaved(true);
            setTimeout(() => setSettingsSaved(false), 2000);
          }}
          className={`w-full py-3.5 text-[14px] font-black transition-all active:scale-95 border-4 border-black uppercase ${
            settingsSaved
              ? "bg-[var(--retro-green)] text-foreground"
              : "bg-foreground text-background hover:opacity-90"
          }`}
          style={{ boxShadow: "5px 5px 0px rgba(0,0,0,0.3)" }}>
          {settingsSaved ? "✅ ENREGISTRÉ !" : "💾 ENREGISTRER"}
        </button>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════
  // RENDER: RÉGLAGES (merged: Voix + Contenu + Limites)
  // ═══════════════════════════════════════════════════════════════

  const VOICE_MAP: Record<string, { label: string; emoji: string; desc: string; voiceName: string }> = {
    child: { label: "Mélodie", emoji: "🧒", voiceName: "Enfant", desc: "Voix fun et dynamique" },
    female: { label: "Mila", emoji: "👩", voiceName: "Maman", desc: "Voix douce et rassurante" },
    male: { label: "Vincent", emoji: "👨", voiceName: "Papa", desc: "Voix calme et chaleureuse" },
    sister: { label: "Marine", emoji: "👧", voiceName: "Grande Sœur", desc: "Cool et complice" },
    brother: { label: "Yanis", emoji: "👦", voiceName: "Grand Frère", desc: "Aventurier et drôle" },
    custom: { label: "Personnaliser", emoji: "🎨", voiceName: "", desc: "Bientôt disponible" },
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

  const renderReglages = () => {
    const handleSave = () => {
      onSettingsChange?.(settings);
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2000);
    };

    const handleUpdate = <K extends keyof ParentSettings>(key: K, value: ParentSettings[K]) => {
      updateSetting(key, value);
    };

    if (reglagesSection === "voix") {
      return (
        <VoiceSettings
          settings={settings}
          onUpdate={handleUpdate}
          onBack={() => setReglagesSection(null)}
          onSave={handleSave}
          saved={settingsSaved}
        />
      );
    }

    if (reglagesSection === "limites") {
      const today = new Date().toLocaleDateString("fr-FR");
      const todaySessions = sessions.filter(s => new Date(s.started_at).toLocaleDateString("fr-FR") === today);
      const todayDur = todaySessions.reduce((a, s) => a + (s.duration_seconds || 0), 0);
      return (
        <LimitsSettings
          settings={settings}
          onUpdate={handleUpdate}
          onUpdateNested={updateNested}
          todayDuration={todayDur}
          onBack={() => setReglagesSection(null)}
          onSave={handleSave}
          saved={settingsSaved}
        />
      );
    }

    if (reglagesSection === "personnalisation") {
      return (
        <BobbyCustomizer
          settings={settings}
          onUpdate={(key, value) => updateSetting(key, value)}
          onBack={() => setReglagesSection(null)}
          onSave={handleSave}
          saved={settingsSaved}
        />
      );
    }

    if (reglagesSection === "profil") {
      return renderProfil();
    }

    return (
      <div className="p-4 space-y-3" style={{ fontFamily: "'Nunito', sans-serif" }}>
        <h2 className="text-[18px] font-black text-foreground animate-fadeInUp uppercase">⚙️ Réglages</h2>
        <div className="grid grid-cols-2 gap-3 animate-fadeInUp" style={{ animationDelay: "0.05s" }}>
          {([
            ["voix", "🎤", "Voix & Sons", "Profils vocaux, vitesse, ton", "var(--retro-blue)"],
            ["limites", "⏱️", "Limites & Contrôle", "Temps, nuit, interactions, sujets", "var(--retro-yellow)"],
            ["profil", "👤", "Profil enfant", "Intérêts, mémoire, préférences", "var(--retro-purple)"],
          ] as const).map(([key, emoji, label, desc, bg]) => (
            <button key={key} onClick={() => setReglagesSection(key)}
              className="retro-card retro-card-tilt p-5 text-center transition-all duration-200 active:scale-95"
              style={{ backgroundColor: bg }}>
              <span className="text-4xl block mb-2">{emoji}</span>
              <span className="text-[14px] font-black text-gray-800 block uppercase">{label}</span>
              <span className="text-[10px] text-gray-600 leading-tight block mt-1 font-bold">{desc}</span>
            </button>
          ))}
        </div>
      </div>
    );
  };

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
      <div className="retro-card retro-card-tilt-1 p-4" style={{ backgroundColor: 'var(--retro-blue)' }}>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-foreground" />
          <h3 className="text-[13px] font-black text-foreground uppercase">Bobby v2.0</h3>
          <span className="text-[9px] px-2 py-0.5 border-2 border-black bg-white font-black">Dernière mise à jour</span>
        </div>
        <p className="text-[11px] text-foreground/60 font-bold">10 avril 2026</p>
      </div>

      {/* 🎤 Voix */}
      <div className="animate-fadeInUp" style={{ animationDelay: "0.1s" }}>
      <Card title="🎤 Voix émotionnelles V2" icon={Mic}>
        <div className="space-y-2">
          {[
            { emoji: "🧒", name: "Enfant (Lily)", desc: "Cartoon authentique, expressif, joyeux — stability 40%, style 70%" },
            { emoji: "👩", name: "Maman (Matilda)", desc: "Ultra apaisante, maternelle, lente — stability 85%, speed -12%" },
            { emoji: "👨", name: "Papa (George)", desc: "Calme, protecteur, posé — stability 90%, style minimal" },
          ].map((v) => (
            <div key={v.name} className="flex items-start gap-3 p-2.5 border-2 border-black bg-white">
              <span className="text-xl">{v.emoji}</span>
              <div>
                <h4 className="text-[12px] font-black text-foreground uppercase">{v.name}</h4>
                <p className="text-[10px] text-foreground/60 leading-tight mt-0.5 font-bold">{v.desc}</p>
              </div>
            </div>
          ))}
          <div className="flex items-start gap-3 p-2.5 border-2 border-black bg-[var(--retro-yellow)]">
            <span className="text-xl">🎭</span>
            <div>
              <h4 className="text-[12px] font-black text-foreground uppercase">8 émotions dynamiques</h4>
              <p className="text-[10px] text-foreground/60 leading-tight mt-0.5 font-bold">
                Joyeux, triste, effrayé, excité, calme, curieux, en colère, ennuyé — la voix s'adapte automatiquement
              </p>
            </div>
          </div>
        </div>
      </Card>
      </div>

      {/* 📖 Histoires */}
      <div className="animate-fadeInUp" style={{ animationDelay: "0.15s" }}>
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
              <span className="text-[12px] font-black text-foreground flex-1">{t.label}</span>
              <span className="text-[9px] px-2 py-0.5 border border-black bg-white text-foreground font-black">{t.tag}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 p-2.5 border-2 border-black bg-white">
          <p className="text-[10px] text-foreground/60 font-bold">
            🧒 <strong className="text-foreground font-black">Bobby</strong> — personnage principal, ami imaginaire vivant dans un jouet
          </p>
          <p className="text-[10px] text-foreground/60 mt-1 font-bold">
            🎵 <strong className="text-foreground font-black">Zik</strong> — ami imaginaire de Bobby, un peu coquin
          </p>
        </div>
      </Card>
      </div>

      {/* ⚡ Nouvelles fonctionnalités */}
      <div className="animate-fadeInUp" style={{ animationDelay: "0.2s" }}>
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
                <h4 className="text-[12px] font-black text-foreground uppercase">{f.title}</h4>
                <p className="text-[10px] text-foreground/60 leading-tight mt-0.5 font-bold">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
      </div>

      {/* 💡 Suggérer une idée */}
      <div className="animate-fadeInUp" style={{ animationDelay: "0.25s" }}>
      <Card title="💡 Suggérer une idée" icon={Heart}>
        <p className="text-[10px] text-foreground/60 mb-3 leading-tight font-bold">
          Vous avez une idée pour améliorer Bobby ? Partagez-la avec nous !
        </p>
        <textarea
          value={suggestionText}
          onChange={(e) => setSuggestionText(e.target.value)}
          placeholder="Ex: Ajouter une voix en anglais, un mode comptine..."
          rows={3}
          className="w-full px-4 py-2.5 bg-white text-sm text-foreground placeholder:text-foreground/40 border-4 border-black outline-none font-bold resize-none"
        />
        <button
          onClick={handleSuggestionSubmit}
          disabled={!suggestionText.trim() || suggestionSent}
          className={`mt-2 w-full py-2.5 text-[12px] font-black transition-all border-4 border-black uppercase ${
            suggestionSent
              ? "bg-[var(--retro-green)] text-foreground"
              : suggestionText.trim()
                ? "bg-foreground text-background hover:opacity-90"
                : "bg-white/50 text-foreground/40 cursor-not-allowed border-dashed"
          }`}
          style={{ boxShadow: suggestionText.trim() && !suggestionSent ? "3px 3px 0px rgba(0,0,0,0.2)" : "none" }}>
          {suggestionSent ? "✅ MERCI POUR VOTRE IDÉE !" : "ENVOYER MA SUGGESTION"}
        </button>
      </Card>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════
  // RENDER: CONFIDENTIALITÉ (merged: Sécurité + Données)
  // ═══════════════════════════════════════════════════════════════

  const [confSection, setConfSection] = useState<"securite" | "donnees" | "rgpd" | null>(null);

  const renderConfidentialite = () => {
    const dataCategories = [
      { id: "conversations", emoji: "💬", label: "Conversations", desc: "Messages texte", count: sessions.reduce((s, x) => s + x.message_count, 0) },
      { id: "audio", emoji: "🎙️", label: "Enregistrements", desc: "Fichiers audio", count: analyses.filter(a => a.audio_path).length },
      { id: "analyses", emoji: "📊", label: "Analyses IA", desc: "Résumés, scores", count: analyses.length },
      { id: "memories", emoji: "🧠", label: "Mémoire", desc: "Préférences", count: 1 },
    ];

    // ── Sub-section: Sécurité ──
    if (confSection === "securite") return (
      <div className="p-4 space-y-3 animate-fadeInUp" style={{ animationDelay: "0.05s" }}>
        <button onClick={() => setConfSection(null)} className="flex items-center gap-1.5 text-[13px] font-black uppercase text-foreground hover:opacity-70 mb-1 active:scale-95 transition-all border-2 border-black px-3 py-1.5 bg-white" style={{ fontFamily: "'Nunito', sans-serif" }}>
          <ChevronLeft className="w-4 h-4" /> CONFIDENTIALITÉ
        </button>
        <Card title="Code PIN parental" icon={Lock}>
          <p className="text-[10px] text-foreground/60 mb-3 leading-tight font-bold">Protège l'accès au Mode Parent avec un code à 4 chiffres</p>
          <div className="flex gap-2 items-center">
            <input type="password" maxLength={4} inputMode="numeric" pattern="[0-9]*"
              value={settings.parentPin}
              onChange={(e) => { const val = e.target.value.replace(/\D/g, "").slice(0, 4); updateSetting("parentPin", val); }}
              placeholder="● ● ● ●"
              className="flex-1 px-4 py-2.5 bg-white text-sm text-foreground text-center tracking-[0.5em] placeholder:text-foreground/40 border-4 border-black outline-none font-mono font-black" />
            {settings.parentPin.length === 4 && (
              <span className="text-[11px] text-foreground font-black flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> Actif</span>
            )}
          </div>
          {settings.parentPin.length === 4 && (
            <button onClick={() => updateSetting("parentPin", "")} className="mt-2 text-[11px] text-foreground font-black hover:underline uppercase">Supprimer le code PIN</button>
          )}
        </Card>
        <Card title="Niveau de filtrage" icon={Shield}>
          <div className="space-y-2">
            {([
              ["standard", "🟢", "Standard", "Contenu adapté aux enfants"],
              ["strict", "🔒", "Strict", "Filtre renforcé, exclusivement positif"],
            ] as const).map(([val, emoji, label, desc]) => (
              <button key={val} onClick={() => updateSetting("contentFilter", val)}
                className={`w-full p-3 text-left transition-all border-2 border-black ${settings.contentFilter === val ? "bg-[var(--retro-green)] ring-2 ring-foreground/20" : "bg-white hover:bg-[var(--retro-yellow)]"}`}>
                <div className="flex items-center gap-3">
                  <span className="text-xl">{emoji}</span>
                  <div>
                    <h4 className="text-[12px] font-black text-foreground uppercase">{label}</h4>
                    <p className="text-[10px] text-foreground/60 mt-0.5 font-bold">{desc}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Card>
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
        <Card title="Mot de sécurité" icon={AlertTriangle}>
          <p className="text-[10px] text-foreground/60 mb-3 leading-tight font-bold">Si l'enfant dit ce mot, Bobby réagit immédiatement</p>
          <input type="text" value={settings.safeWord}
            onChange={(e) => updateSetting("safeWord", e.target.value.slice(0, 30))}
            placeholder="Ex: 'au secours', 'aide-moi'…"
            className="w-full px-4 py-2.5 bg-white text-sm text-foreground placeholder:text-foreground/40 border-4 border-black outline-none font-bold mb-3" />
          {settings.safeWord.trim() && (
            <div className="grid grid-cols-3 gap-2">
              {([
                ["pause", "⏸️", "Pause"],
                ["alert", "🔔", "Alerte"],
                ["stop", "🛑", "Stop"],
              ] as const).map(([val, emoji, label]) => (
                <button key={val} onClick={() => updateSetting("safeWordAction", val)}
                  className={`p-3 text-center transition-all border-2 border-black ${settings.safeWordAction === val ? "bg-[var(--retro-green)] ring-2 ring-foreground/20" : "bg-white hover:bg-[var(--retro-yellow)]"}`}>
                  <span className="text-lg block">{emoji}</span>
                  <span className={`text-[10px] font-black ${settings.safeWordAction === val ? "text-foreground" : "text-foreground/70"} uppercase`}>{label}</span>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>
    );

    // ── Sub-section: Données ──
    if (confSection === "donnees") return (
      <div className="p-4 space-y-3 animate-fadeInUp" style={{ animationDelay: "0.05s" }}>
        <button onClick={() => setConfSection(null)} className="flex items-center gap-1.5 text-[13px] font-black uppercase text-foreground hover:opacity-70 mb-1 active:scale-95 transition-all border-2 border-black px-3 py-1.5 bg-white" style={{ fontFamily: "'Nunito', sans-serif" }}>
          <ChevronLeft className="w-4 h-4" /> CONFIDENTIALITÉ
        </button>
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
        <Card title="Données stockées" icon={BarChart3}>
          <div className="grid grid-cols-2 gap-2">
            {dataCategories.map(cat => (
              <div key={cat.id} className="p-3 border-2 border-black bg-white">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-lg">{cat.emoji}</span>
                  <span className="text-[11px] font-mono font-black text-foreground border-2 border-black px-2 py-0.5 bg-[var(--retro-yellow)]">{cat.count}</span>
                </div>
                <h4 className="text-[12px] font-black text-foreground uppercase">{cat.label}</h4>
                <p className="text-[9px] text-foreground/60 font-bold">{cat.desc}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Conservation" icon={Calendar}>
          <div className="grid grid-cols-2 gap-2">
            {([
              ["7j", "🗓️", "7 jours"],
              ["30j", "📅", "30 jours"],
              ["90j", "📆", "90 jours"],
              ["forever", "♾️", "Indéfini"],
            ] as const).map(([val, emoji, label]) => (
              <button key={val} onClick={() => updateSetting("dataRetention", val)}
                className={`p-3 text-center transition-all border-2 border-black ${settings.dataRetention === val ? "bg-[var(--retro-green)] ring-2 ring-foreground/20" : "bg-white hover:bg-[var(--retro-yellow)]"}`}>
                <span className="text-xl block mb-1">{emoji}</span>
                <span className={`text-[11px] font-black ${settings.dataRetention === val ? "text-foreground" : "text-foreground/70"} uppercase`}>{label}</span>
              </button>
            ))}
          </div>
        </Card>
        <Card title="Suppression sélective" icon={Trash2}>
          <div className="space-y-2">
            {[
              { emoji: "🎙️", label: "Supprimer les audio", desc: "Garde les analyses", action: () => {
                setConfirmDialog({ title: "Supprimer les enregistrements ?", description: "Tous les fichiers audio seront supprimés. Les analyses textuelles seront conservées.", confirmLabel: "Supprimer", variant: "danger" as const, onConfirm: () => {
                  supabase.storage.from("conversation-audio").list().then(({ data }) => { if (data?.length) supabase.storage.from("conversation-audio").remove(data.map(f => f.name)); });
                  setConfirmDialog(null);
                }});
              }},
              { emoji: "📊", label: "Supprimer les analyses", desc: "Garde les sessions", action: () => {
                setConfirmDialog({ title: "Supprimer les analyses ?", description: "Toutes les analyses IA seront supprimées.", confirmLabel: "Supprimer", variant: "danger" as const, onConfirm: () => {
                  supabase.from("conversation_analyses").delete().neq("id", "00000000-0000-0000-0000-000000000000").then(() => loadData());
                  setConfirmDialog(null);
                }});
              }},
              { emoji: "🧠", label: "Réinitialiser la mémoire", desc: "Bobby oublie les préférences", action: () => {
                setConfirmDialog({ title: "Réinitialiser la mémoire ?", description: "Bobby oubliera toutes les préférences et intérêts.", confirmLabel: "Réinitialiser", variant: "warning" as const, onConfirm: () => {
                  supabase.from("child_memories").delete().eq("child_name", displayName).then(() => loadData());
                  setConfirmDialog(null);
                }});
              }},
            ].map(item => (
              <button key={item.label} onClick={item.action}
                className="w-full flex items-center gap-3 p-3 border-2 border-black bg-white hover:bg-[var(--retro-red)] transition-all text-left">
                <span className="text-lg">{item.emoji}</span>
                <div className="flex-1">
                  <h4 className="text-[12px] font-black text-foreground uppercase">{item.label}</h4>
                  <p className="text-[9px] text-foreground/60 font-bold">{item.desc}</p>
                </div>
                <Trash2 className="w-4 h-4 text-foreground" />
              </button>
            ))}
          </div>
        </Card>
      </div>
    );

    // ── Sub-section: RGPD ──
    if (confSection === "rgpd") return (
      <div className="p-4 space-y-3 animate-fadeInUp" style={{ animationDelay: "0.05s" }}>
        <button onClick={() => setConfSection(null)} className="flex items-center gap-2 text-primary text-[13px] font-extrabold mb-1" style={{ fontFamily: "'Nunito', sans-serif" }}>
          <ChevronLeft className="w-4 h-4" /> Confidentialité
        </button>
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
                    a.href = url; a.download = `bobby-rgpd-export-${displayName}-${new Date().toISOString().slice(0, 10)}.json`;
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
                          supabase.from("child_sessions").delete().eq("child_name", displayName),
                          supabase.from("child_memories").delete().eq("child_name", displayName),
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
      </div>
    );

    // ── Grid of cards ──
    const confCards = [
      { id: "securite" as const, emoji: "🛡️", label: "Sécurité", desc: "PIN, filtrage, protections", bg: "var(--retro-red)" },
      { id: "donnees" as const, emoji: "💾", label: "Données", desc: "Collecte, stockage, suppression", bg: "var(--retro-blue)" },
      { id: "rgpd" as const, emoji: "📜", label: "RGPD", desc: "Accès, export, effacement", bg: "var(--retro-green)" },
    ];

    return (
      <div className="p-4 space-y-4" style={{ fontFamily: "'Nunito', sans-serif" }}>
        <h2 className="text-[16px] font-black text-foreground animate-fadeInUp uppercase" style={{ animationDelay: "0.05s" }}>🔒 Confidentialité</h2>
        <div className="grid grid-cols-2 gap-3">
          {confCards.map((card, i) => (
            <button key={card.id} onClick={() => setConfSection(card.id)}
              className="retro-card retro-card-tilt p-4 text-left hover:shadow-lg transition-all active:scale-95 animate-fadeInUp"
              style={{ animationDelay: `${0.1 + i * 0.05}s`, backgroundColor: card.bg }}>
              <span className="text-3xl block mb-2">{card.emoji}</span>
              <h3 className="text-[14px] font-black text-gray-800 leading-tight uppercase">{card.label}</h3>
              <p className="text-[10px] text-gray-600 mt-1 leading-snug font-bold">{card.desc}</p>
            </button>
          ))}
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER: BOBBY CLOUD
  // ═══════════════════════════════════════════════════════════════

  const renderCloud = () => {
    // Calculate cloud data stats
    const totalSessions = sessions.length;
    const totalMessages = sessions.reduce((s, sess) => s + (sess.message_count || 0), 0);
    const totalAnalyses = analyses.length;

    // Estimate storage used (rough: sessions ~2KB, messages ~0.5KB, analyses ~5KB)
    const estimatedStorageKB = (totalSessions * 2) + (totalMessages * 0.5) + (totalAnalyses * 5);
    const estimatedStorageMB = Math.max(0.01, estimatedStorageKB / 1024);
    const storageLabel = estimatedStorageMB < 1 ? `${Math.round(estimatedStorageKB)} Ko` : `${estimatedStorageMB.toFixed(1)} Mo`;

    const plans = [
      {
        name: "Découverte", price: "0€", period: "", emoji: "🆓",
        color: "from-muted/60 to-muted/30", border: "border-border/30",
        storage: "500 Mo",
        features: ["500 Mo de stockage cloud", "Bobby Brain V4 de base", "1 profil enfant", "Sync 1 appareil", "Bobby Store — packs gratuits"],
        cta: "Actuel", disabled: true,
      },
      {
        name: "Famille", price: "4,99€", period: "/mois", emoji: "👨‍👩‍👧‍👦",
        color: "from-primary/18 to-primary/5", border: "border-primary/30",
        storage: "5 Go",
        features: ["5 Go de stockage cloud", "Bobby Brain Intelligence V4", "3 profils enfants", "Sync 3 appareils", "Bobby Store complet", "Export MP3 sessions", "Analyses IA détaillées"],
        cta: "Bientôt disponible", disabled: true, popular: true,
      },
      {
        name: "Pro", price: "9,99€", period: "/mois", emoji: "🚀",
        color: "from-amber-500/15 to-amber-400/5", border: "border-amber-400/30",
        storage: "50 Go",
        features: ["50 Go de stockage cloud", "Bobby Brain Intelligence V4 max", "Profils illimités", "Appareils illimités", "Bobby Store Premium", "API développeur", "Support dédié 24/7"],
        cta: "Bientôt disponible", disabled: true,
      },
    ];

    return (
    <div className="p-4 space-y-4" style={{ fontFamily: "'Nunito', sans-serif" }}>
      {/* Hero */}
      <div className="retro-card p-6 text-center" style={{ backgroundColor: 'var(--retro-blue)' }}>
        <span className="text-5xl block mb-2">☁️</span>
        <h2 className="text-[22px] font-black text-gray-800 uppercase">Bobby Cloud</h2>
        <p className="text-[13px] text-gray-600 leading-relaxed font-bold">
          Sauvegardez, synchronisez et téléchargez tout le contenu de Bobby entre vos appareils.
        </p>
      </div>

      {/* ── CONNEXION / SYNC STATUS ── */}
      {cloudProfile ? (
        <div className="retro-card p-5 space-y-4" style={{ backgroundColor: 'var(--retro-green)' }}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 border-2 border-black bg-white flex items-center justify-center">
              <span className="text-xl">✅</span>
            </div>
            <div className="flex-1">
              <h3 className="text-[15px] font-black text-gray-800 uppercase">Connecté au Cloud</h3>
              <p className="text-[12px] text-gray-600 font-bold">{formatSyncTime(cloudProfile.last_synced_at)}</p>
            </div>
            <span className="px-2 py-1 border-2 border-black bg-white text-gray-800 text-[10px] font-black">ACTIF</span>
          </div>

          {/* Sync code */}
          <div className="border-2 border-black bg-white p-3">
            <p className="text-[11px] text-gray-600 font-black mb-1.5">📋 Code de synchronisation</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-[16px] font-mono font-black text-primary tracking-widest text-center py-2 border-2 border-black bg-white">
                {cloudProfile.sync_code}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(cloudProfile.sync_code);
                  setCloudCopied(true);
                  setTimeout(() => setCloudCopied(false), 2000);
                  toast.success("Code copié !");
                }}
                className="w-10 h-10 border-2 border-black bg-white flex items-center justify-center text-gray-800 hover:bg-muted transition-all active:scale-90">
                {cloudCopied ? <span>✓</span> : <span>📋</span>}
              </button>
            </div>
          </div>

          {/* Cloud data summary — what's synced */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { emoji: "💬", value: totalSessions, label: "Sessions" },
              { emoji: "📝", value: totalMessages, label: "Messages" },
              { emoji: "🧠", value: totalAnalyses, label: "Analyses" },
            ].map(s => (
              <div key={s.label} className="border-2 border-black bg-white p-2.5 text-center">
                <span className="text-lg">{s.emoji}</span>
                <p className="text-[16px] font-black text-gray-800">{s.value}</p>
                <p className="text-[9px] text-gray-600 font-bold">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={handleCloudSave} disabled={cloudLoading}
              className="flex flex-col items-center gap-1.5 p-3 border-4 border-black bg-white hover:bg-muted transition-all active:scale-95 disabled:opacity-50">
              {cloudLoading ? <Loader2 className="w-5 h-5 animate-spin text-gray-800" /> : <CloudUpload className="w-5 h-5 text-gray-800" />}
              <span className="text-[12px] font-black text-gray-800 uppercase">Sauvegarder</span>
            </button>
            <button onClick={() => {
              setConfirmDialog({
                title: "Supprimer le profil Cloud ?",
                description: "Le code de synchronisation ne fonctionnera plus.",
                confirmLabel: "Supprimer",
                variant: "danger",
                onConfirm: () => { handleCloudDelete(); setConfirmDialog(null); },
              });
            }} disabled={cloudLoading}
              className="flex flex-col items-center gap-1.5 p-3 border-4 border-black hover:bg-muted transition-all active:scale-95 disabled:opacity-50" style={{ backgroundColor: 'var(--retro-red)' }}>
              <Trash2 className="w-5 h-5 text-gray-800" />
              <span className="text-[12px] font-black text-gray-800 uppercase">Dissocier</span>
            </button>
          </div>
        </div>
      ) : (
        /* Not connected */
        <div className="space-y-3">
          <button onClick={handleCloudSave} disabled={cloudLoading}
            className="w-full retro-card p-5 hover:translate-y-[-2px] transition-all active:scale-[0.98] disabled:opacity-50" style={{ backgroundColor: 'var(--retro-blue)' }}>
            <div className="flex items-center gap-4">
              {cloudLoading ? <Loader2 className="w-9 h-9 animate-spin text-gray-800" /> : <CloudUpload className="w-9 h-9 text-gray-800" />}
              <div className="text-left flex-1">
                <h3 className="text-[16px] font-black text-gray-800 uppercase">Créer un compte Cloud</h3>
                <p className="text-[12px] text-gray-600 font-bold mt-0.5">Générer un code de synchronisation unique</p>
              </div>
            </div>
          </button>

          <div className="retro-card p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5 text-gray-800" />
              <h3 className="text-[15px] font-black text-foreground uppercase">Connecter un compte existant</h3>
            </div>
            <p className="text-[12px] text-muted-foreground font-bold">
              Entrez le code Bobby Cloud d'un autre appareil.
            </p>
            <input
              type="text"
              value={cloudRestoreCode}
              onChange={e => setCloudRestoreCode(e.target.value.toUpperCase())}
              placeholder="BOBBY-XXXX-XXXX"
              className="w-full text-center text-[16px] font-mono font-black tracking-widest px-3 py-3 border-2 border-black bg-white text-foreground placeholder:text-muted-foreground/40 outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
            <button onClick={handleCloudRestore} disabled={cloudLoading || !cloudRestoreCode.trim()}
              className="w-full py-3 bg-primary text-primary-foreground border-4 border-black font-black text-[14px] hover:opacity-90 transition-all active:scale-95 disabled:opacity-40 uppercase">
              {cloudLoading ? "Connexion…" : "☁️ Connecter"}
            </button>
          </div>
        </div>
      )}

      {/* ── CONTENU SYNCHRONISÉ ── */}
      <div className="retro-card p-5">
        <h3 className="text-[16px] font-black text-foreground mb-3 uppercase">📦 Contenu inclus dans Bobby Cloud</h3>
        <div className="grid grid-cols-2 gap-2">
          {[
            { emoji: "🧠", title: "Cerveau complet", desc: "Knowledge base, QA, mémoire enfant", bg: "var(--retro-purple)" },
            { emoji: "💬", title: "Conversations", desc: "Toutes les sessions Bobby ↔ enfant", bg: "var(--retro-blue)" },
            { emoji: "📚", title: "Bibliothèque", desc: "Histoires, contes et récits", bg: "var(--retro-yellow)" },
            { emoji: "🎓", title: "Contenu éducatif", desc: "Jeux, quiz, activités", bg: "var(--retro-green)" },
            { emoji: "🎙️", title: "Voix & TTS", desc: "Cache audio, préférences voix", bg: "var(--retro-red)" },
            { emoji: "📊", title: "Analyses IA", desc: "Rapports émotionnels, scores", bg: "#e5e5e5" },
          ].map(c => (
            <div key={c.title} className="border-2 border-black p-3" style={{ backgroundColor: c.bg }}>
              <span className="text-2xl block mb-1">{c.emoji}</span>
              <h4 className="text-[13px] font-black text-gray-800">{c.title}</h4>
              <p className="text-[10px] text-gray-600 leading-snug mt-0.5 font-bold">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── TARIFS ── */}
      <div className="space-y-3">
        <h3 className="text-[16px] font-black text-foreground px-1 uppercase">💾 TARIFS BOBBY CLOUD</h3>
        <p className="text-[11px] text-foreground/60 px-1 -mt-1 font-bold">Utilisation actuelle : <span className="font-black text-foreground">{storageLabel}</span> / 500 Mo</p>
        {/* Usage bar */}
        <div className="mx-1 h-3 bg-white border-2 border-black overflow-hidden">
          <div className="h-full bg-foreground transition-all" style={{ width: `${Math.min(100, (estimatedStorageMB / 500) * 100)}%` }} />
        </div>
        {plans.map((plan, pi) => {
          const planBgs = ["white", "var(--retro-blue)", "var(--retro-yellow)"];
          const tiltClass = `retro-card-tilt-${(pi % 6) + 1}`;
          return (
            <div key={plan.name} className={`retro-card ${tiltClass} p-4 relative ${(plan as any).popular ? "ring-2 ring-foreground/20" : ""}`}
              style={{ backgroundColor: planBgs[pi] || "white" }}>
              {(plan as any).popular && (
                <span className="absolute -top-2.5 right-4 px-3 py-0.5 border-2 border-black bg-[var(--retro-yellow)] text-foreground text-[10px] font-black">
                  ⭐ Recommandé
                </span>
              )}
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">{plan.emoji}</span>
                <div className="flex-1">
                  <h4 className="text-[17px] font-black text-foreground uppercase">{plan.name}</h4>
                  <span className="text-[12px] font-black text-foreground/70">💾 {(plan as any).storage}</span>
                </div>
                <div className="text-right">
                  <span className="text-[22px] font-black text-foreground">{plan.price}</span>
                  {plan.period && <span className="text-[11px] text-foreground/60 font-bold">{plan.period}</span>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mb-3">
                {plan.features.map(f => (
                  <div key={f} className="flex items-center gap-1.5">
                    <span className="text-foreground text-[12px] font-black">✓</span>
                    <span className="text-[11px] text-foreground font-bold">{f}</span>
                  </div>
                ))}
              </div>
              <button disabled={plan.disabled}
                className={`w-full py-2.5 font-black text-[13px] transition-all active:scale-95 border-4 border-black uppercase ${
                  plan.disabled
                    ? "bg-white/50 text-foreground/40 cursor-not-allowed"
                    : "bg-foreground text-background hover:opacity-90"
                }`}
                style={{ boxShadow: "3px 3px 0px rgba(0,0,0,0.2)" }}>
                {plan.cta}
              </button>
            </div>
          );
        })}
      </div>

      {/* ── INFRASTRUCTURE FOOTER ── */}
      <div className="mt-4 pt-4 border-t-2 border-black/10">
        <div className="flex items-center justify-center gap-3 flex-wrap">
          {[
            { emoji: "🔒", label: "AES-256" },
            { emoji: "🇪🇺", label: "RGPD" },
            { emoji: "📱", label: "Multi-appareils" },
            { emoji: "🔄", label: "Sync auto" },
            { emoji: "📈", label: "Scalable" },
          ].map(f => (
            <span key={f.label} className="inline-flex items-center gap-1 px-2.5 py-1 border border-black bg-white text-[9px] font-black text-foreground">
              {f.emoji} {f.label}
            </span>
          ))}
        </div>
        <p className="text-center text-[9px] text-foreground/40 mt-2 font-bold">
          ☁️ Infrastructure sécurisée • Chiffrement bout en bout • Serveurs EU
        </p>
      </div>
    </div>
  );
  };


  const allTabIds: Tab[] = ["home", ...tabs.map(t => t.id)];
  const prevTabRef = useRef(activeTab);
  const [animClass, setAnimClass] = useState("");
  const [displayedTab, setDisplayedTab] = useState(activeTab);

  useEffect(() => {
    if (activeTab === prevTabRef.current) return;
    setAnimClass("retro-glitch-exit");
    const t = setTimeout(() => {
      setDisplayedTab(activeTab);
      setAnimClass("retro-glitch-enter");
      const t2 = setTimeout(() => setAnimClass(""), 350);
      return () => clearTimeout(t2);
    }, 120);
    prevTabRef.current = activeTab;
    return () => clearTimeout(t);
  }, [activeTab]);

  // ═══════════════════════════════════════════════════════════════
  // RENDER: MAIN
  // ═══════════════════════════════════════════════════════════════

  const renderTabContent = () => {
    if (selectedSession) return renderSessionDetail();
    const tab = displayedTab;
    // If a category is selected, render that category
    if (tab !== "home") {
      switch (tab) {
        case "dashboard": return renderDashboard();
        case "sessions": return renderSessionsList();
        case "activites": return (
          <BobbyStore
            childName={settings.childName}
            childAge={settings.childAge}
          />
        );
        case "profil": return renderReglages();
        case "personnalisation": return (
          <BobbyCustomizer
            settings={settings}
            onUpdate={(key, value) => updateSetting(key, value)}
            onBack={() => setActiveTab("home")}
            onSave={() => { onSettingsChange?.(settings); setSettingsSaved(true); setTimeout(() => setSettingsSaved(false), 2000); }}
            saved={settingsSaved}
          />
        );
        case "reglages": return renderReglages();
        case "cloud": return renderCloud();
        case "confidentialite": return renderConfidentialite();
        default: return renderDashboard();
      }
    }

    // ─── HOME: Card Grid ───
    const categoryCards: { id: Tab; emoji: string; label: string; desc: string; color: string; badge?: number }[] = [
      { id: "dashboard", emoji: "📊", label: "Tableau de bord", desc: "Vue d'ensemble", color: "from-primary/20 to-primary/5" },
      { id: "sessions", emoji: "💬", label: "Sessions", desc: `${sessions.length} conversations`, color: "from-accent/30 to-accent/5", badge: sessions.filter(s => !analyses.some(a => a.session_id === s.id)).length || undefined },
      { id: "activites", emoji: "🛒", label: "Bobby Store", desc: "Contenus & activités", color: "from-secondary/30 to-secondary/5", badge: undefined },
      { id: "cloud", emoji: "☁️", label: "Bobby Cloud", desc: cloudProfile ? "Synchronisé ✅" : "Sauvegarder", color: "from-blue-500/20 to-purple-400/10" },
      { id: "profil", emoji: "👤", label: "Profil enfant", desc: "Intérêts & mémoire", color: "from-primary/15 to-primary/3" },
      { id: "reglages", emoji: "⚙️", label: "Réglages", desc: "Voix, contenu, limites", color: "from-muted to-muted/30" },
      { id: "confidentialite", emoji: "🔒", label: "Confidentialité", desc: "Données & sécurité", color: "from-destructive/10 to-destructive/3" },
    ];

    // ─── Daily summary data ───
    const today = new Date().toLocaleDateString("fr-FR");
    const todaySessions = sessions.filter(s => new Date(s.started_at).toLocaleDateString("fr-FR") === today);
    const todayMessages = todaySessions.reduce((a, s) => a + s.message_count, 0);
    const todayDuration = todaySessions.reduce((a, s) => a + (s.duration_seconds || 0), 0);
    const todayEmotions = todaySessions.flatMap(s => s.detected_emotions || []);
    const topEmotion = todayEmotions.length > 0
      ? Object.entries(todayEmotions.reduce((acc, e) => { acc[e] = (acc[e] || 0) + 1; return acc; }, {} as Record<string, number>))
          .sort(([, a], [, b]) => b - a)[0]
      : null;
    const todayAnalyses = todaySessions.map(s => analyses.find(a => a.session_id === s.id)).filter(Boolean);
    const avgEngagement = todayAnalyses.length > 0
      ? todayAnalyses.filter(a => a!.engagement_level === "high").length / todayAnalyses.length
      : 0;

    return (
      <div className="p-4 space-y-4" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif" }}>
        {/* Quick alerts */}
        {unreadAlertCount > 0 && (
          <button onClick={() => setShowNotifPanel(true)}
            className="w-full retro-card p-3 flex items-center gap-3 hover:translate-y-[-2px] transition-all" style={{ backgroundColor: 'var(--retro-red)' }}>
            <span className="text-xl">🔔</span>
            <div className="flex-1 text-left">
              <p className="text-[13px] font-black text-gray-800">{unreadAlertCount} alerte{unreadAlertCount > 1 ? "s" : ""}</p>
              <p className="text-[10px] text-gray-600 font-bold">Touchez pour voir</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-800" />
          </button>
        )}

        {/* ── Hero: Daily Summary — retro card ── */}
        <div className="hero-fade-in retro-card p-5" style={{ backgroundColor: 'var(--retro-blue)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[22px] font-black text-gray-800">Bonjour 👋</h2>
              <p className="text-[12px] text-gray-600 font-bold mt-0.5">
                {todaySessions.length > 0
                  ? `${displayName} a eu ${todaySessions.length} session${todaySessions.length > 1 ? "s" : ""} aujourd'hui`
                  : `${displayName} n'a pas encore parlé à Bobby`
                }
              </p>
            </div>
            <div className="text-[42px] drop-shadow-md">{todaySessions.length > 0 ? (topEmotion ? (emotionLabels[topEmotion[0]]?.emoji || "😊") : "😊") : "💤"}</div>
          </div>

          {todaySessions.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {[
                { emoji: "💬", value: todayMessages, label: "Messages", bg: "var(--retro-green)" },
                { emoji: "⏱️", value: todayDuration >= 60 ? `${Math.round(todayDuration / 60)}m` : `${todayDuration}s`, label: "Durée", bg: "var(--retro-yellow)" },
                { emoji: avgEngagement > 0.5 ? "🔥" : avgEngagement > 0 ? "👍" : "💤", value: avgEngagement > 0.5 ? "Fort" : avgEngagement > 0 ? "Bon" : "—", label: "Engage.", bg: "var(--retro-purple)" },
                { emoji: topEmotion ? (emotionLabels[topEmotion[0]]?.emoji || "😊") : "—", value: topEmotion ? (emotionLabels[topEmotion[0]]?.label || topEmotion[0]).slice(0, 5) : "—", label: "Émotion", bg: "var(--retro-red)" },
              ].map(s => (
                <div key={s.label} className="border-2 border-black py-2 px-1 text-center" style={{ backgroundColor: s.bg }}>
                  <span className="text-[14px] block">{s.emoji}</span>
                  <p className="text-[13px] font-black text-gray-800 leading-tight truncate">{s.value}</p>
                  <p className="text-[7px] text-gray-600 font-bold truncate">{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── 7-day Emotion Evolution Chart ── */}
        {(() => {
          const last7 = [...sessions]
            .filter(s => {
              const d = new Date(s.started_at);
              return d >= new Date(Date.now() - 7 * 86400000);
            })
            .sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime());

          const dayMap = new Map<string, { joy: number[]; sadness: number[]; curiosity: number[]; frustration: number[]; excitement: number[] }>();
          for (let i = 6; i >= 0; i--) {
            const d = new Date(Date.now() - i * 86400000);
            const key = d.toLocaleDateString("fr-FR", { weekday: "short" });
            dayMap.set(key, { joy: [], sadness: [], curiosity: [], frustration: [], excitement: [] });
          }

          last7.forEach(s => {
            const a = analyses.find(an => an.session_id === s.id);
            if (!a?.emotions) return;
            const key = new Date(s.started_at).toLocaleDateString("fr-FR", { weekday: "short" });
            const bucket = dayMap.get(key);
            if (!bucket) return;
            const emo = a.emotions as Record<string, number>;
            if (emo.joy) bucket.joy.push(emo.joy);
            if (emo.sadness) bucket.sadness.push(emo.sadness);
            if (emo.curiosity) bucket.curiosity.push(emo.curiosity);
            if (emo.frustration) bucket.frustration.push(emo.frustration);
            if (emo.excitement) bucket.excitement.push(emo.excitement);
          });

          const chartData = Array.from(dayMap.entries()).map(([day, vals]) => ({
            day,
            "😊 Joie": vals.joy.length ? Math.round(vals.joy.reduce((a, b) => a + b, 0) / vals.joy.length) : 0,
            "😢 Triste": vals.sadness.length ? Math.round(vals.sadness.reduce((a, b) => a + b, 0) / vals.sadness.length) : 0,
            "🧐 Curiosité": vals.curiosity.length ? Math.round(vals.curiosity.reduce((a, b) => a + b, 0) / vals.curiosity.length) : 0,
            "😤 Frustration": vals.frustration.length ? Math.round(vals.frustration.reduce((a, b) => a + b, 0) / vals.frustration.length) : 0,
            "🤩 Excitation": vals.excitement.length ? Math.round(vals.excitement.reduce((a, b) => a + b, 0) / vals.excitement.length) : 0,
          }));

          const hasAnyData = chartData.some(d => d["😊 Joie"] > 0 || d["😢 Triste"] > 0 || d["🧐 Curiosité"] > 0);

          return hasAnyData ? (
            <div className="hero-fade-in retro-card p-4" style={{ backgroundColor: 'var(--retro-purple)' }}>
              <h3 className="text-[16px] font-black text-gray-800 mb-2 flex items-center gap-2">
                <Activity className="w-5 h-5 text-gray-800" /> Émotions sur 7 jours
              </h3>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="emoJoy" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#facc15" stopOpacity={0.5}/><stop offset="100%" stopColor="#facc15" stopOpacity={0}/></linearGradient>
                    <linearGradient id="emoSad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#60a5fa" stopOpacity={0.5}/><stop offset="100%" stopColor="#60a5fa" stopOpacity={0}/></linearGradient>
                    <linearGradient id="emoCurio" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a78bfa" stopOpacity={0.5}/><stop offset="100%" stopColor="#a78bfa" stopOpacity={0}/></linearGradient>
                    <linearGradient id="emoFrust" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f87171" stopOpacity={0.5}/><stop offset="100%" stopColor="#f87171" stopOpacity={0}/></linearGradient>
                    <linearGradient id="emoExcite" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#34d399" stopOpacity={0.5}/><stop offset="100%" stopColor="#34d399" stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#000" opacity={0.15} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fontWeight: 800, fill: '#333' }} stroke="#333" />
                  <YAxis tick={{ fontSize: 10, fill: '#333' }} stroke="#333" domain={[0, 100]} />
                  <Tooltip contentStyle={{ border: '3px solid #000', borderRadius: 0, fontWeight: 700, fontSize: 12, boxShadow: '4px 4px 0 rgba(0,0,0,0.2)' }} />
                  <Area type="monotone" dataKey="😊 Joie" stroke="#facc15" fill="url(#emoJoy)" strokeWidth={2.5} dot={{ r: 3 }} />
                  <Area type="monotone" dataKey="😢 Triste" stroke="#60a5fa" fill="url(#emoSad)" strokeWidth={2} dot={{ r: 3 }} />
                  <Area type="monotone" dataKey="🧐 Curiosité" stroke="#a78bfa" fill="url(#emoCurio)" strokeWidth={2} dot={{ r: 3 }} />
                  <Area type="monotone" dataKey="😤 Frustration" stroke="#f87171" fill="url(#emoFrust)" strokeWidth={2} dot={{ r: 3 }} />
                  <Area type="monotone" dataKey="🤩 Excitation" stroke="#34d399" fill="url(#emoExcite)" strokeWidth={2} dot={{ r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : null;
        })()}

        {/* ── Navigation cards — retro grid ── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: "dashboard" as Tab, emoji: "📊", label: "Tableau de\nbord", bg: "var(--retro-blue)" },
            { id: "sessions" as Tab, emoji: "💬", label: "Sessions", bg: "var(--retro-green)",
              badge: sessions.filter(s => !analyses.some(a => a.session_id === s.id)).length || undefined },
            { id: "activites" as Tab, emoji: "🛒", label: "Bobby Store", bg: "var(--retro-yellow)" },
            { id: "personnalisation" as Tab, emoji: "🎨", label: "Personnaliser", bg: "var(--retro-red)" },
            { id: "cloud" as Tab, emoji: "☁️", label: "Bobby Cloud", bg: "var(--retro-purple)" },
            { id: "reglages" as Tab, emoji: "⚙️", label: "Réglages", bg: "#e5e5e5" },
          ].map((card, i) => (
            <button key={card.id} onClick={() => setActiveTab(card.id)}
              className={`card-stagger-${i + 1} retro-card retro-card-tilt relative p-3 flex flex-col items-center justify-center aspect-square hover:shadow-lg active:scale-95 transition-all`}
              style={{ backgroundColor: card.bg }}>
              <span className="text-[32px] mb-1 drop-shadow-sm">{card.emoji}</span>
              <span className="text-[11px] font-black text-gray-800 leading-tight text-center whitespace-pre-line">{card.label}</span>
              {card.badge && card.badge > 0 && (
                <span className="absolute top-1 right-1 min-w-[20px] h-[20px] px-1 bg-black text-white text-[9px] font-black flex items-center justify-center shadow-md">
                  {card.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const lightMode = true;

  return (
    <div className={`min-h-screen bg-background max-w-lg mx-auto flex flex-col transition-colors duration-300 ${lightMode ? "parent-light" : ""}`}>
      {/* Header — retro style */}
      <div className="flex items-center gap-3 px-4 py-3 bg-card border-b-4 border-black">
        <button
          onClick={selectedSession ? () => { setSelectedSession(null); setSelectedAnalysis(null); setSessionMessages([]); setPlayingAudio(null); setAudioProgress(0); setActiveMessageIdx(-1); if (audioRef.current) audioRef.current.pause(); if (progressInterval.current) clearInterval(progressInterval.current); } : activeTab !== "home" ? () => setActiveTab("home") : onClose}
          className="w-9 h-9 border-2 border-black bg-white flex items-center justify-center text-black hover:bg-muted transition-colors">
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-black text-foreground uppercase tracking-tight">
            {activeTab === "home" ? "BOBBY" : (tabs.find(t => t.id === activeTab)?.label || "BOBBY").toUpperCase()}
          </h2>
          <p className="text-[11px] text-muted-foreground font-bold">
            {selectedSession ? formatDate(selectedSession.started_at) : `${childName}`}
          </p>
        </div>
        {!selectedSession && (
          <div className="flex items-center gap-1.5">
            <button onClick={() => { setShowNotifPanel(!showNotifPanel); }}
              className="relative w-9 h-9 border-2 border-black bg-white flex items-center justify-center text-black hover:bg-muted transition-all">
              <Bell className="w-4 h-4" />
              {unreadAlertCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-destructive text-white text-[10px] font-bold flex items-center justify-center px-1 animate-pulse">
                  {unreadAlertCount}
                </span>
              )}
            </button>
            <button onClick={() => { loadData(); loadAlerts(); }} className="w-9 h-9 border-2 border-black bg-white flex items-center justify-center text-black">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Notification Panel */}
      {showNotifPanel && (
        <div className="absolute top-14 right-2 z-50 w-80 max-h-96 bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-destructive" />
              <h3 className="text-[13px] font-bold text-foreground">Notifications</h3>
              {unreadAlertCount > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-bold">{unreadAlertCount}</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadAlertCount > 0 && (
                <button onClick={markAllRead} className="text-[10px] text-primary font-semibold hover:underline">
                  Tout marquer lu
                </button>
              )}
              <button onClick={() => setShowNotifPanel(false)} className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="overflow-y-auto max-h-72">
            {parentAlerts.length === 0 ? (
              <div className="p-6 text-center">
                <span className="text-2xl">✅</span>
                <p className="text-[12px] text-muted-foreground mt-2">Aucune alerte</p>
              </div>
            ) : (
              parentAlerts.slice(0, 20).map(alert => {
                const severityConfig: Record<string, { icon: string; borderColor: string }> = {
                  critical: { icon: "🚨", borderColor: "border-l-destructive" },
                  high: { icon: "⚠️", borderColor: "border-l-destructive/60" },
                  medium: { icon: "🔔", borderColor: "border-l-accent" },
                  low: { icon: "ℹ️", borderColor: "border-l-muted-foreground" },
                };
                const cfg = severityConfig[alert.severity] || severityConfig.medium;
                const timeAgo = (() => {
                  const mins = Math.floor((Date.now() - new Date(alert.created_at).getTime()) / 60000);
                  if (mins < 60) return `il y a ${mins}min`;
                  const hrs = Math.floor(mins / 60);
                  if (hrs < 24) return `il y a ${hrs}h`;
                  return `il y a ${Math.floor(hrs / 24)}j`;
                })();
                return (
                  <button key={alert.id}
                    onClick={() => {
                      markAlertRead(alert.id);
                      const session = sessions.find(s => s.id === alert.session_id);
                      if (session) { analyzeSession(session); setShowNotifPanel(false); }
                    }}
                    className={`w-full text-left px-4 py-3 border-l-4 ${cfg.borderColor} ${!alert.is_read ? "bg-primary/5" : ""} hover:bg-muted/50 transition-colors border-b border-border/30`}>
                    <div className="flex items-start gap-2">
                      <span className="text-sm mt-0.5">{cfg.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-[12px] ${!alert.is_read ? "font-bold text-foreground" : "font-medium text-muted-foreground"} line-clamp-2`}>
                            {alert.message}
                          </p>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{alert.child_name} • {timeAgo}</p>
                      </div>
                      {!alert.is_read && <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* No tab bar — using card grid on home */}

      {/* Content */}
      <div ref={contentScrollRef} data-scroll-container className="flex-1 overflow-y-auto overflow-x-hidden">
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

      {/* Name Change Dialog — surnom vs session */}
      {pendingNameChange !== null && (
        <div className="fixed inset-0 z-[200] bg-black/40 flex items-center justify-center p-6" onClick={() => setPendingNameChange(null)}>
          <div className="bg-card rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-border/20 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <span className="text-4xl block mb-2">✏️</span>
              <h3 className="text-[18px] font-black text-foreground">Changer le prénom ?</h3>
              <p className="text-[13px] text-muted-foreground mt-1">
                <span className="font-bold">{childName}</span> → <span className="font-bold text-primary">{pendingNameChange}</span>
              </p>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={() => {
                  updateSetting("childName", pendingNameChange);
                  setPendingNameChange(null);
                  toast.success(`✅ Surnom changé en "${pendingNameChange}"`);
                }}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-extrabold text-[14px] hover:opacity-90 transition-all active:scale-95 shadow-md shadow-primary/20">
                🏷️ C'est un surnom
              </button>
              <button
                onClick={() => {
                  setPendingNameChange(null);
                  toast.info("🔜 Changement de session bientôt disponible !", {
                    description: "Cette fonctionnalité permettra de gérer plusieurs enfants.",
                  });
                }}
                className="w-full py-3.5 rounded-2xl bg-muted/60 text-foreground font-extrabold text-[14px] hover:bg-muted transition-all active:scale-95 border border-border/15">
                👦 Changer d'enfant <span className="text-[11px] font-bold text-muted-foreground ml-1">(bientôt)</span>
              </button>
              <button
                onClick={() => setPendingNameChange(null)}
                className="w-full py-2.5 text-[13px] text-muted-foreground font-bold hover:text-foreground transition-colors">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParentMode;
