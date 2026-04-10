import { useState, useEffect } from "react";
import { ArrowLeft, Clock, MessageSquare, Heart, Brain, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ParentModeProps {
  childName: string;
  onClose: () => void;
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
}

const emotionLabels: Record<string, { label: string; color: string }> = {
  happy: { label: "Joyeux", color: "bg-secondary text-secondary-foreground" },
  sad: { label: "Triste", color: "bg-accent text-accent-foreground" },
  scared: { label: "Effrayé", color: "bg-destructive/20 text-destructive" },
  excited: { label: "Excité", color: "bg-success/20 text-success" },
  bored: { label: "Ennuyé", color: "bg-muted text-muted-foreground" },
  curious: { label: "Curieux", color: "bg-primary/20 text-primary" },
};

const formatDuration = (seconds: number | null): string => {
  if (!seconds) return "—";
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}min ${secs}s`;
};

const formatDate = (date: string): string => {
  const d = new Date(date);
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const ParentMode = ({ childName, onClose }: ParentModeProps) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("child_sessions")
      .select("*")
      .eq("child_name", childName)
      .order("started_at", { ascending: false })
      .limit(20);

    if (!error && data) {
      setSessions(data);
    }
    setLoading(false);
  };

  const generateSummary = async (session: Session) => {
    setSelectedSession(session);
    if (session.ai_summary) {
      setSummary(session.ai_summary);
      return;
    }

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
        // Refresh sessions to get updated data
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
  const allEmotions = sessions.flatMap((s) => s.detected_emotions || []);
  const emotionCounts = allEmotions.reduce((acc, e) => {
    acc[e] = (acc[e] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 bg-card border-b border-border">
        <button
          onClick={selectedSession ? () => setSelectedSession(null) : onClose}
          className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-extrabold text-foreground">Mode Parent</h2>
          <p className="text-xs text-muted-foreground">
            {selectedSession ? formatDate(selectedSession.started_at) : `Interactions de ${childName}`}
          </p>
        </div>
        {!selectedSession && (
          <button onClick={loadSessions} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Session Detail */}
      {selectedSession ? (
        <div className="p-4 space-y-4">
          {/* Session stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-card rounded-2xl p-3 text-center border border-border">
              <Clock className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="text-xs text-muted-foreground">Durée</p>
              <p className="text-sm font-bold text-foreground">{formatDuration(selectedSession.duration_seconds)}</p>
            </div>
            <div className="bg-card rounded-2xl p-3 text-center border border-border">
              <MessageSquare className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="text-xs text-muted-foreground">Messages</p>
              <p className="text-sm font-bold text-foreground">{selectedSession.message_count}</p>
            </div>
            <div className="bg-card rounded-2xl p-3 text-center border border-border">
              <Heart className="w-5 h-5 mx-auto mb-1 text-accent" />
              <p className="text-xs text-muted-foreground">Émotions</p>
              <p className="text-sm font-bold text-foreground">{selectedSession.detected_emotions?.length || 0}</p>
            </div>
          </div>

          {/* Emotions */}
          {selectedSession.detected_emotions && selectedSession.detected_emotions.length > 0 && (
            <div className="bg-card rounded-2xl p-4 border border-border">
              <h3 className="text-sm font-bold text-foreground mb-2">Émotions détectées</h3>
              <div className="flex flex-wrap gap-2">
                {selectedSession.detected_emotions.map((e, i) => {
                  const info = emotionLabels[e] || { label: e, color: "bg-muted text-muted-foreground" };
                  return (
                    <span key={i} className={`px-3 py-1 rounded-full text-xs font-bold ${info.color}`}>
                      {info.label}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* AI Summary */}
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
              <button
                onClick={() => generateSummary(selectedSession)}
                className="text-sm text-primary font-bold hover:underline"
              >
                Générer l'analyse →
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Overview Stats */}
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

            {/* Emotion overview */}
            {Object.keys(emotionCounts).length > 0 && (
              <div className="bg-card rounded-2xl p-4 border border-border mb-6">
                <h3 className="text-sm font-bold text-foreground mb-2">Émotions fréquentes</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(emotionCounts)
                    .sort(([, a], [, b]) => b - a)
                    .map(([emotion, count]) => {
                      const info = emotionLabels[emotion] || { label: emotion, color: "bg-muted text-muted-foreground" };
                      return (
                        <span key={emotion} className={`px-3 py-1 rounded-full text-xs font-bold ${info.color}`}>
                          {info.label} ({count})
                        </span>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Session list */}
            <h3 className="text-sm font-bold text-foreground mb-3">Sessions récentes</h3>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">Aucune session enregistrée pour le moment.</p>
                <p className="text-xs mt-1">Les sessions apparaîtront ici après les conversations vocales.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => generateSummary(session)}
                    className="w-full bg-card rounded-2xl p-4 border border-border hover:border-primary transition-all text-left"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-foreground">
                        {formatDate(session.started_at)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDuration(session.duration_seconds)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {session.message_count} messages
                      </span>
                      {session.detected_emotions && session.detected_emotions.length > 0 && (
                        <div className="flex gap-1">
                          {session.detected_emotions.slice(0, 3).map((e, i) => {
                            const info = emotionLabels[e] || { label: e, color: "bg-muted text-muted-foreground" };
                            return (
                              <span key={i} className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${info.color}`}>
                                {info.label}
                              </span>
                            );
                          })}
                        </div>
                      )}
                      {session.ai_summary && (
                        <Brain className="w-3 h-3 text-primary ml-auto" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ParentMode;
