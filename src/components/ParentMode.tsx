import { useState, useEffect } from "react";
import { ArrowLeft, Clock, MessageSquare, Heart, Brain, Loader2, RefreshCw, Mic, BookOpen, Timer, Sparkles, Shield, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ParentModeProps {
  childName: string;
  onClose: () => void;
  parentSettings?: ParentSettings;
  onSettingsChange?: (settings: ParentSettings) => void;
}

export interface ParentSettings {
  personality: "balanced" | "calm" | "energetic" | "educational";
  contentFilter: "standard" | "strict";
  enabledThemes: string[];
  timeLimitMinutes: number | null;
  autoStop: boolean;
  voiceSpeed: "normal" | "slow" | "fast";
}

export const DEFAULT_PARENT_SETTINGS: ParentSettings = {
  personality: "balanced",
  contentFilter: "standard",
  enabledThemes: ["princesse", "pirate", "espace", "animaux", "éducatif"],
  timeLimitMinutes: null,
  autoStop: true,
  voiceSpeed: "normal",
};

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

const emotionLabels: Record<string, { label: string; color: string }> = {
  happy: { label: "Joyeux", color: "bg-secondary text-secondary-foreground" },
  sad: { label: "Triste", color: "bg-accent text-accent-foreground" },
  scared: { label: "Effrayé", color: "bg-destructive/20 text-destructive" },
  excited: { label: "Excité", color: "bg-secondary/60 text-secondary-foreground" },
  bored: { label: "Ennuyé", color: "bg-muted text-muted-foreground" },
  curious: { label: "Curieux", color: "bg-primary/20 text-primary" },
};

const ALL_THEMES = [
  { id: "princesse", label: "👑 Princesse" },
  { id: "pirate", label: "🏴‍☠️ Pirate" },
  { id: "espace", label: "🚀 Espace" },
  { id: "animaux", label: "🐉 Animaux" },
  { id: "éducatif", label: "🧠 Éducatif" },
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

type Tab = "sessions" | "voice" | "content" | "time" | "personality" | "security" | "profile";

const tabs: { id: Tab; icon: any; label: string }[] = [
  { id: "sessions", icon: MessageSquare, label: "Sessions" },
  { id: "content", icon: BookOpen, label: "Contenu" },
  { id: "personality", icon: Sparkles, label: "Perso" },
  { id: "voice", icon: Mic, label: "Voix" },
  { id: "time", icon: Timer, label: "Temps" },
  { id: "security", icon: Shield, label: "Sécurité" },
];

const ParentMode = ({ childName, onClose, parentSettings, onSettingsChange }: ParentModeProps) => {
  const [activeTab, setActiveTab] = useState<Tab>("sessions");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [settings, setSettings] = useState<ParentSettings>(parentSettings || DEFAULT_PARENT_SETTINGS);

  useEffect(() => { loadSessions(); }, []);

  const updateSetting = <K extends keyof ParentSettings>(key: K, value: ParentSettings[K]) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    onSettingsChange?.(next);
  };

  const toggleTheme = (theme: string) => {
    const themes = settings.enabledThemes.includes(theme)
      ? settings.enabledThemes.filter(t => t !== theme)
      : [...settings.enabledThemes, theme];
    updateSetting("enabledThemes", themes);
  };

  const loadSessions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("child_sessions")
      .select("*")
      .eq("child_name", childName)
      .order("started_at", { ascending: false })
      .limit(20);
    if (!error && data) setSessions(data);
    setLoading(false);
  };

  const generateSummary = async (session: Session) => {
    setSelectedSession(session);
    if (session.ai_summary) { setSummary(session.ai_summary); return; }
    setSummarizing(true);
    setSummary(null);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/summarize-session`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ sessionId: session.id }),
        }
      );
      if (response.ok) {
        const data = await response.json();
        setSummary(data.summary);
        loadSessions();
      } else {
        setSummary("Impossible de générer le résumé pour le moment.");
      }
    } catch {
      setSummary("Erreur lors de la génération du résumé.");
    } finally {
      setSummarizing(false);
    }
  };

  const totalSessions = sessions.length;
  const totalMessages = sessions.reduce((acc, s) => acc + s.message_count, 0);
  const totalDuration = sessions.reduce((acc, s) => acc + (s.duration_seconds || 0), 0);
  const allEmotions = sessions.flatMap(s => s.detected_emotions || []);
  const emotionCounts = allEmotions.reduce((acc, e) => { acc[e] = (acc[e] || 0) + 1; return acc; }, {} as Record<string, number>);

  const renderSessionDetail = () => (
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
          <Heart className="w-5 h-5 mx-auto mb-1 text-accent" />
          <p className="text-xs text-muted-foreground">Émotions</p>
          <p className="text-sm font-bold text-foreground">{selectedSession!.detected_emotions?.length || 0}</p>
        </div>
      </div>

      {selectedSession!.detected_emotions && selectedSession!.detected_emotions.length > 0 && (
        <div className="bg-card rounded-2xl p-4 border border-border">
          <h3 className="text-sm font-bold text-foreground mb-2">Émotions détectées</h3>
          <div className="flex flex-wrap gap-2">
            {selectedSession!.detected_emotions.map((e, i) => {
              const info = emotionLabels[e] || { label: e, color: "bg-muted text-muted-foreground" };
              return <span key={i} className={`px-3 py-1 rounded-full text-xs font-bold ${info.color}`}>{info.label}</span>;
            })}
          </div>
        </div>
      )}

      <div className="bg-card rounded-2xl p-4 border border-border">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Analyse IA</h3>
        </div>
        {summarizing ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Analyse en cours…</span>
          </div>
        ) : summary ? (
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{summary}</p>
        ) : (
          <button onClick={() => generateSummary(selectedSession!)} className="text-sm text-primary font-bold hover:underline">
            Générer l'analyse →
          </button>
        )}
      </div>
    </div>
  );

  const renderSessionsList = () => (
    <div className="p-4">
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-card rounded-2xl p-3 text-center border border-border">
          <p className="text-2xl font-extrabold text-primary">{totalSessions}</p>
          <p className="text-xs text-muted-foreground">Sessions</p>
        </div>
        <div className="bg-card rounded-2xl p-3 text-center border border-border">
          <p className="text-2xl font-extrabold text-primary">{totalMessages}</p>
          <p className="text-xs text-muted-foreground">Messages</p>
        </div>
        <div className="bg-card rounded-2xl p-3 text-center border border-border">
          <p className="text-2xl font-extrabold text-foreground">{formatDuration(totalDuration)}</p>
          <p className="text-xs text-muted-foreground">Temps total</p>
        </div>
      </div>

      {Object.keys(emotionCounts).length > 0 && (
        <div className="bg-card rounded-2xl p-4 border border-border mb-6">
          <h3 className="text-sm font-bold text-foreground mb-2">Émotions fréquentes</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(emotionCounts).sort(([, a], [, b]) => b - a).map(([emotion, count]) => {
              const info = emotionLabels[emotion] || { label: emotion, color: "bg-muted text-muted-foreground" };
              return <span key={emotion} className={`px-3 py-1 rounded-full text-xs font-bold ${info.color}`}>{info.label} ({count})</span>;
            })}
          </div>
        </div>
      )}

      <h3 className="text-sm font-bold text-foreground mb-3">Sessions récentes</h3>
      {loading ? (
        <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">Aucune session enregistrée.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map(session => (
            <button key={session.id} onClick={() => generateSummary(session)}
              className="w-full bg-card rounded-2xl p-4 border border-border hover:border-primary transition-all text-left">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-foreground">{formatDate(session.started_at)}</span>
                <span className="text-xs text-muted-foreground">{formatDuration(session.duration_seconds)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{session.message_count} messages</span>
                {session.detected_emotions?.slice(0, 3).map((e, i) => {
                  const info = emotionLabels[e] || { label: e, color: "bg-muted text-muted-foreground" };
                  return <span key={i} className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${info.color}`}>{info.label}</span>;
                })}
                {session.ai_summary && <Brain className="w-3 h-3 text-primary ml-auto" />}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const renderVoiceTab = () => (
    <div className="p-4 space-y-4">
      <div className="bg-card rounded-2xl p-4 border border-border">
        <h3 className="text-sm font-bold text-foreground mb-3">Vitesse de la voix</h3>
        <div className="flex gap-2">
          {([["slow", "Lent"], ["normal", "Normal"], ["fast", "Rapide"]] as const).map(([val, label]) => (
            <button key={val} onClick={() => updateSetting("voiceSpeed", val)}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${settings.voiceSpeed === val ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderContentTab = () => (
    <div className="p-4 space-y-4">
      <div className="bg-card rounded-2xl p-4 border border-border">
        <h3 className="text-sm font-bold text-foreground mb-3">Thèmes d'histoires</h3>
        <div className="space-y-2">
          {ALL_THEMES.map(theme => (
            <button key={theme.id} onClick={() => toggleTheme(theme.id)}
              className={`w-full flex items-center justify-between p-3 rounded-xl text-sm font-bold transition-all ${
                settings.enabledThemes.includes(theme.id) ? "bg-primary/10 text-primary border border-primary/30" : "bg-muted text-muted-foreground"
              }`}>
              <span>{theme.label}</span>
              <span className="text-xs">{settings.enabledThemes.includes(theme.id) ? "✓ Activé" : "Désactivé"}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderTimeTab = () => (
    <div className="p-4 space-y-4">
      <div className="bg-card rounded-2xl p-4 border border-border">
        <h3 className="text-sm font-bold text-foreground mb-3">Limite de temps</h3>
        <div className="flex gap-2 flex-wrap">
          {([null, 10, 20, 30, 60] as const).map(val => (
            <button key={String(val)} onClick={() => updateSetting("timeLimitMinutes", val)}
              className={`py-2 px-4 rounded-xl text-sm font-bold transition-all ${settings.timeLimitMinutes === val ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {val === null ? "Illimité" : `${val} min`}
            </button>
          ))}
        </div>
      </div>
      <div className="bg-card rounded-2xl p-4 border border-border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground">Arrêt automatique</h3>
            <p className="text-xs text-muted-foreground">Arrêt après 40s de silence</p>
          </div>
          <button onClick={() => updateSetting("autoStop", !settings.autoStop)}
            className={`w-12 h-7 rounded-full transition-all ${settings.autoStop ? "bg-primary" : "bg-muted"}`}>
            <div className={`w-5 h-5 rounded-full bg-card shadow transition-transform ${settings.autoStop ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>
      </div>
    </div>
  );

  const renderPersonalityTab = () => (
    <div className="p-4 space-y-4">
      <div className="bg-card rounded-2xl p-4 border border-border">
        <h3 className="text-sm font-bold text-foreground mb-3">Style de personnalité</h3>
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
      </div>
    </div>
  );

  const renderSecurityTab = () => (
    <div className="p-4 space-y-4">
      <div className="bg-card rounded-2xl p-4 border border-border">
        <h3 className="text-sm font-bold text-foreground mb-3">Filtre de contenu</h3>
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
      </div>
    </div>
  );

  const renderTabContent = () => {
    if (selectedSession) return renderSessionDetail();
    switch (activeTab) {
      case "sessions": return renderSessionsList();
      case "voice": return renderVoiceTab();
      case "content": return renderContentTab();
      case "time": return renderTimeTab();
      case "personality": return renderPersonalityTab();
      case "security": return renderSecurityTab();
      default: return renderSessionsList();
    }
  };

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 bg-card border-b border-border">
        <button
          onClick={selectedSession ? () => { setSelectedSession(null); setSummary(null); } : onClose}
          className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-extrabold text-foreground">Mode Parent</h2>
          <p className="text-xs text-muted-foreground">
            {selectedSession ? formatDate(selectedSession.started_at) : `Paramètres de ${childName}`}
          </p>
        </div>
        {activeTab === "sessions" && !selectedSession && (
          <button onClick={loadSessions} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Tab bar */}
      {!selectedSession && (
        <div className="flex border-b border-border bg-card overflow-x-auto">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-0 flex flex-col items-center gap-1 py-3 px-2 text-[10px] font-bold transition-all ${
                activeTab === tab.id ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
              }`}>
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
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
