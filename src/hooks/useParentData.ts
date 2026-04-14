import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  loadParentDashboardSnapshot,
  loadParentSessionMessages,
  requestParentSessionAnalysis,
  type ParentAnalysis as Analysis,
  type ParentSession as Session,
  type ParentSessionMessage,
} from "@/lib/bobby/parentDashboard";
import { ParentSettings, DEFAULT_PARENT_SETTINGS } from "@/components/parentSettings";
import { getSafetyAlertRecords, clearSafetyAlertRecords, type SafetyAlertRecord } from "@/lib/offlineEngine";
import { eventBus } from "@/lib/eventBus";
import {
  saveToCloud, getCloudProfile, deleteCloudProfile,
  type CloudProfile,
} from "@/lib/bobby/cloudSync";
import { formatDate, formatDuration, emotionScoreLabels } from "@/components/parent/parentTypes";

// ─── Types ──────────────────────────────────────────────────────

interface UseParentDataParams {
  childName: string;
  bobbyCodeId?: string;
  parentSettings?: ParentSettings;
  onSettingsChange?: (s: ParentSettings) => void;
  onNavigateTab?: (tab: string) => void;
}

type ParentAlert = {
  id: string; session_id: string; child_name: string; alert_type: string;
  severity: string; message: string; context: string | null; is_read: boolean; created_at: string;
};

// ─── Hook ───────────────────────────────────────────────────────

