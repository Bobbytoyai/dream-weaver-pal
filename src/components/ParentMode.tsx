import { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowLeft, Clock, MessageSquare, Heart, Brain, Loader2, RefreshCw,
  Mic, BookOpen, Timer, Sparkles, Shield, Camera, Volume2, VolumeX,
  Play, Pause, AlertTriangle, TrendingUp, Trash2, ChevronRight, Gamepad2,
  BarChart3, Calendar, User, Zap, Moon, Sun, Hand, Lock, Search,
  Download, ToggleLeft, Settings, Eye, EyeOff, FileText, Tag, X, CloudUpload, LogIn,
  SkipForward, SkipBack, Activity, Bell, ChevronDown, ChevronLeft, Star, Edit3
} from "lucide-react";
const LazyDashboardTab = lazy(() => import("@/components/parent/DashboardTab"));
const LazySessionsListTab = lazy(() => import("@/components/parent/SessionsListTab"));
const LazySessionDetailView = lazy(() => import("@/components/parent/SessionDetailView"));
const LazyReglagesTab = lazy(() => import("@/components/parent/ReglagesTab"));
const LazyConfidentialiteTab = lazy(() => import("@/components/parent/ConfidentialiteTab"));
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { getInterestSnapshot, INTEREST_KEYWORDS_PUBLIC } from "@/lib/bobby/interestTracker";
import { supabase } from "@/integrations/supabase/client";
import StoryLibrary from "@/components/StoryLibrary";
import ContentCategories from "@/components/ContentCategories";
import BobbyStore from "@/components/BobbyStore";
import StoreGateWrapper from "@/components/StoreGateWrapper";
// VoiceSettings, BobbyCustomizer, LimitsSettings now lazy-loaded via ReglagesTab
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
  const navigate = useNavigate();
  const { user } = useAuth();
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
    if (!user) {
      navigate("/bobby-cloud?returnTo=/");
      return;
    }
    setCloudLoading(true);
    try {
      const result = await saveToCloud(displayName, settings, undefined, user.id);
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
    if (!user) {
      navigate("/bobby-cloud?returnTo=/");
      return;
    }
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
  // RENDER: SESSION DETAIL
  // ═══════════════════════════════════════════════════════════════
  // SESSION DETAIL + SESSIONS LIST: extracted to SessionDetailView + SessionsListTab
  // ═══════════════════════════════════════════════════════════════
  // PROFIL: extracted to ProfilTab.tsx
  // RÉGLAGES: extracted to ReglagesTab.tsx
  const handleSave = () => {
    onSettingsChange?.(settings);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2000);
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

  // CONFIDENTIALITÉ: extracted to ConfidentialiteTab.tsx

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

      {/* ── STATUS BANNER ── */}
      {cloudLoading && (
        <div className="retro-card p-4 flex items-center gap-3 animate-pulse" style={{ backgroundColor: 'var(--retro-yellow)' }}>
          <Loader2 className="w-6 h-6 animate-spin text-gray-800" />
          <div>
            <p className="text-[14px] font-black text-gray-800 uppercase">Synchronisation en cours…</p>
            <p className="text-[11px] text-gray-600 font-bold">Veuillez patienter quelques secondes.</p>
          </div>
        </div>
      )}

      {!cloudLoading && !user && !cloudProfile && (
        <div className="retro-card p-4 flex items-center gap-3" style={{ backgroundColor: 'var(--retro-red)', opacity: 0.9 }}>
          <span className="text-2xl">🔒</span>
          <div>
            <p className="text-[14px] font-black text-gray-800 uppercase">Connexion requise</p>
            <p className="text-[11px] text-gray-600 font-bold">Créez un compte ou connectez-vous pour activer Bobby Cloud.</p>
          </div>
        </div>
      )}

      {!cloudLoading && user && !cloudProfile && (
        <div className="retro-card p-4 flex items-center gap-3" style={{ backgroundColor: 'var(--retro-yellow)', opacity: 0.9 }}>
          <span className="text-2xl">⚡</span>
          <div>
            <p className="text-[14px] font-black text-gray-800 uppercase">Cloud non activé</p>
            <p className="text-[11px] text-gray-600 font-bold">Connecté en tant que {user.email} — activez la synchronisation ci-dessous.</p>
          </div>
        </div>
      )}

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
                <p className="text-[12px] text-gray-600 font-bold mt-0.5">Inscription avec email et mot de passe</p>
              </div>
            </div>
          </button>

          <button onClick={() => navigate("/bobby-cloud?returnTo=/")} disabled={cloudLoading}
            className="w-full retro-card p-5 hover:translate-y-[-2px] transition-all active:scale-[0.98] disabled:opacity-50" style={{ backgroundColor: 'var(--retro-green)' }}>
            <div className="flex items-center gap-4">
              <LogIn className="w-9 h-9 text-gray-800" />
              <div className="text-left flex-1">
                <h3 className="text-[16px] font-black text-gray-800 uppercase">J'ai déjà un compte</h3>
                <p className="text-[12px] text-gray-600 font-bold mt-0.5">Se connecter avec email et mot de passe</p>
              </div>
            </div>
          </button>
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

      {/* ── COÛT PAR UTILISATEUR (transparence) ── */}
      <div className="retro-card p-4" style={{ backgroundColor: "var(--retro-yellow)" }}>
        <h3 className="text-[14px] font-black text-gray-800 mb-3 uppercase">💰 Coût infrastructure par user/mois</h3>
        <div className="space-y-2">
          {[
            {
              label: "🟢 Scénario bas (user léger)",
              desc: "~10 sessions/mois, 50 messages, 0 analyse IA",
              cost: "~0,0003 €",
              detail: "DB: 0,0001€ • Auth: 0,0001€ • Storage: 0,0001€",
            },
            {
              label: "🔴 Scénario haut (user actif)",
              desc: "~60 sessions/mois, 500 messages, 10 analyses IA, 5 packs Store",
              cost: "~0,025 €",
              detail: "DB: 0,005€ • Auth: 0,0001€ • Storage: 0,005€ • Edge Fn: 0,01€ • AI: 0,005€",
            },
          ].map(s => (
            <div key={s.label} className="border-2 border-black bg-white p-3">
              <p className="text-[12px] font-black text-gray-800">{s.label}</p>
              <p className="text-[10px] text-gray-600 font-bold mt-0.5">{s.desc}</p>
              <p className="text-[16px] font-black text-gray-900 mt-1">{s.cost}</p>
              <p className="text-[9px] text-gray-500 font-bold mt-0.5">{s.detail}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 border-t-2 border-black/10 pt-2">
          <p className="text-[10px] text-gray-600 font-bold leading-relaxed">
            📊 À 100k users : <strong>25€ → 2 500€/mois</strong> d'infra selon activité.
            Marge nette estimée : <strong>95-99%</strong> sur les abonnements Cloud (4,99-9,99€/user).
          </p>
        </div>
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
  
  const [displayedTab, setDisplayedTab] = useState(activeTab);

  useEffect(() => {
    if (activeTab === prevTabRef.current) return;
    setDisplayedTab(activeTab);
    prevTabRef.current = activeTab;
  }, [activeTab]);

  // ═══════════════════════════════════════════════════════════════
  // RENDER: MAIN
  // ═══════════════════════════════════════════════════════════════

  const renderTabContent = () => {
    if (selectedSession) return (
      <Suspense fallback={<div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>}>
        <LazySessionDetailView
          session={selectedSession}
          analysis={selectedAnalysis || analyses.find(a => a.session_id === selectedSession.id) || null}
          analyses={analyses}
          sessionMessages={sessionMessages}
          analyzing={analyzing}
          displayName={displayName}
          analyzeSession={analyzeSession}
          toggleFavorite={toggleFavorite}
          exportSessionPDF={exportSessionPDF}
          deleteSession={deleteSession}
          saveParentNote={saveParentNote}
          onCloudSave={handleCloudSave}
          setConfirmDialog={setConfirmDialog}
          playingAudio={playingAudio}
          audioProgress={audioProgress}
          audioDuration={audioDuration}
          audioSpeed={audioSpeed}
          activeMessageIdx={activeMessageIdx}
          playAudio={playAudio}
          seekAudio={seekAudio}
          skipAudio={skipAudio}
          setAudioSpeed={setAudioSpeed}
        />
      </Suspense>
    );
    const tab = displayedTab;
    // If a category is selected, render that category
    if (tab !== "home") {
      switch (tab) {
        case "dashboard": return (
          <Suspense fallback={<div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>}>
            <LazyDashboardTab
              sessions={sessions}
              analyses={analyses}
              displayName={displayName}
              safetyAlerts={safetyAlerts}
              showSafetyAlerts={showSafetyAlerts}
              setShowSafetyAlerts={setShowSafetyAlerts}
              clearSafetyAlerts={() => { clearSafetyAlertRecords(); setSafetyAlerts([]); }}
            />
          </Suspense>
        );
        case "sessions": return (
          <Suspense fallback={<div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>}>
            <LazySessionsListTab
              sessions={sessions}
              analyses={analyses}
              loading={loading}
              displayName={displayName}
              tagFilter={tagFilter}
              setTagFilter={setTagFilter}
              sessionFavFilter={sessionFavFilter}
              setSessionFavFilter={setSessionFavFilter}
              sessionSearch={sessionSearch}
              setSessionSearch={setSessionSearch}
              analyzeSession={analyzeSession}
              groupedSessions={groupedSessions}
            />
          </Suspense>
        );
        case "activites": return <StoreGateWrapper childName={settings.childName} childAge={settings.childAge} />;
        case "profil":
        case "reglages": return (
          <Suspense fallback={<div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>}>
            <LazyReglagesTab
              settings={settings}
              sessions={sessions}
              childName={childName}
              allInterests={allInterests}
              settingsSaved={settingsSaved}
              reglagesSection={reglagesSection}
              setReglagesSection={setReglagesSection}
              onUpdate={updateSetting}
              onUpdateNested={updateNested}
              onSave={handleSave}
              onPendingNameChange={(name) => setPendingNameChange(name)}
            />
          </Suspense>
        );
        case "cloud": return renderCloud();
        case "confidentialite": return (
          <Suspense fallback={<div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>}>
            <LazyConfidentialiteTab
              settings={settings}
              sessions={sessions}
              analyses={analyses}
              displayName={displayName}
              childName={childName}
              onUpdate={updateSetting}
              setConfirmDialog={setConfirmDialog}
              setActiveTab={(tab: string) => setActiveTab(tab as any)}
              loadData={loadData}
            />
          </Suspense>
        );
        default: return (
          <Suspense fallback={<div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>}>
            <LazyDashboardTab
              sessions={sessions}
              analyses={analyses}
              displayName={displayName}
              safetyAlerts={safetyAlerts}
              showSafetyAlerts={showSafetyAlerts}
              setShowSafetyAlerts={setShowSafetyAlerts}
              clearSafetyAlerts={() => { clearSafetyAlertRecords(); setSafetyAlerts([]); }}
            />
          </Suspense>
        );
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
        <div className="grid grid-cols-2 gap-3">
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
              className={`card-stagger-${i + 1} retro-card relative p-3 flex flex-col items-center justify-center aspect-square active:scale-95 transition-all`}
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
        <div className="absolute top-14 right-2 z-50 w-80 max-h-96 bg-white border-4 border-black overflow-hidden" style={{ boxShadow: "6px 6px 0px rgba(0,0,0,0.25)" }}>
          <div className="flex items-center justify-between px-4 py-3 border-b-2 border-black">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-foreground" />
              <h3 className="text-[13px] font-black text-foreground uppercase">Notifications</h3>
              {unreadAlertCount > 0 && (
                <span className="text-[10px] px-2 py-0.5 border-2 border-black bg-[var(--retro-red)] text-foreground font-black">{unreadAlertCount}</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadAlertCount > 0 && (
                <button onClick={markAllRead} className="text-[10px] text-foreground font-black hover:underline uppercase">
                  Tout lu
                </button>
              )}
              <button onClick={() => setShowNotifPanel(false)} className="w-7 h-7 border border-black flex items-center justify-center text-foreground hover:bg-[var(--retro-yellow)]">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="overflow-y-auto max-h-72">
            {parentAlerts.length === 0 ? (
              <div className="p-6 text-center">
                <span className="text-2xl">✅</span>
                <p className="text-[12px] text-foreground/60 mt-2 font-bold">Aucune alerte</p>
              </div>
            ) : (
              parentAlerts.slice(0, 20).map(alert => {
                const severityConfig: Record<string, { icon: string; bg: string }> = {
                  critical: { icon: "🚨", bg: "bg-[var(--retro-red)]" },
                  high: { icon: "⚠️", bg: "bg-[var(--retro-orange)]" },
                  medium: { icon: "🔔", bg: "bg-[var(--retro-yellow)]" },
                  low: { icon: "ℹ️", bg: "bg-white" },
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
                    className={`w-full text-left px-4 py-3 border-b-2 border-black/15 ${!alert.is_read ? cfg.bg : ""} hover:bg-[var(--retro-yellow)] transition-colors`}>
                    <div className="flex items-start gap-2">
                      <span className="text-sm mt-0.5">{cfg.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[12px] ${!alert.is_read ? "font-black text-foreground" : "font-bold text-foreground/60"} line-clamp-2`}>
                          {alert.message}
                        </p>
                        <p className="text-[10px] text-foreground/50 mt-0.5 font-bold">{alert.child_name} • {timeAgo}</p>
                      </div>
                      {!alert.is_read && <span className="w-2 h-2 bg-foreground mt-1.5 shrink-0" />}
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
        <div className="tab-content-wrapper">
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
          <div className="bg-white border-4 border-black p-6 w-full max-w-sm space-y-4" style={{ boxShadow: "8px 8px 0px rgba(0,0,0,0.3)" }} onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <span className="text-4xl block mb-2">✏️</span>
              <h3 className="text-[18px] font-black text-foreground uppercase">Changer le prénom ?</h3>
              <p className="text-[13px] text-foreground/60 mt-1 font-bold">
                <span className="font-black">{childName}</span> → <span className="font-black">{pendingNameChange}</span>
              </p>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={() => {
                  updateSetting("childName", pendingNameChange);
                  setPendingNameChange(null);
                  toast.success(`✅ Surnom changé en "${pendingNameChange}"`);
                }}
                className="w-full py-3.5 border-4 border-black bg-foreground text-background font-black text-[14px] hover:opacity-90 transition-all active:scale-95 uppercase"
                style={{ boxShadow: "4px 4px 0px rgba(0,0,0,0.2)" }}>
                🏷️ C'EST UN SURNOM
              </button>
              <button
                onClick={() => {
                  setPendingNameChange(null);
                  toast.info("🔜 Changement de session bientôt disponible !", {
                    description: "Cette fonctionnalité permettra de gérer plusieurs enfants.",
                  });
                }}
                className="w-full py-3.5 border-4 border-black bg-white text-foreground font-black text-[14px] hover:bg-[var(--retro-yellow)] transition-all active:scale-95 uppercase"
                style={{ boxShadow: "3px 3px 0px rgba(0,0,0,0.15)" }}>
                👦 CHANGER D'ENFANT <span className="text-[11px] font-bold text-foreground/50 ml-1">(bientôt)</span>
              </button>
              <button
                onClick={() => setPendingNameChange(null)}
                className="w-full py-2.5 text-[13px] text-foreground/60 font-black hover:text-foreground transition-colors uppercase">
                ANNULER
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParentMode;