export function useParentData({ childName, bobbyCodeId, parentSettings, onSettingsChange, onNavigateTab }: UseParentDataParams) {
  const navigate = useNavigate();
  const { user } = useAuth();

  // ── Core data ──
  const [sessions, setSessions] = useState<Session[]>([]);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Selection ──
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<Analysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [sessionMessages, setSessionMessages] = useState<ParentSessionMessage[]>([]);

  // ── Settings ──
  const [settings, setSettings] = useState<ParentSettings>(() => ({
    ...DEFAULT_PARENT_SETTINGS,
    ...(parentSettings || {}),
    contentModes: { ...DEFAULT_PARENT_SETTINGS.contentModes, ...(parentSettings?.contentModes || {}) },
    nightMode: { ...DEFAULT_PARENT_SETTINGS.nightMode, ...(parentSettings?.nightMode || {}) },
    interactions: { ...DEFAULT_PARENT_SETTINGS.interactions, ...(parentSettings?.interactions || {}) },
  }));
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [reglagesSection, setReglagesSection] = useState<"voix" | "limites" | "personnalisation" | "profil" | null>(null);
  const [pendingNameChange, setPendingNameChange] = useState<string | null>(null);

  // ── Filters ──
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [sessionSearch, setSessionSearch] = useState("");
  const [sessionFavFilter, setSessionFavFilter] = useState(false);

  // ── Alerts ──
  const [safetyAlerts, setSafetyAlerts] = useState<SafetyAlertRecord[]>([]);
  const [showSafetyAlerts, setShowSafetyAlerts] = useState(true);
  const [parentAlerts, setParentAlerts] = useState<ParentAlert[]>([]);

  // ── Cloud ──
  const [cloudProfile, setCloudProfile] = useState<CloudProfile | null>(null);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [cloudCopied, setCloudCopied] = useState(false);

  // ── Dialog ──
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string; description: string; confirmLabel?: string;
    variant?: "danger" | "warning"; onConfirm: () => void;
  } | null>(null);

  // ── Derived ──
  const displayName = settings.childName || childName;
  const unreadAlertCount = parentAlerts.filter(a => !a.is_read).length;

  // ═══════════════════════════════════════════════════════════════
  // DATA LOADING
  // ═══════════════════════════════════════════════════════════════

  const loadData = async () => {
    setLoading(true);
    const snapshot = await loadParentDashboardSnapshot(50, bobbyCodeId);
    setSessions(snapshot.sessions.filter(s => s.message_count > 0));
    setAnalyses(snapshot.analyses);
    setLoading(false);
  };

  const loadAlerts = async () => {
    try {
      let query = supabase
        .from("parent_alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (bobbyCodeId) query = query.eq("user_id", bobbyCodeId);
      const { data } = await query;
      if (data) setParentAlerts(data as ParentAlert[]);
    } catch (e) { console.warn("Failed to load alerts:", e); }
  };

  const loadCloudProfile = async () => {
    const profile = await getCloudProfile();
    setCloudProfile(profile);
  };

  // Stagger loads to reduce auth contention
  useEffect(() => {
    loadData();
    const t1 = setTimeout(() => loadAlerts(), 300);
    const t2 = setTimeout(() => loadCloudProfile(), 600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // REALTIME: Listen for new parent_alerts (push notifications)
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!user?.id) return;

    // Request browser notification permission on mount
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const channel = supabase
      .channel("parent-alerts-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "parent_alerts",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newAlert = payload.new as ParentAlert;
          // Add to local state
          setParentAlerts(prev => [newAlert, ...prev]);

          // Show in-app toast
          const severityEmoji = newAlert.severity === "critical" ? "🚨" : newAlert.severity === "high" ? "⚠️" : "🔔";
          toast.error(`${severityEmoji} ${newAlert.message}`, {
            duration: 10000,
            action: {
              label: "Voir",
              onClick: () => {
                onNavigateTab?.("sessions");
              },
            },
          });

          // Browser push notification (works even in background tab)
          if ("Notification" in window && Notification.permission === "granted") {
            try {
              const notif = new Notification(`Bobby — Alerte ${newAlert.severity === "critical" ? "CRITIQUE" : "importante"}`, {
                body: newAlert.message,
                icon: "/placeholder.svg",
                tag: `bobby-alert-${newAlert.id}`,
                requireInteraction: newAlert.severity === "critical",
              });
              notif.onclick = () => {
                window.focus();
                onNavigateTab?.("sessions");
              };
            } catch (e) {
              console.warn("Browser notification failed:", e);
            }
          }

          // Play alert sound for critical
          if (newAlert.severity === "critical") {
            try {
              const ctx = new AudioContext();
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.frequency.value = 880;
              gain.gain.value = 0.3;
              osc.start();
              osc.stop(ctx.currentTime + 0.3);
              setTimeout(() => {
                const osc2 = ctx.createOscillator();
                osc2.connect(gain);
                osc2.frequency.value = 1100;
                osc2.start();
                osc2.stop(ctx.currentTime + 0.3);
              }, 350);
            } catch { /* audio not available */ }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, onNavigateTab]);

  // ═══════════════════════════════════════════════════════════════
  // SAFETY ALERTS (eventBus)
  // ═══════════════════════════════════════════════════════════════

  useEffect(() => {
    setSafetyAlerts(getSafetyAlertRecords());
    const handleStorage = () => setSafetyAlerts(getSafetyAlertRecords());
    window.addEventListener("storage", handleStorage);

    const unsub = eventBus.on("SAFETY_ALERT", (event: any) => {
      setSafetyAlerts(getSafetyAlertRecords());
      setShowSafetyAlerts(true);
      const severityLabels: Record<string, string> = {
        CRITICAL: "🚨 ALERTE CRITIQUE", HIGH: "⚠️ Alerte importante", MEDIUM: "🔔 Alerte",
      };
      const label = severityLabels[event.severity] || "🔔 Alerte";
      toast.error(`${label} — ${event.childName}`, {
        description: `Catégorie: ${event.category} • "${event.fullText?.slice(0, 80)}…"`,
        duration: 15000,
        action: {
          label: "Voir",
          onClick: () => { onNavigateTab?.("dashboard"); setShowSafetyAlerts(true); },
        },
      });
    });

    return () => { window.removeEventListener("storage", handleStorage); unsub(); };
  }, [onNavigateTab]);

  const clearSafetyAlerts = () => { clearSafetyAlertRecords(); setSafetyAlerts([]); };

  // ═══════════════════════════════════════════════════════════════
  // CLOUD OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  const handleCloudSave = async () => {
    if (!user) { navigate("/bobby-cloud?returnTo=/"); return; }
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

  const handleCloudDelete = async () => {
    setCloudLoading(true);
    const ok = await deleteCloudProfile();
    setCloudLoading(false);
    if (ok) { setCloudProfile(null); toast.success("Profil Bobby Cloud supprimé"); }
  };

  // ═══════════════════════════════════════════════════════════════
  // ALERT OPERATIONS
  // ═══════════════════════════════════════════════════════════════

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

  // ═══════════════════════════════════════════════════════════════
  // SETTINGS
  // ═══════════════════════════════════════════════════════════════

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

  const handleSave = () => {
    onSettingsChange?.(settings);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2000);
  };

  // ═══════════════════════════════════════════════════════════════
  // SESSION ACTIONS
  // ═══════════════════════════════════════════════════════════════

  const analyzeSession = async (session: Session, forceReanalyze = false) => {
    setSelectedSession(session);
    setSessionMessages(await loadParentSessionMessages(session.id));
    if (!forceReanalyze) {
      const existing = analyses.find(a => a.session_id === session.id);
      if (existing?.summary) { setSelectedAnalysis(existing); return; }
    }
    setAnalyzing(true);
    setSelectedAnalysis(null);
    try {
      const analysis = await requestParentSessionAnalysis(session.id);
      if (analysis) { setSelectedAnalysis(analysis); loadData(); }
    } catch { /* ignore */ } finally { setAnalyzing(false); }
  };

  const deleteSession = async (sessionId: string) => {
    await supabase.from("conversation_analyses").delete().eq("session_id", sessionId);
    await supabase.from("session_messages").delete().eq("session_id", sessionId);
    await supabase.from("child_sessions").delete().eq("id", sessionId);
    await supabase.storage.from("conversation-audio").remove([`${sessionId}.webm`, `${sessionId}.mp4`]);
    loadData();
    setSelectedSession(null);
    setSelectedAnalysis(null);
  };

  const toggleFavorite = async (session: Session) => {
    const newVal = !session.is_favorite;
    await supabase.from("child_sessions").update({ is_favorite: newVal }).eq("id", session.id);
    setSessions(prev => prev.map(s => s.id === session.id ? { ...s, is_favorite: newVal } : s));
    if (selectedSession?.id === session.id) setSelectedSession({ ...selectedSession, is_favorite: newVal });
  };

  const saveParentNote = async (sessionId: string, note: string) => {
    const trimmed = note.trim() || null;
    await supabase.from("child_sessions").update({ parent_note: trimmed }).eq("id", sessionId);
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, parent_note: trimmed } : s));
    if (selectedSession?.id === sessionId) setSelectedSession({ ...selectedSession, parent_note: trimmed });
  };

  const exportSessionPDF = (session: Session, analysis: Analysis | null) => {
    const lines: string[] = [
      `RAPPORT DE SESSION — ${displayName}`,
      `═══════════════════════════════════════`,
      `Date : ${formatDate(session.started_at)}`,
      `Durée : ${formatDuration(session.duration_seconds)}`,
      `Messages : ${session.message_count}`, ``,
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
        lines.push(`SCORES`, `───────`,
          `  🤝 Sociabilité : ${analysis.sociability_score}/100`,
          `  🔍 Curiosité : ${analysis.curiosity_score}/100`,
          `  ⚖️ Stabilité : ${analysis.emotional_stability_score}/100`, ``);
      }
      if (analysis.extracted_interests?.length) lines.push(`INTÉRÊTS`, `───────`, `  ${analysis.extracted_interests.join(", ")}`, ``);
      if (analysis.topics_detected?.length) lines.push(`SUJETS`, `───────`, `  ${analysis.topics_detected.join(", ")}`, ``);
      if (analysis.behavior_insights?.length) {
        lines.push(`OBSERVATIONS`, `───────`);
        analysis.behavior_insights.forEach(i => lines.push(`  • ${i}`));
        lines.push(``);
      }
      if (analysis.full_transcription) lines.push(`TRANSCRIPTION`, `───────`, analysis.full_transcription);
    }
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rapport-${displayName}-${new Date(session.started_at).toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ═══════════════════════════════════════════════════════════════
  // COMPUTED
  // ═══════════════════════════════════════════════════════════════

  const allInterests = useMemo(() => {
    const counts: Record<string, number> = {};
    analyses.forEach(a => { (a.extracted_interests || []).forEach(i => { counts[i] = (counts[i] || 0) + 1; }); });
    return Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 12);
  }, [analyses]);

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

  const groupedSessions = useMemo(() => {
    const groups: { day: string; sessions: Session[] }[] = [];
    for (const session of filteredSessions) {
      const dayKey = new Date(session.started_at).toDateString();
      const existing = groups.find(g => g.day === dayKey);
      if (existing) existing.sessions.push(session);
      else groups.push({ day: dayKey, sessions: [session] });
    }
    return groups;
  }, [filteredSessions]);

  // ═══════════════════════════════════════════════════════════════
  // RETURN
  // ═══════════════════════════════════════════════════════════════

  return {
    user, sessions, analyses, loading, displayName,
    selectedSession, setSelectedSession, selectedAnalysis, setSelectedAnalysis,
    analyzing, sessionMessages, setSessionMessages,
    settings, settingsSaved, reglagesSection, setReglagesSection,
    updateSetting, updateNested, handleSave,
    pendingNameChange, setPendingNameChange,
    safetyAlerts, showSafetyAlerts, setShowSafetyAlerts, clearSafetyAlerts,
    tagFilter, setTagFilter, sessionSearch, setSessionSearch,
    sessionFavFilter, setSessionFavFilter,
    parentAlerts, unreadAlertCount, markAlertRead, markAllRead,
    cloudProfile, cloudLoading, cloudCopied, setCloudCopied,
    handleCloudSave, handleCloudDelete,
    confirmDialog, setConfirmDialog,
    allInterests, groupedSessions,
    loadData, loadAlerts, analyzeSession,
    deleteSession, toggleFavorite, saveParentNote, exportSessionPDF,
  };
}
